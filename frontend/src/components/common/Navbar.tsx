import { Link, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from '../wallet/ConnectButton';
import { NotificationBell } from '../notification';
import { Home, User, Warehouse, Gift, BookOpen, Medal, Gamepad2, Menu, X, Wallet } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const location = useLocation();
  const { isConnected } = useAccount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navLinks = [
    { path: '/', label: '首页', icon: Home },
    { path: '/my-frog', label: '青蛙', icon: User },
    { path: '/garden', label: '家园', icon: Warehouse },
    { path: '/souvenirs', label: '纪念品', icon: Gift },
    { path: '/travel-history', label: '旅行日记', icon: BookOpen },
    { path: '/badges', label: '徽章', icon: Medal },
  ];
  
  return (
    <nav className="sticky top-0 z-50 transition-all duration-300">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm" />
      
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16"> // Desktop Height
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center bg-green-100/50 rounded-xl group-hover:bg-green-100 transition-colors">
              <span className="text-xl group-hover:scale-110 transition-transform duration-300">🐸</span>
            </div>
            <span className="text-xl font-bold font-orbitron bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent tracking-wide">
              ZetaFrog
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 bg-white/50 p-1 rounded-full border border-white/40 shadow-sm">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-green-700 bg-white shadow-sm'
                      : 'text-gray-600 hover:text-green-600 hover:bg-white/60'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-3">
             {/* Wallet Status Indicator (Subtle) */}
            {isConnected && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-green-50/80 border border-green-100 rounded-full text-xs font-medium text-green-700">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span>已连接</span>
              </div>
            )}
            
            {/* 🔔 通知铃铛 */}
            {isConnected && <NotificationBell />}
            
            <ConnectButton />
            
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/90 backdrop-blur-lg border-b border-gray-100 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} strokeWidth={2} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
