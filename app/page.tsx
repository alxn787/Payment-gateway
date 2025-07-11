
'use client'
import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import axios from 'axios';

type Inventory = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
}

const Home = () => {
    const [inventory, setInventory] = useState<Inventory[]>([]);

  useEffect(() => {
    getInventory();
  }, []);

  async function getInventory() {

    const response = await axios.get('/api/inventory/')
    const inventory: Inventory[] = response.data.data;
    setInventory(inventory);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Navbar />

      <div className="bg-gradient-to-r from-gray-800/20 to-gray-900/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
              SolanaStore
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Premium Gaming Equipment Powered by Solana
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Featured Products</h2>
          <p className="text-gray-400">Discover our premium gaming equipment collection</p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ">
          {inventory.map((product: Inventory) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">No products found matching your search.</p>
          </div>
        )}
      </div>

      <footer className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-gray-800/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 SolanaStore. Powered by Solana blockchain technology.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
