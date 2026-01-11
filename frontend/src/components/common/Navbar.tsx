import { Link, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from '../wallet/ConnectButton';

export function Navbar() {
  const location = useLocation();
  const { isConnected } = useAccount();
  
  const navLinks = [
    { path: '/', label: '首页' },
    { path: '/my-frog', label: '青蛙' },
    { path: '/garden', label: '家园' },
    { path: '/souvenirs', label: '纪念品' },
    { path: '/travel-history', label: '旅行日记' },
    { path: '/badges', label: '徽章' },
    // 好友系统改为浮窗入口，隐藏导航链接
  ];
  
  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-3xl">🐸</span>
            <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ZetaFrog
            </span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-green-600'
                    : 'text-gray-600 hover:text-green-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          {/* Wallet */}
          <div className="flex items-center gap-4">
            {isConnected && (
              <span className="hidden sm:inline text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                ✓ 已连接
              </span>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
