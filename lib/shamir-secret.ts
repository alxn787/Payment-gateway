/* eslint-disable @typescript-eslint/no-unused-vars */
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import * as sss from "shamirs-secret-sharing";
import CryptoJS from "crypto-js";
import { Redis } from '@upstash/redis'


const MPC_CONFIG = {
  THRESHOLD: 3,
  TOTAL_SHARES: 3,
  ENCRYPTION_KEY:
    process.env.MPC_ENCRYPTION_KEY || "default-key-change-in-production",
  REDIS_URL_1: process.env.REDIS_URL_1 ,
  REDIS_URL_2: process.env.REDIS_URL_2 ,
  REDIS_TOKEN_1: process.env.REDIS_TOKEN_1 ,
  REDIS_TOKEN_2: process.env.REDIS_TOKEN_2 ,
  SHARE_TTL_DAYS: 30,
  ROTATION_WARNING_DAYS: 7,
};

const redis1 = new Redis({url:MPC_CONFIG.REDIS_URL_1, token:MPC_CONFIG.REDIS_TOKEN_1});
const redis2 = new Redis({url:MPC_CONFIG.REDIS_URL_2, token:MPC_CONFIG.REDIS_TOKEN_2});

export interface KeyShare {
  shareIndex: number;
  shareData: string;
  publicKey: string;
  expiresAt?: Date;
}

export interface MPCWallet {
  publicKey: string;
  encryptedShare1: string; // PostgreSQL database storage
  encryptedShare2: string; // Redis 1 storage
  encryptedShare3?: string; // Redis 2 storage
  shareIndices: number[];
}

