/**
 * 道具栏组件 - 显示食物、背包等道具
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ItemSlot {
  id: string;
  emoji: string;
  name: string;
  count?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
  onClick?: () => void;
}

interface ItemBarProps {
  /** 道具列表 */
  items?: ItemSlot[];
  /** 选中的道具 ID */
  selectedId?: string;
  /** 选择道具回调 */
  onSelect?: (item: ItemSlot) => void;
  /** 布局方向 */
  direction?: 'horizontal' | 'vertical';
}

// 默认道具
const DEFAULT_ITEMS: ItemSlot[] = [
  { id: 'clover', emoji: '🍀', name: '四叶草', count: 10, rarity: 'common' },
  { id: 'sandwich', emoji: '🥪', name: '三明治', count: 5, rarity: 'uncommon' },
  { id: 'cake', emoji: '🍰', name: '蛋糕', count: 2, rarity: 'rare' },
  { id: 'backpack', emoji: '🎒', name: '背包', rarity: 'common' },
  { id: 'map', emoji: '🗺️', name: '地图', rarity: 'uncommon' },
];

// 稀有度颜色
const RARITY_COLORS = {
  common: 'from-gray-100 to-gray-200 border-gray-300',
  uncommon: 'from-green-100 to-emerald-200 border-green-400',
  rare: 'from-blue-100 to-indigo-200 border-blue-500',
  legendary: 'from-amber-100 to-yellow-200 border-amber-500',
};

const RARITY_GLOW = {
  common: '',
  uncommon: 'shadow-green-200',
  rare: 'shadow-blue-300 shadow-lg',
  legendary: 'shadow-amber-400 shadow-xl animate-pulse',
};

export function ItemBar({
  items = DEFAULT_ITEMS,
  selectedId,
  onSelect,
  direction = 'horizontal',
}: ItemBarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const containerClass = direction === 'horizontal' 
    ? 'flex flex-row gap-2' 
    : 'flex flex-col gap-2';

  return (
    <div className={`${containerClass} p-2 bg-white/50 dark:bg-gray-800/50 
                     backdrop-blur-sm rounded-xl shadow-lg`}>
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        const isHovered = hoveredId === item.id;
        const rarity = item.rarity || 'common';

        return (
          <motion.div
            key={item.id}
            className="relative"
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* 道具槽位 */}
            <motion.button
              className={`relative w-14 h-14 rounded-xl border-2 
                         bg-gradient-to-br ${RARITY_COLORS[rarity]} ${RARITY_GLOW[rarity]}
                         flex flex-col items-center justify-center
                         transition-all duration-200
                         ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
                         hover:scale-110 active:scale-95`}
              onClick={() => {
                onSelect?.(item);
                item.onClick?.();
              }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.9 }}
            >
              {/* Emoji 图标 */}
              <span className="text-2xl">{item.emoji}</span>
              
              {/* 数量徽章 */}
              {item.count !== undefined && item.count > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white 
                               text-xs font-bold rounded-full w-5 h-5 
                               flex items-center justify-center shadow">
                  {item.count > 99 ? '99+' : item.count}
                </div>
              )}

              {/* 选中指示器 */}
              {isSelected && (
                <motion.div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 
                             w-2 h-2 bg-emerald-500 rounded-full"
                  layoutId="selectedIndicator"
                />
              )}
            </motion.button>

            {/* 悬停提示 */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.9 }}
                  className={`absolute z-10 whitespace-nowrap
                             bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg
                             ${direction === 'horizontal' ? '-top-8 left-1/2 -translate-x-1/2' : 'left-16 top-1/2 -translate-y-1/2'}`}
                >
                  {item.name}
                  {item.count !== undefined && ` x${item.count}`}
                  {/* 三角箭头 */}
                  <div className={`absolute w-2 h-2 bg-gray-900 rotate-45
                                  ${direction === 'horizontal' ? '-bottom-1 left-1/2 -translate-x-1/2' : '-left-1 top-1/2 -translate-y-1/2'}`} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

export default ItemBar;
