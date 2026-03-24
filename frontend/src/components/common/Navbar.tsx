import { Link, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from '../wallet/ConnectButton';
import { NotificationBell } from '../notification';
import {
  Home,
  User,
  Users,
  HeartHandshake,
  Building2,
  Gift,
  BookOpen,
  Map,
  ScrollText,
  Landmark,
  Palette,
  Medal,
  Network,
  Menu,
  X,
  Languages,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../i18n';
import { isJourneyBetaEnabled } from '../../features/journey/runtime';
import { isCouncilBetaEnabled } from '../../features/council/runtime';
import {
  isMemoryWorldBetaEnabled,
  isMemoryWorldOwnerEntryEnabled,
} from '../../features/memory-palace-builder/runtime';
import { isCreatorBetaEnabled } from '../../features/creator/runtime';
import { isRelationshipGraphBetaEnabled } from '../../features/relationship-graph/runtime';

export function Navbar() {
  const { locale, setLocale, tr, t } = useI18n();
  const location = useLocation();
  const { isConnected } = useAccount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const journeyBetaEnabled = isJourneyBetaEnabled();
  const councilBetaEnabled = isCouncilBetaEnabled();
  const memoryWorldBetaEnabled = isMemoryWorldBetaEnabled();
  const memoryWorldOwnerEntryEnabled = isMemoryWorldOwnerEntryEnabled();
  const creatorBetaEnabled = isCreatorBetaEnabled();
  const relationshipGraphBetaEnabled = isRelationshipGraphBetaEnabled();
  
  const navLinks = [
    { path: '/', label: tr('首页', 'Home'), icon: Home },
    { path: '/my-frog', label: tr('青蛙', 'Frog'), icon: User },
    { path: '/friends', label: tr('好友', 'Friends'), icon: Users },
    { path: '/families', label: tr('家族', 'Families'), icon: HeartHandshake },
    { path: '/communities', label: tr('社区', 'Communities'), icon: Building2 },
    { path: '/souvenirs', label: tr('纪念品', 'Souvenirs'), icon: Gift },
    { path: '/travel-history', label: tr('旅行日记', 'Journal'), icon: BookOpen },
    ...(journeyBetaEnabled
      ? [{ path: '/journeys', label: tr('剧情远征', 'Journeys'), icon: Map }]
      : []),
    ...(councilBetaEnabled
      ? [{ path: '/council', label: tr('青蛙议会', 'Council'), icon: ScrollText }]
      : []),
    ...(memoryWorldBetaEnabled && memoryWorldOwnerEntryEnabled
      ? [{ path: '/memory-world', label: tr('记忆世界', 'Memory World'), icon: Landmark }]
      : []),
    ...(creatorBetaEnabled
      ? [{ path: '/creator', label: tr('创作者工坊', 'Creator Lab'), icon: Palette }]
      : []),
    ...(relationshipGraphBetaEnabled
      ? [{ path: '/relationship-graph', label: tr('关系图谱', 'Relationship Graph'), icon: Network }]
      : []),
    { path: '/badges', label: tr('徽章', 'Badges'), icon: Medal },
  ];

  const toggleLocale = () => {
    setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN');
  };
  
  return (
    <nav className="sticky top-0 z-50 transition-all duration-300">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm" />
      
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
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
                <span>{t('navbar.walletConnected')}</span>
              </div>
            )}
            
            {/* 🔔 通知铃铛 */}
            {isConnected && <NotificationBell />}

            <button
              type="button"
              onClick={toggleLocale}
              aria-label={t('locale.switchLabel')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white/70 text-gray-600 hover:text-green-700 hover:border-green-200 transition-colors"
            >
              <Languages size={16} />
              <span className="text-xs font-semibold">
                {locale === 'zh-CN' ? t('locale.zh-CN') : t('locale.en-US')}
              </span>
            </button>
            
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
              <button
                type="button"
                onClick={toggleLocale}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Languages size={20} strokeWidth={2} />
                <span>{locale === 'zh-CN' ? t('locale.zh-CN') : t('locale.en-US')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
