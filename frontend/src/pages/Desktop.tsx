import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FrogScene } from '../components/frog/FrogScene';
import { ChainEventPanel, WhaleAlert, PriceAlert } from '../components/frog/ChainEventPanel';
import { FeedingSystem, FoodShop } from '../components/frog/FeedingSystem';
import { ConnectButton } from '../components/wallet/ConnectButton';
import { useWallet } from '../hooks/useWallet';
import { useChainMonitor } from '../hooks/useChainMonitor';
import { useFrogInteraction, FOOD_ITEMS } from '../hooks/useFrogInteraction';
import { useFrogData } from '../hooks/useFrogData';
import { FoodItem } from '../types/frogAnimation';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/ToastProvider';
import { apiService } from '../services/api';
// TRAVEL_DESTINATIONS 将在组件内部定义

// 旅行目的地配置
const TRAVEL_DESTINATIONS = [
  { id: 'forest', name: '森林', emoji: '🌲', duration: 30000, reward: 10 },
  { id: 'lake', name: '湖边', emoji: '🏞️', duration: 45000, reward: 15 },
  { id: 'mountain', name: '山顶', emoji: '⛰️', duration: 60000, reward: 25 },
  { id: 'city', name: '城市', emoji: '🏙️', duration: 90000, reward: 35 },
  { id: 'beach', name: '海滩', emoji: '🏖️', duration: 75000, reward: 30 },
];

