/**
 * DecorationInventory - 装饰品库存抽屉组件
 * 
 * 功能:
 * - 显示可用装饰品
 * - 拖拽添加到场景
 * - 分类筛选
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface InventoryItem {
  id: string;
  decorationId: string;
  amount: number;
  decoration: {
    id: string;
    name: string;
    type: string;
    assetUrl: string;
    width: number;
    height: number;
  };
}

interface DecorationInventoryProps {
  items: InventoryItem[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectItem: (item: InventoryItem) => void;
  selectedItemId?: string;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  FURNITURE: { label: '家具', emoji: '🪑' },
  PLANT: { label: '植物', emoji: '🌿' },
  FLOORING: { label: '地板', emoji: '🟫' },
  WALLPAPER: { label: '壁纸', emoji: '🖼️' },
  SOUVENIR_DISPLAY: { label: '展示', emoji: '🏆' },
};

export const DecorationInventory: React.FC<DecorationInventoryProps> = ({
  items,
  isOpen,
  onToggle,
  onSelectItem,
  selectedItemId,
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // 按类型分组
  const filteredItems = activeFilter
    ? items.filter((item) => item.decoration.type === activeFilter)
    : items;

  // 获取所有类型
  const availableTypes = [...new Set(items.map((item) => item.decoration.type))];

  return (
    <>
      {/* 切换按钮 */}
      <motion.button
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                   bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full 
                   shadow-lg flex items-center gap-2 font-bold z-40"
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>🎒</span>
        <span>库存</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▲
        </motion.span>
      </motion.button>

      {/* 库存抽屉 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 
                       rounded-t-3xl shadow-2xl z-30 max-h-[50vh] overflow-hidden"
          >
            {/* 拖拽指示条 */}
            <div className="flex justify-center py-2">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* 分类筛选 */}
            <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveFilter(null)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all ${
                  activeFilter === null
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                全部
              </button>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all flex items-center gap-1 ${
                    activeFilter === type
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{TYPE_LABELS[type]?.emoji || '📦'}</span>
                  <span>{TYPE_LABELS[type]?.label || type}</span>
                </button>
              ))}
            </div>

            {/* 物品网格 */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4 overflow-y-auto max-h-[35vh]">
              {filteredItems.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-8">
                  暂无装饰品
                </div>
              ) : (
                filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    className={`relative aspect-square bg-gray-50 dark:bg-gray-700 
                               rounded-xl p-2 cursor-pointer transition-all ${
                                 selectedItemId === item.id
                                   ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-900/30'
                                   : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                               }`}
                    onClick={() => onSelectItem(item)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={item.decoration.assetUrl}
                      alt={item.decoration.name}
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    
                    {/* 数量徽章 */}
                    {item.amount > 1 && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white 
                                      text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {item.amount}
                      </div>
                    )}
                    
                    {/* 名称 tooltip */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 
                                    text-white text-xs text-center py-0.5 rounded-b-lg 
                                    truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.decoration.name}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* 使用提示 */}
            {selectedItemId && (
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/30 text-center text-sm">
                💡 点击场景中任意位置放置装饰品
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DecorationInventory;