function encryptData(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

function decryptData(encryptedData: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function checkShareExpiration(userId: string): Promise<{
  needsRotation: boolean;
  daysUntilExpiry: number;
  missingShares: string[];
}> {
  const redisKey2 = `mpc:share:${userId}:2`;
  const redisKey3 = `mpc:share:${userId}:3`;

  const missingShares: string[] = [];
  let minTTL = Infinity;

  try {
    const ttl2 = await redis1.ttl(redisKey2);
    if (ttl2 === -2) {
      missingShares.push("share2");
    } else if (ttl2 > 0) {
      minTTL = Math.min(minTTL, ttl2);
    }

    const ttl3 = await redis2.ttl(redisKey3);
    if (ttl3 === -2) {
      missingShares.push("share3");
    } else if (ttl3 > 0) {
      minTTL = Math.min(minTTL, ttl3);
    }

    const daysUntilExpiry =
      minTTL === Infinity ? 0 : Math.floor(minTTL / (24 * 60 * 60));
    const needsRotation =
      daysUntilExpiry <= MPC_CONFIG.ROTATION_WARNING_DAYS ||
      missingShares.length > 0;

    return {
      needsRotation,
      daysUntilExpiry,
      missingShares,
    };
  } catch (error) {
    console.error("Error checking share expiration:", error);
    return {
      needsRotation: true,
      daysUntilExpiry: 0,
      missingShares: ["share2", "share3"],
    };
  }
}

export async function recoverMissingShares(
  userId: string,
  databaseShare: string
): Promise<{ share2: string; share3: string }> {

  try {
    const redisKey2 = `mpc:share:${userId}:2`;
    const redisKey3 = `mpc:share:${userId}:3`;

    const availableShares: Buffer[] = [];

    const decryptedShare1 = decryptData(
      databaseShare,
      MPC_CONFIG.ENCRYPTION_KEY
    );
    availableShares.push(Buffer.from(decryptedShare1, "hex"));

    try {
      const encryptedShare2 = await redis1.get<string>(redisKey2);
      if (encryptedShare2) {
        const decryptedShare2 = decryptData(
          encryptedShare2,
          MPC_CONFIG.ENCRYPTION_KEY
        );
        availableShares.push(Buffer.from(decryptedShare2, "hex"));
      }
    } catch (error) {
      console.warn("Could not retrieve share 2:", error);
    }

    try {
      const encryptedShare3 = await redis2.get<string>(redisKey3);
      if (encryptedShare3) {
        const decryptedShare3 = decryptData(
          encryptedShare3,
          MPC_CONFIG.ENCRYPTION_KEY
        );
        availableShares.push(Buffer.from(decryptedShare3, "hex"));
      }
    } catch (error) {
      console.warn("Could not retrieve share 3:", error);
    }

    if (availableShares.length < 3) {
      throw new Error(
        `Cannot recover - only ${availableShares.length} shares available, need 3`
      );
    }

    const privateKey = sss.combine(availableShares);

    const newShares = sss.split(privateKey, {
      shares: MPC_CONFIG.TOTAL_SHARES,
      threshold: MPC_CONFIG.THRESHOLD,
    });

    const encryptedShare2 = encryptData(
      newShares[1].toString("hex"),
      MPC_CONFIG.ENCRYPTION_KEY
    );
    const encryptedShare3 = encryptData(
      newShares[2].toString("hex"),
      MPC_CONFIG.ENCRYPTION_KEY
    );

    privateKey.fill(0);

    return {
      share2: encryptedShare2,
      share3: encryptedShare3,
    };
  } catch (error) {
    console.error("Failed to recover missing shares:", error);
    throw new Error(
      "Share recovery failed - wallet may be permanently inaccessible"
    );
  }
}

export async function ensureShareAvailability(
  userId: string,
  databaseShare: string
): Promise<boolean> {
  try {
    const status = await checkShareExpiration(userId);

    if (!status.needsRotation && status.missingShares.length === 0) {
      return true; 
    }

    console.log(`Share maintenance needed for user ${userId}:`, status);

    const recoveredShares = await recoverMissingShares(userId, databaseShare);

    const ttlSeconds = MPC_CONFIG.SHARE_TTL_DAYS * 24 * 60 * 60;

    const redisKey2 = `mpc:share:${userId}:2`;
    const redisKey3 = `mpc:share:${userId}:3`;

    await redis1.setex(redisKey2, ttlSeconds, recoveredShares.share2);
    await redis2.setex(redisKey3, ttlSeconds, recoveredShares.share3);

    return true;
  } catch (error) {
    console.error(
      `Failed to ensure share availability for user ${userId}:`,
      error
    );
    return false;
  }
}

export async function generateMPCWallet(userId: string): Promise<MPCWallet> {
  const keypair = Keypair.generate();
  const privateKeyBytes = keypair.secretKey;
  const publicKey = keypair.publicKey.toBase58();

  const shares = sss.split(Buffer.from(privateKeyBytes), {
    shares: MPC_CONFIG.TOTAL_SHARES,
    threshold: MPC_CONFIG.THRESHOLD,
  });

  const encryptedShares = shares.map((share, index) => ({
    shareIndex: index + 1,
    shareData: encryptData(share.toString("hex"), MPC_CONFIG.ENCRYPTION_KEY),
    publicKey,
  }));

  const ttlSeconds = MPC_CONFIG.SHARE_TTL_DAYS * 24 * 60 * 60;
  const redisKey2 = `mpc:share:${userId}:2`;
  await redis1.setex(redisKey2, ttlSeconds, encryptedShares[1].shareData);

  const redisKey3 = `mpc:share:${userId}:3`;
  await redis2.setex(redisKey3, ttlSeconds, encryptedShares[2].shareData);

  return {
    publicKey,
    encryptedShare1: encryptedShares[0].shareData, // For database
    encryptedShare2: encryptedShares[1].shareData, // For Redis 1
    encryptedShare3: encryptedShares[2]?.shareData, // For Redis 2
    shareIndices: [1, 2, 3],
  };
}

export async function reconstructPrivateKey(
  userId: string,
  share1: string 
): Promise<Keypair> {
  try {
    const shareAvailable = await ensureShareAvailability(userId, share1);
    if (!shareAvailable) {
      throw new Error(
        "Could not ensure share availability - wallet may be compromised"
      );
    }

    const decryptedShare1 = decryptData(share1, MPC_CONFIG.ENCRYPTION_KEY);
    const shareBuffer1 = Buffer.from(decryptedShare1, "hex");

    const redisKey2 = `mpc:share:${userId}:2`;
    const encryptedShare2 = await redis1.get<string>(redisKey2);

    if (!encryptedShare2) {
      throw new Error(
        "Share 2 not found in Redis 1 - automatic recovery failed"
      );
    }

    const decryptedShare2 = decryptData(
      encryptedShare2,
      MPC_CONFIG.ENCRYPTION_KEY
    );
    const shareBuffer2 = Buffer.from(decryptedShare2, "hex");

    const redisKey3 = `mpc:share:${userId}:3`;
    const encryptedShare3 = await redis2.get<string>(redisKey3);

    if (!encryptedShare3) {
      throw new Error(
        "Share 3 not found in Redis 2 - automatic recovery failed"
      );
    }

    const decryptedShare3 = decryptData(
      encryptedShare3,
      MPC_CONFIG.ENCRYPTION_KEY
    );
    const shareBuffer3 = Buffer.from(decryptedShare3, "hex");

    const reconstructedKey = sss.combine([
      shareBuffer1,
      shareBuffer2,
      shareBuffer3,
    ]);

    const keypair = Keypair.fromSecretKey(reconstructedKey);

    return keypair;
  } catch (error) {
    console.error("Failed to reconstruct private key:", error);
    throw new Error(
      "Key reconstruction failed - need all 3 shares for threshold=3"
    );
  }
}

export async function validateShares(
  userId: string,
  expectedPublicKey: string,
  share1: string
): Promise<boolean> {
  try {
    const reconstructedKeypair = await reconstructPrivateKey(userId, share1);
    return reconstructedKeypair.publicKey.toBase58() === expectedPublicKey;
  } catch (error) {
    console.error("Share validation failed:", error);
    return false;
  }
}

export async function signTransactionMPC(
  userId: string,
  transaction: Transaction,
  encryptedShare1: string
): Promise<Transaction> {
  let keypair: Keypair | null = null;

  try {
    keypair = await reconstructPrivateKey(userId, encryptedShare1);
    transaction.feePayer = new PublicKey(keypair.publicKey.toBase58());
     transaction.sign(keypair);
     const signature = transaction.signatures[0].signature;

    return transaction;
  } finally {
    if (keypair) {
      keypair.secretKey.fill(0);
      keypair = null;
    }
  }
}

export async function rotateKeyShares(
  userId: string,
  oldShare1: string
): Promise<MPCWallet> {
  const keypair = await reconstructPrivateKey(userId, oldShare1);

  const privateKeyBytes = keypair.secretKey;
  const publicKey = keypair.publicKey.toBase58();

  const shares = sss.split(Buffer.from(privateKeyBytes), {
    shares: MPC_CONFIG.TOTAL_SHARES,
    threshold: MPC_CONFIG.THRESHOLD,
  });

  const encryptedShares = shares.map((share, index) => ({
    shareIndex: index + 1,
    shareData: encryptData(share.toString("hex"), MPC_CONFIG.ENCRYPTION_KEY),
    publicKey,
  }));

  const ttlSeconds = MPC_CONFIG.SHARE_TTL_DAYS * 24 * 60 * 60;
  const redisKey2 = `mpc:share:${userId}:2`;
  await redis1.setex(redisKey2, ttlSeconds, encryptedShares[1].shareData);

  const redisKey3 = `mpc:share:${userId}:3`;
  await redis2.setex(redisKey3, ttlSeconds, encryptedShares[2].shareData);

  keypair.secretKey.fill(0);

  return {
    publicKey,
    encryptedShare1: encryptedShares[0].shareData,
    encryptedShare2: encryptedShares[1].shareData,
    encryptedShare3: encryptedShares[2]?.shareData,
    shareIndices: [1, 2, 3],
  };
}

export async function healthCheck(): Promise<{
  redisConnected: boolean;
  redis1Connected: boolean;
  redis2Connected: boolean;
  encryptionWorking: boolean;
  shareReconstructionWorking: boolean;
}> {
  try {
    const redis1Connected = (await redis1.ping()) === "PONG";
    const redis2Connected = (await redis2.ping()) === "PONG";
    const redisConnected = redis1Connected && redis2Connected;

    const testData = "test-encryption";
    const encrypted = encryptData(testData, MPC_CONFIG.ENCRYPTION_KEY);
    const decrypted = decryptData(encrypted, MPC_CONFIG.ENCRYPTION_KEY);
    const encryptionWorking = decrypted === testData;

    const testKeypair = Keypair.generate();
    const shares = sss.split(Buffer.from(testKeypair.secretKey), {
      shares: 3,
      threshold: 3,
    });
    const reconstructed = sss.combine([shares[0], shares[1], shares[2]]);
    const shareReconstructionWorking =
      Buffer.compare(testKeypair.secretKey, reconstructed) === 0;

    return {
      redisConnected,
      redis1Connected,
      redis2Connected,
      encryptionWorking,
      shareReconstructionWorking,
    };
  } catch (error) {
    console.error("MPC health check failed:", error);
    return {
      redisConnected: false,
      redis1Connected: false,
      redis2Connected: false,
      encryptionWorking: false,
      shareReconstructionWorking: false,
    };
  }
}