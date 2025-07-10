/* eslint-disable  */
import prisma from '@/prisma';
import { signTransactionMPC } from '../../../lib/shamir-secret';
import { NextResponse } from 'next/server';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

type User = {
    id: string;
    name: string | null;
    Pubkey: string;
    username: string;
    subId: string;
    ProfilePicture: string | null;
}

type PartialKey = {
    key: string;
}

const SOLANA_DEVNET_RPC_URL = "https://api.devnet.solana.com";

interface HeliusWebhookPayload {
    events: Array<{
        type: string;
        timestamp: number;
        webhookId: string;
        accountAddresses: string[];
        transaction: {
            signatures: string[];
            message: any;
            meta: {
                err: any | null;
                fee: number;
                logMessages: string[];
                preBalances: number[];
                postBalances: number[];
            };
        };
    }>;
}

export async function POST(Request: Request) {
    let webhookPayload: HeliusWebhookPayload;
    const processedSignatures: string[] = [];

    try {
        webhookPayload = await Request.json();
        console.log('Received Helius Webhook Payload:', JSON.stringify(webhookPayload, null, 2));

        if (!webhookPayload || !Array.isArray(webhookPayload.events)) {
            return NextResponse.json(
                { error: 'Invalid Helius webhook payload structure.' },
                { status: 400 }
            );
        }

        if (!process.env.HOTWALLET_PUBKEY) {
            console.error('Environment variable HOTWALLET_PUBKEY is not set.');
            return NextResponse.json(
                { error: 'Server configuration error: Hot wallet public key is not defined.' },
                { status: 500 }
            );
        }

        for (const event of webhookPayload.events) {
            if (event.type !== 'transaction') {
                console.log(`Skipping non-transaction event type: ${event.type}`);
                continue;
            }

            if (event.transaction.meta && event.transaction.meta.err) {
                console.log(`Skipping failed transaction: ${event.transaction.signatures[0]} - Error: ${JSON.stringify(event.transaction.meta.err)}`);
                continue;
            }

            const pubkeyToTransferFrom = event.accountAddresses[0];

            if (!pubkeyToTransferFrom) {
                console.warn('Webhook event missing accountAddresses. Skipping.');
                continue;
            }

            console.log(`Attempting to process transaction for public key: ${pubkeyToTransferFrom}`);

            const user = await prisma.user.findFirst({
               where: {
                Pubkey: pubkeyToTransferFrom
               }
            });

            if (!user) {
                console.warn(`User with public key ${pubkeyToTransferFrom} not found in database. Skipping transfer.`);
                continue;
            }

            try {
                const txid = await transfer(user);
                processedSignatures.push(txid);
                console.log(`Successfully initiated sweep for ${pubkeyToTransferFrom}. TxID: ${txid}`);
            } catch (transferError: any) {
                console.error(`Failed to initiate transfer for ${pubkeyToTransferFrom}: ${transferError.message}`);
            }
        }

    } catch (error: any) {
        console.error('Error processing Helius webhook:', error);
        return NextResponse.json(
            { error: 'Failed to process webhook payload', details: error.message || 'An unknown error occurred' },
            { status: 500 }
        );
    }

    return NextResponse.json(
        { message: 'Webhook payload processed', signatures: processedSignatures },
        { status: 200 }
    );
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
        throw new Error(`User ${userId} does not have a partial key in the database. Cannot perform transfer.`);
    }

    const connection = new Connection(SOLANA_DEVNET_RPC_URL);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transaction = new Transaction
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = new PublicKey(user.Pubkey);

    if (!user.Pubkey) {
        throw new Error(`User ${userId} does not have a public key defined. Cannot proceed with transfer.`);
    }

    const fromPubkey = new PublicKey(user.Pubkey);
    const toPubkey = new PublicKey(process.env.HOTWALLET_PUBKEY as string);

    const currentBalanceLamports = await connection.getBalance(fromPubkey);
    console.log(`Current balance for ${user.Pubkey}: ${currentBalanceLamports / LAMPORTS_PER_SOL} SOL`);

    const dummyTransaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromPubkey,
            toPubkey: toPubkey,
            lamports: 1
        })
    );
    const feeEstimate = await connection.getFeeForMessage(dummyTransaction.compileMessage());
    const estimatedFeeLamports = feeEstimate.value || 5000;

    console.log(`Estimated transaction fee: ${estimatedFeeLamports} lamports`);

    const amountToTransferLamports = currentBalanceLamports - estimatedFeeLamports;

    if (amountToTransferLamports <= 0) {
        throw new Error(`Insufficient funds in ${user.Pubkey} to cover transfer and fees. Balance: ${currentBalanceLamports / LAMPORTS_PER_SOL} SOL, Estimated Fee: ${estimatedFeeLamports / LAMPORTS_PER_SOL} SOL. No sweep performed.`);
    }

    console.log(`Transferring ${amountToTransferLamports / LAMPORTS_PER_SOL} SOL from ${user.Pubkey} to ${process.env.HOTWALLET_PUBKEY}`);

    transaction.add(
        SystemProgram.transfer({
            fromPubkey: fromPubkey,
            toPubkey: toPubkey,
            lamports: amountToTransferLamports,
        })
    );

    const signedTransaction = await signTransactionMPC(userId, transaction, databaseShare.key);
    console.log('Transaction signed by MPC wallet.');

    const serializedTransaction = signedTransaction.serialize();

    const txid = await connection.sendRawTransaction(serializedTransaction, {
        skipPreflight: false,
    });

    console.log(`Transaction ID for ${userId}: ${txid}`);
    return txid;
}