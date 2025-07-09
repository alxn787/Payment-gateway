// app/page.tsx
'use client'; // <-- IMPORTANT: Mark this as a Client Component

import React, { useState, useEffect } from 'react';
// Do NOT import generateMPCWallet directly from shamir-secret.ts here anymore!

export default function Home() {
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('test_user_id'); // TODO: Replace with actual user ID mechanism

  const handleCreateWallet = async () => {
    if (!userId) {
      setError("User ID is missing.");
      return;
    }

    setLoading(true);
    setError(null);
    setWalletPublicKey(null); // Clear previous state

    try {
      const response = await fetch('/api/wallet', { // Call your API route
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate wallet on server.');
      }

      const data = await response.json();
      setWalletPublicKey(data.publicKey);
      console.log(data.message); // Log success message from API

    } catch (err: any) {
      console.error("Client-side error calling API:", err);
      setError(`Error creating wallet: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Example: Generate wallet on initial load if not already present
  // useEffect(() => {
  //   // You might want to check a cookie or local storage if wallet already exists
  //   if (!walletPublicKey && userId) { // Only attempt if no public key and userId exists
  //      handleCreateWallet();
  //   }
  // }, [userId, walletPublicKey]); // Re-run if userId changes

  return (
    <div className="grid grid-rows-[20px_1fr_20px] (--font-geist-sans)">
      <h1>MPC Wallet Manager</h1>

      <p>Current User ID: {userId}</p> {/* For debugging, replace with actual */}

      {!walletPublicKey && (
        <button onClick={handleCreateWallet} disabled={loading}>
          {loading ? 'Creating Wallet...' : 'Create New MPC Wallet'}
        </button>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {walletPublicKey && (
        <div>
          <h2>Wallet Created!</h2>
          <p>Public Key: <code>{walletPublicKey}</code></p>
          <p>Your private key shares are stored securely on the backend.</p>
        </div>
      )}
    </div>
  );
}