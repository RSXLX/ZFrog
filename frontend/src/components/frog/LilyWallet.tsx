/**
 * 🐸 宠物蛋系统 - $LILY 钱包组件
 * 设计风格: Claymorphism
 * 功能: 显示余额、收支统计、交易历史
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLilyBalance } from '../../hooks/useFrogNurture';
import { apiService } from '../../services/api';

interface LilyWalletProps {
  ownerAddress: string;
  refreshTrigger?: number;
}

// SVG 图标
const Icons = {
  Lily: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.24 2 7 4.24 7 7c0 1.77.93 3.31 2.32 4.19C6.44 12.03 4.5 14.61 4.5 17.5c0 .28.02.55.05.82C5.5 21.16 8.5 23 12 23s6.5-1.84 7.45-4.68c.03-.27.05-.54.05-.82 0-2.89-1.94-5.47-4.82-6.31C16.07 10.31 17 8.77 17 7c0-2.76-2.24-5-5-5z" />
    </svg>
  ),
  ArrowUp: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  ArrowDown: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  ),
  History: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
};

// Claymorphism 样式
const clayStyles = {
  card: `
    bg-gradient-to-br from-white to-gray-50
    rounded-3xl
    shadow-[8px_8px_16px_rgba(163,177,198,0.6),-8px_-8px_16px_rgba(255,255,255,0.8)]
    border border-white/50
  `,
  button: `
    rounded-2xl
    shadow-[4px_4px_8px_rgba(163,177,198,0.5),-4px_-4px_8px_rgba(255,255,255,0.8)]
    hover:shadow-[2px_2px_4px_rgba(163,177,198,0.5),-2px_-2px_4px_rgba(255,255,255,0.8)]
    active:shadow-inner
    transition-all duration-200 ease-out
    cursor-pointer
  `,
};

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export function LilyWallet({ ownerAddress, refreshTrigger = 0 }: LilyWalletProps) {
  const { balance, loading } = useLilyBalance(ownerAddress, refreshTrigger);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    if (!ownerAddress) return;
    setHistoryLoading(true);
    try {
      const response = await apiService.get(`/nurture/transactions/${ownerAddress}?limit=20`);
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (err) {
      console.error('获取交易历史失败:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = () => {
    setShowHistory(true);
    fetchHistory();
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      GAME_REWARD: '游戏奖励',
      FEED_COST: '喂食消费',
      CLEAN_REWARD: '清洁奖励',
      DAILY_SIGNIN: '每日签到',
      TRAVEL_REWARD: '旅行奖励',
      MEDICINE_COST: '治疗消费',
      TASK_REWARD: '任务奖励',
      SHOP_PURCHASE: '商店消费',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      GAME_REWARD: '🎮',
      FEED_COST: '🍽️',
      CLEAN_REWARD: '✨',
      DAILY_SIGNIN: '📅',
      TRAVEL_REWARD: '✈️',
      MEDICINE_COST: '💊',
      TASK_REWARD: '🏆',
      SHOP_PURCHASE: '🛒',
    };
    return icons[type] || '💰';
  };

  const dailyGameLimit = balance
    ? balance.dailyGameEarned + balance.dailyRemainingGameReward
    : 0;

  if (loading && !balance) {
    return (
      <div className={`${clayStyles.card} p-4 animate-pulse`}>
        <div className="h-10 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      {/* 钱包卡片 */}
      <motion.div
        className={`${clayStyles.card} p-4`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          {/* 余额显示 */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white shadow-lg">
              <Icons.Lily />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">$LILY 余额</p>
              <motion.p 
                className="text-2xl font-bold text-gray-800"
                key={balance?.balance}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
              >
                {balance?.balance || 0}
              </motion.p>
            </div>
          </div>

          {/* 收支统计 */}
          <div className="flex gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <Icons.ArrowUp />
                <span className="text-xs">收入</span>
              </div>
              <p className="font-bold text-gray-700">{balance?.totalEarned || 0}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                <Icons.ArrowDown />
                <span className="text-xs">支出</span>
              </div>
              <p className="font-bold text-gray-700">{balance?.totalSpent || 0}</p>
            </div>
          </div>

          {/* 历史按钮 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openHistory}
            className={`${clayStyles.button} p-3 text-gray-600 hover:text-purple-600`}
          >
            <Icons.History />
          </motion.button>
        </div>

        {/* 今日游戏奖励进度 */}
        <div className="mt-4 p-3 bg-purple-50 rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-purple-600 font-medium">今日游戏奖励</span>
            <span className="text-sm text-purple-800 font-bold">
              {balance?.dailyGameEarned || 0} / {dailyGameLimit || 0}
            </span>
          </div>
          <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${dailyGameLimit > 0
                  ? Math.min(100, ((balance?.dailyGameEarned || 0) / dailyGameLimit) * 100)
                  : 0}%`,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* 交易历史弹窗 */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`${clayStyles.card} p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题 */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Icons.History />
                  交易历史
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:text-gray-700"
                >
                  <Icons.Close />
                </motion.button>
              </div>

              {/* 交易列表 */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 mt-2">加载中...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-gray-500">暂无交易记录</p>
                  </div>
                ) : (
                  transactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm"
                    >
                      {/* 图标 */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center text-lg
                        ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}
                      `}>
                        {getTypeIcon(tx.type)}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{getTypeLabel(tx.type)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* 金额 */}
                      <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LilyWallet;
