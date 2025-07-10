import { useState, useEffect } from 'react';
import { ShoppingCart, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signIn, signOut, useSession } from 'next-auth/react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface NavbarProps {
  isSignedIn?: boolean;
  userName?: string;
}

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const session = useSession();
    const image  = session?.data?.user?.image || "https://imgs.search.brave.com/B1aaBgz_pXUkBvbO88vfuUOU0_ZwfLeMlQuyPZ9tzR8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvYmFj/ay12aWV3LWdva3Ut/dWx0cmEtaW5zdGlu/Y3QtdTE2ZHBqM3k2/Mmd1eTJwcy5qcGc";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={` sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? 'backdrop-blur-md bg-opacity-80' : 'bg-gradient-to-r from-gray-900 via-black to-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src={image} alt="user" className="h-8 w-8 rounded-full" /><span className='text-zinc-300'>{session?.data?.user?.name}</span>
            </div>
          </div>

          {/* Center - Store Name */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent">
              SolanaStore
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <Button size="sm" className="text-white hover:bg-gray-800/30 cursor-pointer">
              <ShoppingCart className="h-5 w-5" />
            </Button>
            
            {session.data?.user ? (
              <div>
                
                <Button
                onClick={()=>signOut()}
                size="sm" className="border border-gray-400 text-gray-300 bg-neutral-900 cursor-pointer mr-2.5">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <WalletMultiButton />
              </div>
            ) : (
              <Button
               onClick={()=>signIn()}
                size="sm" className="border border-gray-400 text-gray-300 bg-neutral-900 cursor-pointer">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;