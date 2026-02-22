import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMyFrog } from '../hooks/useMyFrog';
import { Button } from '../components/common/Button';
import { apiService } from '../services/api';

interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: number;
  isHidden: boolean;
  unlocked: boolean;
  unlockedAt?: string;
  unlockType?: string;
  airdropAmount?: string;
  airdropEnabled?: boolean;
}

// 徽章类别定义
const BADGE_CATEGORIES = [
  { key: 'all', label: '全部', icon: '🏆' },
  { key: 'TRIP_COUNT', label: '旅行', icon: '🗺️' },
  { key: 'CHAIN_VISIT', label: '链探索', icon: '⛓️' },
  { key: 'MULTI_CHAIN', label: '跨链', icon: '🔗' },
  { key: 'RARE_FIND', label: '发现', icon: '🔍' },
  { key: 'SOCIAL', label: '社交', icon: '🤝' },
  { key: 'COLLECTION', label: '收藏', icon: '🏠' },
  { key: 'SPECIAL', label: '特殊', icon: '🎭' },
];

// 稀有度配置
const RARITY_CONFIG: Record<number, {
  name: string;
  cardStyle: string;
  glowStyle: string;
  badgeStyle: string;
  stars: string;
}> = {
  1: {
    name: '普通',
    cardStyle: 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100',
    glowStyle: 'bg-gray-100',
    badgeStyle: 'bg-gray-100 text-gray-700',
    stars: '⭐',
  },
  2: {
    name: '稀有',
    cardStyle: 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-100',
    glowStyle: 'bg-green-100 shadow-green-200 shadow-lg',
    badgeStyle: 'bg-green-100 text-green-700',
    stars: '⭐⭐',
  },
  3: {
    name: '精良',
    cardStyle: 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-100',
    glowStyle: 'bg-blue-100 shadow-blue-300 shadow-xl',
    badgeStyle: 'bg-blue-100 text-blue-700',
    stars: '⭐⭐⭐',
  },
  4: {
    name: '史诗',
    cardStyle: 'border-purple-400 bg-gradient-to-br from-purple-50 to-violet-100 ring-1 ring-purple-200',
    glowStyle: 'bg-purple-100 shadow-purple-400 shadow-xl ring-2 ring-purple-300',
    badgeStyle: 'bg-purple-100 text-purple-700',
    stars: '⭐⭐⭐⭐',
  },
  5: {
    name: '传说',
    cardStyle: 'border-yellow-400 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 ring-2 ring-yellow-300',
    glowStyle: 'bg-gradient-to-br from-yellow-100 to-amber-200 shadow-yellow-400 shadow-2xl ring-4 ring-yellow-300 animate-pulse',
    badgeStyle: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
    stars: '⭐⭐⭐⭐⭐',
  },
};

// 动画 variants
const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  }),
  hover: {
    scale: 1.05,
    y: -8,
    transition: { type: 'spring', stiffness: 300, damping: 15 },
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.9, y: 20 },
};

