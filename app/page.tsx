
'use client'

import React, { useEffect, useState } from 'react';
import { Search, Filter, Grid, List } from 'lucide-react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

type Inventory = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
}

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [inventory, setInventory] = useState<Inventory[]>([]);

  useEffect(() => {
    getInventory();
  }, []);

  async function getInventory() {

    const response = await axios.get('/api/inventory/')
    const inventory: Inventory[] = response.data.data;
    setInventory(inventory);
    console.log(inventory);
  }

  // Filter and sort products


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Navbar isSignedIn={true} userName="SolanaUser" />
      
      {/* Hero Section */}
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

      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-600/30 text-white placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-gray-800/50 border-gray-600/30 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600/30">
                <SelectItem value="name" className="text-white hover:bg-gray-700/30">Name</SelectItem>
                <SelectItem value="price-low" className="text-white hover:bg-gray-700/30">Price: Low to High</SelectItem>
                <SelectItem value="price-high" className="text-white hover:bg-gray-700/30">Price: High to Low</SelectItem>
                <SelectItem value="stock" className="text-white hover:bg-gray-700/30">Stock</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border border-gray-600/30 rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-gray-700' : 'text-gray-400 hover:bg-gray-800/30'}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-gray-700' : 'text-gray-400 hover:bg-gray-800/30'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Featured Products</h2>
          <p className="text-gray-400">Discover our premium gaming equipment collection</p>
        </div>

        {/* Product Grid */}
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
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

      {/* Footer */}
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


// export default function Home() {

//   const session = useSession();

//   return (
//     <div>
//       {session?.data?.user ? (
//         <div>
//           <h1>Hello {session.data.user.name}!</h1>
//           <button onClick={()=>signOut()}>Signout</button>
//         </div>
//       ):<button onClick={()=>signIn()}>Signin</button>}
//     </div>
//   )
// }
