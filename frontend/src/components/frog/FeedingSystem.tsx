import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogInteraction, FOOD_ITEMS } from '../../hooks/useFrogInteraction';
import { FoodItem } from '../../types/frogAnimation';

interface FeedingSystemProps {
  onFeed: (food: FoodItem) => void;
  inventory: Record<string, number>;
}

export function FeedingSystem({ onFeed, inventory }: FeedingSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  
  const rarityColors = {
    common: 'bg-gray-100 border-gray-300',
    uncommon: 'bg-green-100 border-green-300',
    rare: 'bg-blue-100 border-blue-300',
    legendary: 'bg-yellow-100 border-yellow-300',
  };
  
  const rarityBorders = {
    common: 'border-gray-400',
    uncommon: 'border-green-400',
    rare: 'border-blue-400',
    legendary: 'border-yellow-400 shadow-lg',
  };
  
  const handleFeed = (food: FoodItem) => {
    if ((inventory[food.id] || 0) <= 0) return;
    
    setSelectedFood(food);
    onFeed(food);
    
    // 播放喂食动画
    setTimeout(() => {
      setSelectedFood(null);
    }, 1000);
  };
  
  // 获取食物稀有度标签
  const getRarityLabel = (rarity: string) => {
    const labels = {
      common: '普通',
      uncommon: '稀有',
      rare: '史诗',
      legendary: '传说',
    };
    return labels[rarity as keyof typeof labels] || '普通';
  };
  
  return (
    <div className="relative">
      {/* 喂食按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-orange-500 hover:bg-orange-600 rounded-full shadow-lg flex items-center justify-center text-2xl relative"
      >
        🍽️
        {/* 未读提示 */}
        {Object.values(inventory).some(count => count > 0) && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>
      
      {/* 食物菜单 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl p-4 min-w-[280px] z-50 max-h-[400px] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-lg">喂食青蛙</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              
              {/* 食物统计 */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">食物总数</span>
                  <span className="font-bold text-gray-800">
                    {Object.values(inventory).reduce((sum, count) => sum + count, 0)}
                  </span>
                </div>
              </div>
              
              {/* 食物列表 */}
              <div className="space-y-3">
                {FOOD_ITEMS.map((food) => {
                  const count = inventory[food.id] || 0;
                  const hasFood = count > 0;
                  
                  return (
                    <motion.button
                      key={food.id}
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFeed(food)}
                      disabled={!hasFood}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                        ${rarityColors[food.rarity]}
                        ${hasFood ? 'hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                        ${food.rarity === 'legendary' ? 'relative overflow-hidden' : ''}
                      `}
                    >
                      {/* 传说食物光效 */}
                      {food.rarity === 'legendary' && hasFood && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-orange-200 opacity-30"
                          animate={{
                            background: [
              'linear-gradient(45deg, rgba(251,191,36,0.3) 0%, rgba(251,146,60,0.3) 100%)',
              'linear-gradient(45deg, rgba(251,146,60,0.3) 0%, rgba(251,191,36,0.3) 100%)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      )}
      
      {/* 食物图标 */}
      <div className="relative">
        <motion.span 
          className="text-3xl"
          animate={hasFood ? { y: [0, -3, 0] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {food.emoji}
        </motion.span>
        
        {/* 数量标签 */}
        <span className={`absolute -top-2 -right-2 text-xs font-bold px-1.5 py-0.5 rounded-full ${
          hasFood 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-300 text-gray-500'
        }`}>
          {count}
        </span>
      </div>
      
      {/* 食物信息 */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800">{food.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${rarityBorders[food.rarity]} border`}>
                            {getRarityLabel(food.rarity)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            ⚡{food.energy}
                          </span>
                          <span className="flex items-center gap-1">
                            😊{food.happiness}
                          </span>
                        </div>
                      </div>
                      
                      {/* 喂食按钮 */}
                      {hasFood ? (
                        <motion.div
                          className="text-green-500"
                          whileHover={{ scale: 1.2 }}
                        >
                          ✓
                        </motion.div>
                      ) : (
                        <div className="text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              
              {/* 提示信息 */}
              {Object.values(inventory).every(count => count === 0) && (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-2xl mb-2">🍽️</p>
                  <p className="text-sm">没有食物了</p>
                  <p className="text-xs">去旅行可以获得食物哦！</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* 喂食动画 */}
      <AnimatePresence>
        {selectedFood && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ 
              opacity: 0, 
              y: -80, 
              scale: 0.5,
              rotate: 360 
            }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl z-30"
            transition={{ duration: 1, ease: 'easeIn' }}
          >
            {selectedFood.emoji}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 食物获取提示组件
export function FoodReward({ food, count = 1 }: { food: FoodItem; count?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-4 z-50"
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="text-4xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          {food.emoji}
        </motion.div>
        <div>
          <p className="font-bold text-gray-800">获得食物！</p>
          <p className="text-sm text-gray-600">
            {food.name} ×{count}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// 食物商店组件（扩展功能）
export function FoodShop({ onPurchase, balance }: { 
  onPurchase: (food: FoodItem, count: number) => void;
  balance: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [purchaseCount, setPurchaseCount] = useState(1);
  
  const foodPrices = {
    common: 10,
    uncommon: 25,
    rare: 50,
    legendary: 100,
  };
  
  const handlePurchase = (food: FoodItem) => {
    const price = foodPrices[food.rarity] * purchaseCount;
    if (balance >= price) {
      onPurchase(food, purchaseCount);
      setIsOpen(false);
      setSelectedFood(null);
      setPurchaseCount(1);
    }
  };
  
  return (
    <div className="relative">
      {/* 商店按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-purple-500 hover:bg-purple-600 rounded-full shadow-lg flex items-center justify-center text-xl"
      >
        🛒
      </motion.button>
      
      {/* 商店面板 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl p-4 min-w-[320px] z-50"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-lg">食物商店</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">余额:</span>
                  <span className="font-bold text-purple-600">{balance} 🪙</span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* 食物列表 */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {FOOD_ITEMS.map((food) => {
                  const price = foodPrices[food.rarity];
                  const totalPrice = price * purchaseCount;
                  const canAfford = balance >= totalPrice;
                  
                  return (
                    <div
                      key={food.id}
                      className="border rounded-xl p-3 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{food.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800">{food.name}</span>
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              {price} 🪙
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            ⚡{food.energy} 😊{food.happiness}
                          </div>
                        </div>
                      </div>
                      
                      {/* 购买控件 */}
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPurchaseCount(Math.max(1, purchaseCount - 1))}
                            className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {purchaseCount}
                          </span>
                          <button
                            onClick={() => setPurchaseCount(purchaseCount + 1)}
                            className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                          >
                            +
                          </button>
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePurchase(food)}
                          disabled={!canAfford}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                            canAfford 
                              ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? `购买 ${totalPrice} 🪙` : '余额不足'}
                        </motion.button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}