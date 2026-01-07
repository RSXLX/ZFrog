/**
 * DiscoveryCard Component
 * 
 * Displays a single discovery from cross-chain exploration
 * with rarity indicator and type-specific styling
 */

import { motion } from 'framer-motion';

// Discovery type configuration
const DISCOVERY_CONFIG: Record<string, { icon: string; bg: string; label: string }> = {
  balance:       { icon: '💰', bg: 'bg-yellow-100', label: '余额' },
  activity:      { icon: '⚡', bg: 'bg-blue-100',   label: '活跃度' },
  timing:        { icon: '⏰', bg: 'bg-purple-100', label: '时机' },
  token_holding: { icon: '🪙', bg: 'bg-green-100',  label: '代币' },
  tx_action:     { icon: '🔗', bg: 'bg-indigo-100', label: '交易' },
  gas_price:     { icon: '⛽', bg: 'bg-red-100',    label: 'Gas' },
  cross_chain:   { icon: '🌉', bg: 'bg-cyan-100',   label: '跨链' },
  fun_fact:      { icon: '🎲', bg: 'bg-pink-100',   label: '趣事' },
};

// Rarity configuration
const RARITY_CONFIG: Record<string, { stars: string; border: string; glow?: string }> = {
  common:    { stars: '⭐',         border: 'border-l-gray-400' },
  uncommon:  { stars: '⭐⭐',       border: 'border-l-green-500' },
  rare:      { stars: '⭐⭐⭐',     border: 'border-l-blue-500' },
  epic:      { stars: '⭐⭐⭐⭐',   border: 'border-l-purple-500', glow: 'shadow-purple-200' },
  legendary: { stars: '⭐⭐⭐⭐⭐', border: 'border-l-yellow-500', glow: 'shadow-yellow-200 shadow-lg' },
};

export interface DiscoveryData {
  id: number;
  type: string;
  title: string;
  description: string;
  rarity: string;
  blockNumber?: number;
  createdAt: Date | string;
  metadata?: Record<string, any>;
}

interface DiscoveryCardProps {
  discovery: DiscoveryData;
  index?: number;
}

export function DiscoveryCard({ discovery, index = 0 }: DiscoveryCardProps) {
  const config = DISCOVERY_CONFIG[discovery.type] || DISCOVERY_CONFIG.fun_fact;
  const rarityConfig = RARITY_CONFIG[discovery.rarity] || RARITY_CONFIG.common;
  
  const timestamp = new Date(discovery.createdAt);
  const timeStr = timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm 
        border-l-4 ${rarityConfig.border}
        ${rarityConfig.glow || ''}
        hover:shadow-md transition-shadow
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center text-xl flex-shrink-0`}>
          {config.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-medium text-gray-800 text-sm truncate">{discovery.title}</h4>
            <span className="text-xs flex-shrink-0">{rarityConfig.stars}</span>
          </div>
          
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{discovery.description}</p>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            {discovery.blockNumber && (
              <>
                <span>📍 Block #{discovery.blockNumber.toLocaleString()}</span>
                <span>·</span>
              </>
            )}
            <span>{timeStr}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
