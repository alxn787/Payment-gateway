/* eslint-disable  */
import prisma from '@/prisma';
import { signTransactionMPC } from '../../../lib/shamir-secret';
import { NextResponse } from 'next/server';
import { Connection, PublicKey, SystemProgram, Transaction} from '@solana/web3.js';


export async function POST(Request: Request) {
    
    const SOLANA_DEVNET_RPC_URL = "https://api.devnet.solana.com";
    const content = await Request.json();
    const tx = content[0];
    if (tx.meta.err != null) {
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

        const postBalance = tx.meta.postBalances[1];
        const databaseShare = await prisma.user.findFirst({
            where: {
                Pubkey: recipient
            },
            select:{
                partialKey: true,
                username:true,
                Pubkey: true,
            }
        });

        if(!databaseShare){
            return NextResponse.json(
            { message: 'payment going out of the wallet'},
            { status: 200 }
        );
    }

    const connection = new Connection(SOLANA_DEVNET_RPC_URL);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transaction = new Transaction
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = new PublicKey(recipient);

    const fromPubkey = new PublicKey(recipient);
    const toPubkey = new PublicKey(process.env.HOTWALLET_PUBKEY as string);

    const amountToTransferLamports = postBalance - 100000000;

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

    const signedTransaction = await signTransactionMPC(databaseShare.username, transaction, databaseShare.partialKey);

    const serializedTransaction = signedTransaction.serialize();

    const txid = await connection.sendRawTransaction(serializedTransaction, {
        skipPreflight: false,
    });

    return NextResponse.json(
        { message: 'Webhook payload processed', txid: txid },
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
