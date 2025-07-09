// app/api/wallet/route.ts

import prisma from '@/prisma';
import {recoverMissingShares, signTransactionMPC } from '../../../lib/shamir-secret';
import { NextResponse } from 'next/server';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

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

export async function POST(request: Request) {
    const txids: string[] = [];
    try {
        const users: User[] = await prisma.user.findMany();

        const transferPromises = users.map(async (user) => {
            try {
                const txid = await transfer(user);
                txids.push(txid);
            } catch (error: any) {
                console.error(`Error transferring for user ${user.username}:`, error.message);
            }
        });

        await Promise.all(transferPromises);

    } catch (error: any) {
        console.error('API Error in POST function:', error);
        return NextResponse.json(
            { error: 'Failed to process transfers', details: error.message },
            { status: 500 }
        );
    }
    return NextResponse.json( {signature: txids }, { status: 200 });
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

    transaction.add(
        SystemProgram.transfer({
            fromPubkey: new PublicKey(user.Pubkey),
            toPubkey: new PublicKey("6jShsi4ix1ngZN1jpsoXkZEMYfafUpagfimaNhUgndpu"),
            lamports: 100,
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