/**
 * 纪念品展示架 - 展示收集的纪念品
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Souvenir {
  id: string;
  emoji: string;
  name: string;
  chain: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  date?: string;
}

interface SouvenirShelfProps {
  /** 纪念品列表 */
  souvenirs?: Souvenir[];
  /** 最大显示数量 */
  maxDisplay?: number;
  /** 点击纪念品回调 */
  onSouvenirClick?: (souvenir: Souvenir) => void;
  /** 查看全部回调 */
  onViewAll?: () => void;
}

// 链图标
const CHAIN_ICONS: Record<string, string> = {
  ethereum: '⟠',
  bsc: '🟡',
  polygon: '🟣',
  arbitrum: '🔵',
  optimism: '🔴',
  zetachain: '🟢',
};

// 稀有度样式
const RARITY_STYLES = {
  common: 'border-gray-300 bg-gray-50',
  uncommon: 'border-green-400 bg-green-50',
  rare: 'border-blue-500 bg-blue-50 shadow-blue-200 shadow-md',
  legendary: 'border-amber-500 bg-amber-50 shadow-amber-300 shadow-lg',
};

// 默认纪念品
const DEFAULT_SOUVENIRS: Souvenir[] = [
  { id: '1', emoji: '🏔️', name: '雪山明信片', chain: 'ethereum', rarity: 'uncommon' },
  { id: '2', emoji: '🌊', name: '海浪贝壳', chain: 'polygon', rarity: 'common' },
  { id: '3', emoji: '💎', name: '钻石徽章', chain: 'zetachain', rarity: 'legendary' },
  { id: '4', emoji: '🏛️', name: '神殿拓片', chain: 'arbitrum', rarity: 'rare' },
  { id: '5', emoji: '🎨', name: '艺术画作', chain: 'bsc', rarity: 'uncommon' },
];

export function SouvenirShelf({
  souvenirs = DEFAULT_SOUVENIRS,
  maxDisplay = 5,
  onSouvenirClick,
  onViewAll,
}: SouvenirShelfProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const displaySouvenirs = souvenirs.slice(0, maxDisplay);
  const hasMore = souvenirs.length > maxDisplay;

  return (
    <div className="relative">
      {/* 架子背景 */}
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-amber-800 to-amber-600 rounded shadow-lg" />
      
      {/* 纪念品列表 */}
      <div className="relative flex items-end justify-center gap-3 pb-4 px-4">
        {displaySouvenirs.map((souvenir, index) => (
          <motion.div
            key={souvenir.id}
            className="relative"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            onMouseEnter={() => setHoveredId(souvenir.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* 纪念品 */}
            <motion.button
              className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center
                         ${RARITY_STYLES[souvenir.rarity]}
                         transition-all duration-200`}
              whileHover={{ y: -8, scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSouvenirClick?.(souvenir)}
            >
              <span className="text-2xl">{souvenir.emoji}</span>
              
              {/* 链标识 */}
              <div className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full shadow">
                {CHAIN_ICONS[souvenir.chain] || '🌐'}
              </div>
              
              {/* 传奇光效 */}
              {souvenir.rarity === 'legendary' && (
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-amber-400"
                  animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>

            {/* 悬停提示 */}
            <AnimatePresence>
              {hoveredId === souvenir.id && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10
                             bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
                >
                  {souvenir.name}
                  <div className="text-gray-400 text-[10px]">
                    {CHAIN_ICONS[souvenir.chain]} {souvenir.chain}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* 查看更多 */}
        {hasMore && (
          <motion.button
            className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-400
                       flex items-center justify-center text-gray-500
                       hover:border-emerald-500 hover:text-emerald-600 transition-colors"
            whileHover={{ scale: 1.1 }}
            onClick={onViewAll}
          >
            <span className="text-sm font-medium">+{souvenirs.length - maxDisplay}</span>
          </motion.button>
        )}

        {/* 空状态 */}
        {souvenirs.length === 0 && (
          <div className="text-gray-400 text-sm py-4">
            还没有纪念品，去旅行收集吧！ 🐸
          </div>
        )}
      </div>
    </div>
  );
}

export default SouvenirShelf;
