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

    const SOLANA_DEVNET_RPC_URL = "https://api.devnet.solana.com";

export async function POST(Request: Request) {

    const content = await Request.json();
    const tx = content[0];
    if (tx.meta.err == null) {
        throw new Error("Transaction didnt go through");
    }   

    if (!process.env.HOTWALLET_PUBKEY) {
        console.error('Environment variable HOTWALLET_PUBKEY is not set.');
        return NextResponse.json(
            { error: 'Server configuration error: Hot wallet public key is not defined.' },
            { status: 500 }
        );
    }
    try{
        const recipient = tx.transaction.message.accountKeys[1];
        console.log("Recipient of SOL transfer:", recipient);

        const postBalance = tx.meta.postBalances[1];
        const fee = tx.meta.fee;
        console.log("Post balance of SOL transfer:", postBalance);
        console.log("Fee of SOL transfer:", fee);

    return NextResponse.json(
        { message: 'Webhook payload processed' },
        { status: 200 }
    );

    }catch(error){
        console.error("Error processing Helius webhook:", error);
        return NextResponse.json(
            { error: 'Failed to process webhook payload', details: error || 'An unknown error occurred' },
            { status: 500 }
        );
    }


}

async function transfer(user: User): Promise<string> {
    const userId = user.username;
    console.log(`Processing transfer for user: ${userId}`);

    const databaseShare = await prisma.user.findFirst({
        where: {
            id: user.id,
        },
        select:{
            partialKey: true,
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

    if(databaseShare.partialKey == null){
        throw new Error("Database share not found");
    }

    const signedTransaction = await signTransactionMPC(userId, transaction, databaseShare.partialKey);
    console.log('Transaction signed by MPC wallet.');

    const serializedTransaction = signedTransaction.serialize();

    const txid = await connection.sendRawTransaction(serializedTransaction, {
        skipPreflight: false,
    });

    console.log(`Transaction ID for ${userId}: ${txid}`);
    return txid;
}