export function Desktop() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected, address } = useWallet();
  const { whaleAlert, priceChange, clearAlerts } = useChainMonitor();
  const { frog: activeFrog, loading } = useFrogData(address);
  
  // 使用服务器同步的互动 hook
  const { 
    travel, 
    feed,
    inventory: serverInventory,
    serverStatus,
    loadInventory,
    refresh: refreshInteraction,
  } = useFrogInteraction({
    tokenId: activeFrog?.tokenId,
    ownerAddress: address,
    autoSync: !!activeFrog,
  });
  
  // 本地库存状态 (未连接服务器时的 fallback)
  const [localInventory, setLocalInventory] = useState({
    fly: 10,
    worm: 5,
    cricket: 3,
    butterfly: 2,
    dragonfly: 1,
    golden_fly: 0,
  });
  
  // 使用服务器库存或本地库存
  const inventory = Object.keys(serverInventory).length > 0 ? serverInventory : localInventory;
  
  const [balance, setBalance] = useState(500);
  const [showTravelDialog, setShowTravelDialog] = useState(false);
  const [showFoodReward, setShowFoodReward] = useState<FoodItem | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showWelcome, setShowWelcome] = useState(true);

  const handleGroupTravel = async (companion: any) => {
    if (!activeFrog) return;

    try {
      const response = await apiService.post('/travels/group', {
        leaderId: activeFrog.tokenId,
        companionId: companion.tokenId,
        duration: 3600,
      });

      if (!response.success) {
        throw new Error(response.error || '发起结伴旅行失败');
      }

      toast.success(`${activeFrog.name} 和 ${companion.name} 已一起出发旅行`);
      navigate(`/frog/${activeFrog.tokenId}`);
    } catch (error: any) {
      toast.error(error?.message || '发起结伴旅行失败');
    }
  };
  
  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // 隐藏欢迎消息
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  
  // 处理喂食 (异步，同步到服务器)
  const handleFeed = async (food: FoodItem) => {
    if ((inventory[food.id] || 0) <= 0) return;
    
    // 本地立即更新 (乐观更新)
    setLocalInventory(prev => ({
      ...prev,
      [food.id]: Math.max(0, (prev[food.id as keyof typeof prev] || 0) - 1)
    }));
    
    if (activeFrog && address) {
      // 调用服务器 API
      const result = await feed(food.id);
      if (result.success) {
        console.log(`喂食成功: ${food.name} 给 ${activeFrog.name}, 能量+${result.energy}, 快乐+${result.happiness}`);
      } else {
        console.error('喂食失败:', result.error);
        // 回滚本地状态
        setLocalInventory(prev => ({
          ...prev,
          [food.id]: (prev[food.id as keyof typeof prev] || 0) + 1
        }));
      }
    }
  };
  
  // 处理旅行
  const handleTravel = (destination: any) => {
    if (!activeFrog) return;
    
    setShowTravelDialog(false);
    
    // 开始旅行
    const travelResult = travel(destination.id);
    
    // 模拟旅行过程
    setTimeout(() => {
      // 旅行结束，获得奖励
      const rewardFood = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
      const rewardCount = Math.floor(Math.random() * 3) + 1;
      
      setLocalInventory(prev => ({
        ...prev,
        [rewardFood.id]: (prev[rewardFood.id as keyof typeof prev] || 0) + rewardCount,
      }));
      
      setBalance(prev => prev + travelResult.reward);
      setShowFoodReward(rewardFood);
      
      // 3秒后隐藏奖励提示
      setTimeout(() => {
        setShowFoodReward(null);
      }, 3000);
    }, travelResult.duration);
  };
  
  // 处理购买食物
  const handlePurchaseFood = (food: FoodItem, count: number) => {
    const foodPrices = {
      common: 10,
      uncommon: 25,
      rare: 50,
      legendary: 100,
    };
    
    const totalPrice = foodPrices[food.rarity] * count;
    
    setBalance(prev => prev - totalPrice);
    setLocalInventory(prev => ({
      ...prev,
      [food.id]: (prev[food.id as keyof typeof prev] || 0) + count,
    }));
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 via-green-100 to-green-200 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 云朵 */}
        <motion.div
          className="absolute top-10 left-10 text-6xl opacity-50"
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        >
          ☁️
        </motion.div>
        <motion.div
          className="absolute top-20 right-20 text-4xl opacity-40"
          animate={{ x: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        >
          ☁️
        </motion.div>
        <motion.div
          className="absolute top-5 left-1/2 text-5xl opacity-45"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        >
          ☁️
        </motion.div>
        
        {/* 太阳 */}
        <motion.div
          className="absolute top-10 right-10 text-6xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        >
          ☀️
        </motion.div>
        
        {/* 草地 */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-500 to-transparent opacity-30" />
      </div>
      
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.span
              className="text-3xl"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🐸
            </motion.span>
            <span className="font-bold text-xl text-gray-800">ZetaFrog Desktop</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 时间显示 */}
            <div className="text-sm text-gray-600">
              {currentTime.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            
            {/* 余额显示 */}
            {isConnected && (
              <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                <span>🪙</span>
                <span className="font-bold text-yellow-700">{balance}</span>
              </div>
            )}
            
            <ConnectButton />
          </div>
        </div>
      </nav>
      
      {/* 主要内容 */}
      <main className="pt-24 pb-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* 欢迎消息 */}
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  欢迎来到 ZetaFrog 桌面宠物世界！
                </h1>
                <p className="text-gray-600">
                  点击青蛙进行互动，观察链上事件，享受 Web3 养成乐趣！
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 青蛙区域 */}
          <div className="flex justify-center items-center min-h-[60vh]">
            {loading ? (
              <div className="text-center">
                <motion.div
                  className="text-6xl mb-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  🐸
                </motion.div>
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : activeFrog ? (
              <FrogScene
                frogId={activeFrog.tokenId}
                frogName={activeFrog.name}
                isOwner={true}
                showVisitorControls={true}
                onGroupTravel={handleGroupTravel}
              />
            ) : (
              <div className="text-center">
                <motion.p
                  className="text-6xl mb-4"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🥚
                </motion.p>
                <p className="text-gray-600">你还没有青蛙</p>
                <p className="text-sm text-gray-400">连接钱包并铸造一只吧！</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* 喂食系统 */}
      <div className="fixed left-4 bottom-4 z-40 flex gap-3">
        <FeedingSystem 
          onFeed={handleFeed}
          inventory={inventory}
        />
        <FoodShop 
          onPurchase={handlePurchaseFood}
          balance={balance}
        />
      </div>
      
      {/* 链上监控面板 */}
      <ChainEventPanel />
      
      {/* 快捷操作栏 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex gap-3 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
          <ActionButton 
            emoji="🎒" 
            label="旅行" 
            onClick={() => setShowTravelDialog(true)}
          />
          <ActionButton 
            emoji="📖" 
            label="日记" 
            onClick={() => navigate('/travel-history')}
          />
          <ActionButton 
            emoji="🎁" 
            label="纪念品" 
            onClick={() => navigate('/souvenirs')}
          />
          <ActionButton 
            emoji="⚙️" 
            label="设置" 
            onClick={() => navigate('/my-frog')}
          />
        </div>
      </div>
      
      {/* 旅行对话框 */}
      <AnimatePresence>
        {showTravelDialog && (
          <TravelDialog
            destinations={TRAVEL_DESTINATIONS}
            onSelect={handleTravel}
            onClose={() => setShowTravelDialog(false)}
          />
        )}
      </AnimatePresence>
      
      {/* 食物奖励提示 */}
      <AnimatePresence>
        {showFoodReward && (
          <FoodReward food={showFoodReward} />
        )}
      </AnimatePresence>
      
      {/* 鲸鱼警报 */}
      <AnimatePresence>
        {whaleAlert && (
          <WhaleAlert 
            alert={whaleAlert}
            onClose={clearAlerts}
          />
        )}
      </AnimatePresence>
      
      {/* 价格变化警报 */}
      <AnimatePresence>
        {Math.abs(priceChange) >= 10 && (
          <PriceAlert 
            change={priceChange}
            token="ZETA"
            onClose={clearAlerts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// 操作按钮组件
function ActionButton({ 
  emoji, 
  label, 
  onClick 
}: { 
  emoji: string; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-3"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-600">{label}</span>
    </motion.button>
  );
}

// 旅行对话框组件
function TravelDialog({ 
  destinations, 
  onSelect, 
  onClose 
}: {
  destinations: any[];
  onSelect: (destination: any) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50"
        onClick={onClose}
      />
      
      {/* 对话框 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-6 z-50 min-w-[400px]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-xl text-gray-800">选择旅行目的地</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3">
          {destinations.map((dest) => (
            <motion.button
              key={dest.id}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(dest)}
              className="w-full flex items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-all"
            >
              <span className="text-3xl">{dest.emoji}</span>
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-800">{dest.name}</div>
                <div className="text-sm text-gray-500">
                  时长: {Math.floor(dest.duration / 1000)}秒 | 奖励: {dest.reward} 🪙
                </div>
              </div>
              <span className="text-green-500">→</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// 食物奖励组件
function FoodReward({ food }: { food: FoodItem }) {
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
          <p className="font-bold text-gray-800">旅行归来！</p>
          <p className="text-sm text-gray-600">
            获得 {food.name} ×1
          </p>
        </div>
      </div>
    </motion.div>
  );
}
