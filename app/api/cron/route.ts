import prisma from '@/prisma';
import { signTransactionMPC } from '../../../lib/shamir-secret';
import { NextResponse } from 'next/server';
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

type User = {
    id: string;
    name: string | null;
    Pubkey: string;
    username: string;
    subId: string;
    ProfilePicture: string | null;
}

type Balance = {
    userId: string;
    username: string;
    pubKey: string;
    solBalance: number | null;
}

type PartialKey = {
    key: string;
}

export async function POST(Request: Request) {
    const { cronsecret } = await Request.json();
    if (cronsecret !== process.env.CRON_SECRET) {
        return new Response("Unauthorized", {
            status: 401,
            headers: {
                "Content-Type": "text/plain",
            },
        });
    }
    const txids: string[] = [];
    const balances: Balance[] = [];

    try {
        const users: User[] = await prisma.user.findMany();

        const balancePromises = users.map(async (user) => {
            try {
                if (!user.Pubkey) {
                    console.warn(`User ${user.username} (ID: ${user.id}) does not have a public key.`);
                    balances.push({
                        userId: user.id,
                        username: user.username,
                        pubKey: user.Pubkey || 'N/A',
                        solBalance: null
                    });
                    return;
                }

                const publicKey = new PublicKey(user.Pubkey);
                const connection = new Connection("https://api.devnet.solana.com");
                const balanceLamports = await connection.getBalance(publicKey);
                const solBalance = balanceLamports / LAMPORTS_PER_SOL;

                balances.push({
                    userId: user.id,
                    username: user.username,
                    pubKey: user.Pubkey,
                    solBalance: solBalance
                });
            } catch (error) {
                console.error(`Error getting balance for user ${user.username} (Pubkey: ${user.Pubkey}):`, error);
                balances.push({
                    userId: user.id,
                    username: user.username,
                    pubKey: user.Pubkey || 'N/A',
                    solBalance: null
                });
            }
        });

        await Promise.all(balancePromises);

        const userBalanceMap = new Map<string, number | null>();
        balances.forEach(balance => {
            userBalanceMap.set(balance.userId, balance.solBalance);
        });

        const eligibleUsersForTransfer = users.filter(user => {
            const balance = userBalanceMap.get(user.id);
            if (typeof balance === 'number' && balance > 0.0001) {
                return true;
            } else {
                console.log(`Skipping transfer for user ${user.username} (ID: ${user.id}) due to insufficient balance (${balance} SOL).`);
                return false;
            }
        });

        const transferPromises = eligibleUsersForTransfer.map(async (user) => {
            try {
                const txid = await transfer(user);
                txids.push(txid);
            } catch (error) {
                console.error(`Error transferring for user ${user.username}:`, error);
            }
        });

        await Promise.all(transferPromises);

    } catch (error) {
        console.error('API Error in POST function:', error);
        return NextResponse.json(
            { error: 'Failed to process transfers', details: error },
            { status: 500 }
        );
    }

    return NextResponse.json( {balances: balances, signature: txids }, { status: 200 });
}

async function transfer(user: User): Promise<string> {
    const userId = user.username;
    console.log(`Processing transfer for user: ${userId}`);

    const databaseShare: PartialKey | null = await prisma.partialKey.findFirst({
        where: {
            userId: user.id,
        },
        select:{
            key: true,
        }
    });

    if (!databaseShare) {
        throw new Error(`User ${userId} does not have a partial key in the database.`);
    }

    const connection = new Connection("https://api.devnet.solana.com");
    const transaction = new Transaction();
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.lastValidBlockHeight = blockhash.lastValidBlockHeight;

    if (!user.Pubkey) {
        throw new Error(`User ${userId} does not have a public key defined.`);
    }

        const amount  = await connection.getBalance(new PublicKey(user.Pubkey));
        const rent = await connection.getMinimumBalanceForRentExemption(0);
        console.log(amount);
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: new PublicKey(user.Pubkey),
            toPubkey: new PublicKey(process.env.HOTWALLET_PUBKEY as string),
            lamports: amount-1000000,
        })
    );

    const signedTransaction = await signTransactionMPC(userId, transaction, databaseShare.key);
    const serializedTransaction = signedTransaction.serialize();

    const txid = await connection.sendRawTransaction(serializedTransaction, {
        skipPreflight: true,
    });

    console.log(`Transaction ID for ${userId}: ${txid}`);
    return txid;
}
