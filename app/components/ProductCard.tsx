"use client";

import { ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import axios from 'axios';
import { useState, useCallback } from 'react';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useSession } from 'next-auth/react';
import { useWallet } from '@solana/wallet-adapter-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [isBuying, setIsBuying] = useState(false);
  const session = useSession();
  const wallet = useWallet();
  

  const handleBuy = useCallback(async (productPrice: number) => {
    setIsBuying(true);
    try {
      if(!wallet.connected){
        alert("Please connect your wallet");
        return;
      }
      const connection = new Connection("https://api.devnet.solana.com")
      const blockhash = await connection.getLatestBlockhash();
      // const tx = new Transaction().add(
      //   SystemProgram.transfer({
      //     fromPubkey:wallet.publicKey,
      //     toPubkey: new PublicKey(session.data?.user.pubKey),
      //     lamports:productPrice*1000000
      //   })
      // )
    } catch (error) {
      console.error('Error buying product:', error);
    } finally {
      setIsBuying(false);
    }
  }, [product.id]);

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800/30 hover:border-gray-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 overflow-hidden">
      <div className="aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>

      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span className="text-sm text-gray-400">(50 reviews)</span>
        </div>

        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
            ${product.price.toFixed(5)}
          </span>
          <span className="text-sm text-gray-400">
            Stock: {product.stock}
          </span>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-medium cursor-pointer"
          onClick={()=>handleBuy(product.price)}
          disabled={product.stock === 0 || isBuying}
        >
          {isBuying ? (
            'Processing...'
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {product.stock === 0 ? 'Out of Stock' : 'Buy Now'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;