export function BadgesPage() {
  const navigate = useNavigate();
  const { frog, loading: frogLoading, isConnected, hasFrog } = useMyFrog();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [category, setCategory] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  
  // 奖励领取状态
  const [rewards, setRewards] = useState<any[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!frog) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [badgesData, rewardsData] = await Promise.all([
          apiService.getBadges(frog.tokenId),
          apiService.getPendingRewards(frog.ownerAddress),
        ]);
        setBadges(badgesData || []);
        setRewards(rewardsData || []);
      } catch (error) {
        console.error('Failed to fetch badges:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!frogLoading) {
      fetchData();
    }
  }, [frog, frogLoading]);

  // 计算待领取奖励总额
  const totalRewardAmount = rewards.reduce((sum, r) => sum + BigInt(r.amount || '0'), BigInt(0));
  const formattedReward = totalRewardAmount > 0 
    ? (Number(totalRewardAmount) / 1e18).toFixed(4) 
    : '0';

  // 领取所有奖励
  const handleClaimAll = async () => {
    if (!frog || rewards.length === 0) return;
    
    setClaiming(true);
    setClaimResult(null);
    
    try {
      const result = await apiService.claimAllRewards(frog.ownerAddress);
      setClaimResult({
        success: true,
        message: `成功领取 ${result.successCount} 份奖励！`,
      });
      // 刷新奖励列表
      const newRewards = await apiService.getPendingRewards(frog.ownerAddress);
      setRewards(newRewards || []);
    } catch (error: any) {
      setClaimResult({
        success: false,
        message: error.message || '领取失败，请稍后重试',
      });
    } finally {
      setClaiming(false);
    }
  };

  // 筛选逻辑
  const filteredBadges = badges.filter((badge) => {
    // 状态筛选
    if (filter === 'unlocked' && !badge.unlocked) return false;
    if (filter === 'locked' && badge.unlocked) return false;
    // 类别筛选
    if (category !== 'all' && badge.unlockType !== category) return false;
    return true;
  });

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // 分享功能
  const handleShare = async (badge: Badge) => {
    const text = `🏆 我在 ZetaFrog 解锁了「${badge.name}」徽章！\n${badge.description}\n\n#ZetaFrog #Web3Gaming`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'ZetaFrog 徽章', text });
      } else {
        await navigator.clipboard.writeText(text);
        // TODO: 添加 toast 提示
        alert('已复制到剪贴板！');
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  // 未连接钱包
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-7xl mb-6"
        >
          🔗
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">请先连接钱包</h2>
        <p className="text-gray-600">连接钱包后查看你的徽章收藏</p>
      </div>
    );
  }

  // 没有青蛙
  if (!frogLoading && !hasFrog) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-7xl mb-6"
        >
          🐸
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">还没有青蛙</h2>
        <p className="text-gray-600 mb-6">先铸造一只青蛙开始收集徽章吧！</p>
        <Link to="/?mint=true">
          <Button variant="primary" className="text-lg px-6 py-3">
            🎉 立即铸造
          </Button>
        </Link>
      </div>
    );
  }

  // 加载中
  if (frogLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-7xl"
        >
          🏆
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 via-emerald-100 to-green-200 p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* 返回按钮 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-white/50 hover:bg-white/80"
          >
            <span>←</span>
            <span>返回首页</span>
          </Button>
        </motion.div>

        {/* 标题和统计 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent mb-3">
            🏆 {frog?.name} 的徽章
          </h1>
          <p className="text-gray-600 mb-6">收集徽章，记录你的探险成就！</p>

          {/* 进度条 */}
          <div className="inline-flex flex-col items-center bg-white/60 backdrop-blur rounded-2xl px-8 py-4 shadow-lg">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-3xl">🎯</span>
              <span className="text-xl font-bold text-gray-800">
                {unlockedCount} / {totalCount}
              </span>
              <span className="text-lg text-gray-500">({progressPercent}%)</span>
            </div>
            <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* 奖励领取卡片 */}
          {rewards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 inline-flex flex-col items-center bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl px-8 py-4 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🎁</span>
                <span className="text-lg font-bold text-amber-800">
                  {rewards.length} 份待领取奖励
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-600 mb-3">
                {formattedReward} ZETA
              </div>
              <button
                onClick={handleClaimAll}
                disabled={claiming}
                className={`px-6 py-2.5 rounded-xl font-bold text-white transition-all ${
                  claiming
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 shadow-lg hover:shadow-xl'
                }`}
              >
                {claiming ? '⏳ 领取中...' : '🎉 一键领取'}
              </button>
            </motion.div>
          )}

          {/* 领取结果提示 */}
          <AnimatePresence>
            {claimResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 px-6 py-3 rounded-xl ${
                  claimResult.success
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {claimResult.success ? '✅' : '❌'} {claimResult.message}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 类别筛选标签 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {BADGE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`shrink-0 px-4 py-2 rounded-full font-medium transition-all ${
                  category === cat.key
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200'
                    : 'bg-white/60 text-gray-600 hover:bg-white/90 hover:shadow'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 状态筛选标签 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex rounded-xl border border-white/50 bg-white/40 backdrop-blur p-1 shadow-lg">
            {[
              { key: 'all', label: '全部', count: totalCount },
              { key: 'unlocked', label: '已解锁', count: unlockedCount },
              { key: 'locked', label: '未解锁', count: totalCount - unlockedCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-5 py-2.5 rounded-lg transition-all font-medium ${
                  filter === tab.key
                    ? 'bg-white text-gray-800 shadow-md'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </motion.div>

        {/* 徽章网格 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          {filteredBadges.map((badge, index) => {
            const rarity = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG[1];
            return (
              <motion.div
                key={badge.id}
                custom={index}
                variants={badgeVariants}
                initial="hidden"
                animate="visible"
                whileHover={badge.unlocked ? 'hover' : undefined}
                onClick={() => setSelectedBadge(badge)}
                className={`relative cursor-pointer rounded-2xl border-2 p-4 text-center transition-shadow ${
                  badge.unlocked
                    ? `${rarity.cardStyle} hover:shadow-xl`
                    : 'border-gray-200 bg-gray-100/80'
                }`}
              >
                {/* 未解锁遮罩 */}
                {!badge.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-2xl backdrop-blur-[1px]">
                    <span className="text-3xl opacity-80">🔒</span>
                  </div>
                )}

                {/* 图标 */}
                <div
                  className={`text-4xl md:text-5xl mb-2 transition-transform ${
                    badge.unlocked ? '' : 'grayscale opacity-50'
                  }`}
                >
                  {badge.unlocked ? badge.icon : '❓'}
                </div>

                {/* 名称 */}
                <h3
                  className={`font-bold text-sm mb-1 truncate ${
                    badge.unlocked ? 'text-gray-800' : 'text-gray-400'
                  }`}
                >
                  {badge.unlocked ? badge.name : '???'}
                </h3>

                {/* 稀有度星星 */}
                {badge.unlocked && (
                  <div className="text-xs">{rarity.stars}</div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* 空状态 */}
        {filteredBadges.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">
              {filter === 'locked' ? '🎉' : '🐸'}
            </div>
            <p className="text-gray-600 text-lg mb-4">
              {filter === 'locked'
                ? '太棒了！你已经解锁了所有徽章！'
                : category !== 'all'
                ? '该类别暂无徽章'
                : '还没有徽章，快去旅行收集吧！'}
            </p>
            {filter !== 'locked' && category === 'all' && (
              <Button onClick={() => navigate('/')} variant="primary">
                🚀 开始旅行
              </Button>
            )}
          </motion.div>
        )}

        {/* 提示信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-block bg-white/50 backdrop-blur rounded-xl px-6 py-3 text-sm text-gray-600">
            💡 通过旅行、探索不同链、社交互动来解锁更多徽章！
          </div>
        </motion.div>
      </div>

      {/* 徽章详情弹窗 */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 稀有度光环 + 图标 */}
              <div
                className={`w-28 h-28 md:w-32 md:h-32 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  selectedBadge.unlocked
                    ? RARITY_CONFIG[selectedBadge.rarity]?.glowStyle || ''
                    : 'bg-gray-100'
                }`}
              >
                <span className="text-6xl md:text-7xl">
                  {selectedBadge.unlocked ? selectedBadge.icon : '🔒'}
                </span>
              </div>

              {/* 名称 */}
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                {selectedBadge.unlocked ? selectedBadge.name : '???'}
              </h3>

              {/* 描述 */}
              <p className="text-gray-600 mb-4 leading-relaxed">
                {selectedBadge.unlocked
                  ? selectedBadge.description
                  : '完成特定条件解锁此徽章'}
              </p>

              {/* 稀有度标签 + 星星 */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    RARITY_CONFIG[selectedBadge.rarity]?.badgeStyle || ''
                  }`}
                >
                  {RARITY_CONFIG[selectedBadge.rarity]?.name || '普通'}
                </span>
                <span className="text-sm">
                  {RARITY_CONFIG[selectedBadge.rarity]?.stars || '⭐'}
                </span>
              </div>

              {/* 空投奖励 */}
              {selectedBadge.airdropEnabled && selectedBadge.airdropAmount && (
                <div className="mb-4 px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
                  <span className="text-amber-700 font-medium">
                    🎁 解锁奖励: {Number(BigInt(selectedBadge.airdropAmount)) / 1e18} ZETA
                  </span>
                </div>
              )}

              {/* 解锁时间 */}
              {selectedBadge.unlocked && selectedBadge.unlockedAt && (
                <p className="text-sm text-gray-500 mb-4">
                  🎉 解锁于{' '}
                  {new Date(selectedBadge.unlockedAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}

              {/* 按钮 */}
              <div className="flex gap-3 justify-center mt-6">
                {selectedBadge.unlocked && (
                  <button
                    onClick={() => handleShare(selectedBadge)}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    📤 分享
                  </button>
                )}
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}