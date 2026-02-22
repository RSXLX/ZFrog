import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { FrogState } from '../types/frogAnimation';
import { ConnectButton } from '../components/wallet/ConnectButton';
import { AccountCard } from '../components/wallet/AccountCard';
import { FrogMint } from '../components/frog/FrogMint';
import { FrogPet } from '../components/frog/FrogPet';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFrogStore } from '../stores/frogStore';
import CrossChainTransfer from '../components/crosschain/CrossChainTransfer';
import { apiService } from '../services/api';
import { Palette, ScanSearch, BookOpen, Warehouse, Gift, Medal, Skull, Zap, Search } from 'lucide-react';

export function Home() {
  const { isConnected, address } = useAccount();
  const [hasFrogs, setHasFrogs] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const { setCurrentFrog, currentFrog } = useFrogStore();
  const [showMint, setShowMint] = useState(false);
  const [showCrossChainTransfer, setShowCrossChainTransfer] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('mint') === 'true') {
      setShowMint(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isConnected && address) {
      setCheckLoading(true);
      apiService.getMyFrog(address)
        .then(frog => {
          setHasFrogs(!!frog);
          if (frog && !currentFrog) {
            setCurrentFrog(frog);
          }
        })
        .catch(console.error)
        .finally(() => setCheckLoading(false));
    }
  }, [isConnected, address]);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className={isConnected ? "grid lg:grid-cols-12 gap-8" : "flex flex-col items-center"}>
        {/* Main Content Area */}
        <div className={isConnected ? "lg:col-span-8 xl:col-span-9" : "w-full max-w-4xl"}>
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16 relative"
          >
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-200/20 rounded-full blur-3xl -z-10" />
            
            <h1 className="text-6xl md:text-7xl font-bold font-orbitron mb-6 bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent drop-shadow-sm">
              ZetaFrog
            </h1>
            <p className="text-2xl md:text-3xl font-exo text-slate-700 mb-3 font-medium">
              Your Cross-Chain Desktop Companion
            </p>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
              Mint a frog, send it to explore blockchain wallets, and collect AI-generated travel stories from across the omnichain universe.
            </p>
          </motion.div>
      
          {/* Demo Frog Visualization */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="flex justify-center mb-16"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-green-400/10 rounded-full blur-2xl transform scale-110" />
              <FrogPet
                frogId={0}
                name="Demo Frog"
                initialState={FrogState.IDLE}
              />
            </div>
          </motion.div>
      
          {/* Content Switching Logic */}
          {!isConnected ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-6"
            >
              <p className="text-slate-600 text-lg font-medium">
                Connect your wallet to begin the adventure
              </p>
              <div className="transform hover:scale-105 transition-transform duration-200">
                <ConnectButton />
              </div>
            </motion.div>
          ) : checkLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Checking account status...</p>
            </div>
          ) : hasFrogs && !showMint ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Feature Grid */}
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <FeatureCard
                  icon={Palette}
                  title="Unique NFT"
                  description="Every travel generates a unique, evolving NFT souvenir."
                  color="text-purple-500"
                  bg="bg-purple-50"
                />
                <FeatureCard
                  icon={ScanSearch}
                  title="Wallet Scout"
                  description="Send your frog to inspect any wallet address on-chain."
                  color="text-blue-500"
                  bg="bg-blue-50"
                />
                <FeatureCard
                  icon={BookOpen}
                  title="AI Chronicles"
                  description="Receive immersive, AI-generated stories from every trip."
                  color="text-amber-500"
                  bg="bg-amber-50"
                />
              </div>
              
              {/* How it Works */}
              <div className="mt-20">
                <h2 className="text-3xl font-bold font-orbitron text-center text-slate-800 mb-12">
                  How to Play
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <StepCard step="01" title="Connect" icon={Zap} />
                  <StepCard step="02" title="Mint Frog" icon={Skull} />
                  <StepCard step="03" title="Travel" icon={Search} />
                  <StepCard step="04" title="Collect" icon={Gift} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
                <FrogMint
                  onSuccess={() => {
                    window.location.href = '/my-frog';
                  }}
                />
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Right Sidebar - Dashboard */}
        {isConnected && (
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 space-y-6">
              {/* Account Card */}
              <div className="hover:transform hover:-translate-y-1 transition-transform duration-300">
                <AccountCard />
              </div>
              
              {/* User Center Menu */}
              {hasFrogs && !showMint && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-white/50 ring-1 ring-slate-900/5"
                >
                  <h3 className="font-bold font-orbitron text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                    <Warehouse className="text-green-600" size={24} />
                    Command Center
                  </h3>
                  
                  <div className="space-y-3">
                    <Link
                      to="/my-frog"
                      className="group flex items-center gap-3 w-full p-4 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
                    >
                      <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                        <Skull size={20} />
                      </div>
                      <span>My Frog</span>
                    </Link>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to="/travel-history"
                        className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 rounded-xl transition-all hover:shadow-md group"
                      >
                        <BookOpen size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Journal</span>
                      </Link>
                      
                      <Link
                        to="/badges"
                        className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-purple-200 text-slate-600 hover:text-purple-600 rounded-xl transition-all hover:shadow-md group"
                      >
                        <Medal size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Badges</span>
                      </Link>
                    </div>

                    <Link
                      to="/souvenirs"
                      className="flex items-center gap-3 w-full p-4 bg-white border border-slate-200 hover:border-pink-200 hover:bg-pink-50 text-slate-700 hover:text-pink-600 rounded-xl font-medium transition-all hover:shadow-sm"
                    >
                      <Gift size={20} />
                      <span>Souvenirs</span>
                    </Link>

                    <Link
                      to="/friends?tab=rescue"
                      className="flex items-center gap-3 w-full p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 hover:border-red-200 text-red-700 rounded-xl font-medium transition-all hover:shadow-sm"
                    >
                      <div className="bg-white p-1.5 rounded-full shadow-sm">
                        <span className="text-lg">🆘</span>
                      </div>
                      <span>Friend Rescue</span>
                    </Link>
                    
                    <button
                      onClick={() => setShowCrossChainTransfer(true)}
                      className="flex items-center gap-3 w-full p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 hover:border-amber-200 text-amber-700 rounded-xl font-medium transition-all hover:shadow-sm"
                    >
                      <Zap size={20} />
                      <span>Cross-Chain</span>
                    </button>
                    
                    <div className="pt-4 mt-2 border-t border-slate-100">
                      <button
                        onClick={() => window.open('https://athens.explorer.zetachain.com/', '_blank')}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-medium text-slate-500 hover:text-green-600 bg-slate-50 hover:bg-white border border-transparent hover:border-green-200 rounded-lg transition-all"
                      >
                        <ScanSearch size={14} />
                        View on Explorer
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Cross-Chain Transfer Modal */}
      {currentFrog && (
        <CrossChainTransfer
          frogId={currentFrog.id}
          isOpen={showCrossChainTransfer}
          onClose={() => setShowCrossChainTransfer(false)}
        />
      )}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color, bg }: any) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:shadow-xl transition-all"
    >
      <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center mb-4`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <h3 className="font-bold text-lg text-slate-800 mb-2 font-orbitron">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

function StepCard({ step, title, icon: Icon }: any) {
  return (
    <div className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-green-100 transition-all text-center">
      <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-bold text-xs mb-4 mx-auto group-hover:bg-green-500 group-hover:text-white transition-colors">
        {step}
      </div>
      <div className="text-slate-400 group-hover:text-green-600 mb-3 transition-colors flex justify-center">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <p className="font-bold text-slate-700 group-hover:text-slate-900">{title}</p>
    </div>
  );
}
