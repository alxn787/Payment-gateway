// app/api/wallet/route.ts

import { generateMPCWallet } from '../../lib/shamir-secret'; // Adjust path as needed
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json(); // Get userId from the request body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const mpcWallet = await generateMPCWallet(userId);
    console.log(mpcWallet)

    // IMPORTANT: Do NOT send sensitive shares back to the client!
    // Only send the public key and any non-sensitive information.
    return NextResponse.json(mpcWallet, { status: 200 });

  } catch (error: any) {
    console.error('API Error generating MPC wallet:', error);
    return NextResponse.json(
      { error: 'Failed to generate MPC wallet', details: error.message },
      { status: 500 }
    );
  }
}

// You can add other HTTP methods (GET, PUT, DELETE) for other MPC operations
// e.g., GET to fetch public key, POST to sign a transaction