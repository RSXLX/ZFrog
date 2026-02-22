/**
 * 🐸 宠物蛋系统 - 状态面板组件 (UI/UX PROMAX 优化版)
 * 设计风格: Claymorphism (黏土风格)
 * 特点: 柔和阴影、圆润元素、流畅过渡、可爱配色
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogNurture, useLilyBalance, useFrogNurtureActions, NURTURE_STATUS_CONFIG } from '../../hooks/useFrogNurture';

// SVG 图标组件
const Icons = {
  Food: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <path d="M6 1v3M10 1v3M14 1v3" />
    </svg>
  ),
  Clean: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
  Heal: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19.428 15.42a8 8 0 1 1-11.315-11.315" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  Heart: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  Lily: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.24 2 7 4.24 7 7c0 1.77.93 3.31 2.32 4.19C6.44 12.03 4.5 14.61 4.5 17.5c0 .28.02.55.05.82C5.5 21.16 8.5 23 12 23s6.5-1.84 7.45-4.68c.03-.27.05-.54.05-.82 0-2.89-1.94-5.47-4.82-6.31C16.07 10.31 17 8.77 17 7c0-2.76-2.24-5-5-5z" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-9-9c4.52 0 8.18 3.25 8.91 7.5" />
      <path d="M21 3v6h-6" />
    </svg>
  ),
};

interface StatusPanelProps {
  frogId: number;
  ownerAddress: string;
  onStatusChange?: () => void;
}

// Claymorphism 样式常量
const clayStyles = {
  card: `
    bg-gradient-to-br from-white to-gray-50
    rounded-3xl
    shadow-[8px_8px_16px_rgba(163,177,198,0.6),-8px_-8px_16px_rgba(255,255,255,0.8)]
    border border-white/50
  `,
  cardInner: `
    bg-gradient-to-br from-gray-50 to-gray-100
    rounded-2xl
    shadow-inner
  `,
  button: `
    bg-gradient-to-br from-white to-gray-100
    rounded-2xl
    shadow-[4px_4px_8px_rgba(163,177,198,0.5),-4px_-4px_8px_rgba(255,255,255,0.8)]
    hover:shadow-[2px_2px_4px_rgba(163,177,198,0.5),-2px_-2px_4px_rgba(255,255,255,0.8)]
    active:shadow-inner
    transition-all duration-200 ease-out
    cursor-pointer
  `,
  buttonActive: `
    bg-gradient-to-br from-gray-100 to-gray-200
    shadow-inner
  `,
};

// 状态颜色配置
const statusColors = {
  hunger: { gradient: 'from-orange-400 to-amber-500', bg: 'bg-orange-100', text: 'text-orange-600' },
  happiness: { gradient: 'from-pink-400 to-rose-500', bg: 'bg-pink-100', text: 'text-pink-600' },
  cleanliness: { gradient: 'from-cyan-400 to-teal-500', bg: 'bg-cyan-100', text: 'text-cyan-600' },
  health: { gradient: 'from-red-400 to-rose-500', bg: 'bg-red-100', text: 'text-red-600' },
  energy: { gradient: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-100', text: 'text-yellow-600' },
};

// 状态进度条组件 (Claymorphism)
function StatusBar({ 
  value, 
  label, 
  icon, 
  warningLine, 
  dangerLine,
  statusKey,
}: { 
  value: number; 
  label: string; 
  icon: string;
  warningLine: number;
  dangerLine: number;
  statusKey: string;
}) {
  const isDanger = value <= dangerLine;
  const isWarning = value <= warningLine && !isDanger;
  const colors = statusColors[statusKey as keyof typeof statusColors] || statusColors.hunger;

  return (
    <motion.div 
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 图标 */}
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center text-lg
        ${colors.bg} ${colors.text}
        shadow-[2px_2px_4px_rgba(163,177,198,0.3),-2px_-2px_4px_rgba(255,255,255,0.5)]
      `}>
        {icon}
      </div>
      
      {/* 进度条区域 */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <motion.span 
            className={`text-sm font-bold ${
              isDanger ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-gray-700'
            }`}
            key={Math.round(value)}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {Math.round(value)}
          </motion.span>
        </div>
        
        {/* 进度条容器 */}
        <div className="h-3 rounded-full bg-gray-200 shadow-inner overflow-hidden">
          <motion.div 
            className={`h-full rounded-full bg-gradient-to-r ${colors.gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
      
      {/* 警告图标 */}
      <AnimatePresence>
        {isDanger && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="text-red-500"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Icons.Warning />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 快速操作按钮 (Claymorphism)
function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  loading,
  badge,
  color = 'gray',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  badge?: string | number;
  color?: 'gray' | 'green' | 'orange' | 'red' | 'purple';
}) {
  const colorStyles = {
    gray: 'text-gray-600 hover:text-gray-800',
    green: 'text-emerald-600 hover:text-emerald-700',
    orange: 'text-orange-600 hover:text-orange-700',
    red: 'text-red-600 hover:text-red-700',
    purple: 'text-purple-600 hover:text-purple-700',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative flex flex-col items-center gap-2 p-4 rounded-2xl
        ${disabled 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
          : `${clayStyles.button} ${colorStyles[color]}`
        }
      `}
    >
      {loading ? (
        <motion.div
          className="w-6 h-6 border-2 border-gray-300 border-t-current rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        icon
      )}
      <span className="text-xs font-medium">{label}</span>
      
      {/* 徽章 */}
      {badge && (
        <motion.span 
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] shadow-md"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          {badge}
        </motion.span>
      )}
    </motion.button>
  );
}

// 食物选择菜单
function FoodMenu({
  isOpen,
  onClose,
  onSelect,
  balance,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'BREAD' | 'BUG_BENTO' | 'CAKE') => void;
  balance: number;
}) {
  const foods = [
    { type: 'BREAD' as const, icon: '🍞', name: '面包', price: 10, effect: '饱食度+15', color: 'from-amber-400 to-orange-500' },
    { type: 'BUG_BENTO' as const, icon: '🍱', name: '虫子便当', price: 25, effect: '饱食度+25, 活力+5', color: 'from-green-400 to-emerald-500' },
    { type: 'CAKE' as const, icon: '🎂', name: '蛋糕', price: 15, effect: '幸福度+20', color: 'from-pink-400 to-rose-500' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* 菜单面板 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`
              absolute bottom-full left-1/2 -translate-x-1/2 mb-3
              ${clayStyles.card} p-4 z-50 min-w-[280px]
            `}
          >
            {/* 箭头 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
            
            <h4 className="text-sm font-bold text-gray-700 mb-3">选择食物</h4>
            
            <div className="space-y-2">
              {foods.map((food) => {
                const canAfford = balance >= food.price;
                return (
                  <motion.button
                    key={food.type}
                    whileHover={{ scale: canAfford ? 1.02 : 1 }}
                    whileTap={{ scale: canAfford ? 0.98 : 1 }}
                    onClick={() => canAfford && onSelect(food.type)}
                    disabled={!canAfford}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-xl
                      ${canAfford 
                        ? 'bg-white hover:bg-gray-50 cursor-pointer shadow-sm hover:shadow-md' 
                        : 'bg-gray-100 opacity-50 cursor-not-allowed'
                      }
                      transition-all duration-200
                    `}
                  >
                    {/* 食物图标 */}
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center text-xl
                      bg-gradient-to-br ${food.color} text-white shadow-md
                    `}>
                      {food.icon}
                    </div>
                    
                    {/* 信息 */}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-800">{food.name}</div>
                      <div className="text-xs text-gray-500">{food.effect}</div>
                    </div>
                    
                    {/* 价格 */}
                    <div className={`
                      flex items-center gap-1 px-2 py-1 rounded-lg
                      ${canAfford ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'}
                    `}>
                      <Icons.Lily />
                      <span className="font-bold text-sm">{food.price}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// 主组件
export function StatusPanel({ frogId, ownerAddress, onStatusChange }: StatusPanelProps) {
  const { status, loading, error, refresh } = useFrogNurture(frogId);
  const { balance, refresh: refreshBalance } = useLilyBalance(ownerAddress);
  const { actionLoading, feed, clean, playGuess, heal } = useFrogNurtureActions(frogId);
  
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 相对时间格式化
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffSec < 10) return '刚刚';
    if (diffSec < 60) return `${diffSec}秒前`;
    if (diffMin < 60) return `${diffMin}分钟前`;
    return `${diffHour}小时前`;
  };

  // 刷新并更新时间戳
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refresh(), refreshBalance()]);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  // 处理操作结果
  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      await action();
      setMessage({ type: 'success', text: successMsg });
      await Promise.all([refresh(), refreshBalance()]);
      setLastUpdated(new Date());
      onStatusChange?.();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 处理喂食
  const handleFeed = (foodType: 'BREAD' | 'BUG_BENTO' | 'CAKE') => {
    setShowFeedMenu(false);
    const foodNames = { BREAD: '面包', BUG_BENTO: '虫子便当', CAKE: '蛋糕' };
    handleAction(() => feed(foodType), `喂了${foodNames[foodType]}！`);
  };

  // Loading 状态
  if (loading && !status) {
    return (
      <div className={`${clayStyles.card} p-6`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded-full w-1/3" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={`${clayStyles.card} p-6`}>
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-3">😢</div>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={refresh}
            className={`${clayStyles.button} px-4 py-2 text-sm font-medium`}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <motion.div 
      className={clayStyles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 消息提示 */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              mx-4 mt-4 px-4 py-2 rounded-xl text-center text-sm font-medium
              ${message.type === 'success' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
              }
            `}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 标题栏 */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="text-2xl">🐸</div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">青蛙状态</h3>
            <p className="text-xs text-gray-400">上次更新: {formatRelativeTime(lastUpdated)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* $LILY 余额 */}
          <div className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-xl
            bg-purple-100 text-purple-700
            shadow-inner
          `}>
            <Icons.Lily />
            <span className="font-bold">{balance?.balance || 0}</span>
          </div>
          
          {/* 刷新按钮 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-xl transition-colors ${isRefreshing ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
            >
              <Icons.Refresh />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* 状态指示器 */}
      {(status.isSick || status.needsClean) && (
        <div className="flex gap-2 mx-4 mb-2">
          {status.isSick && (
            <motion.div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-600 text-sm font-medium"
              animate={{ x: [0, -2, 2, 0] }}
              transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 2 }}
            >
              <span>😷</span> 生病了！
            </motion.div>
          )}
          {status.needsClean && (
            <motion.div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-600 text-sm font-medium"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <span>💩</span> 需要清洁
            </motion.div>
          )}
        </div>
      )}

      {/* 状态条 */}
      <div className={`${clayStyles.cardInner} mx-4 p-3 space-y-2`}>
        {Object.entries(NURTURE_STATUS_CONFIG).map(([key, config], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StatusBar
              value={status[key as keyof typeof status] as number}
              label={config.label}
              icon={config.icon}
              warningLine={config.warningLine}
              dangerLine={config.dangerLine}
              statusKey={key}
            />
          </motion.div>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-3 relative">
          {/* 喂食 */}
          <div className="relative">
            <ActionButton
              icon={<Icons.Food />}
              label="喂食"
              onClick={() => setShowFeedMenu(!showFeedMenu)}
              loading={actionLoading === 'feed'}
              color="orange"
            />
            <FoodMenu
              isOpen={showFeedMenu}
              onClose={() => setShowFeedMenu(false)}
              onSelect={handleFeed}
              balance={balance?.balance || 0}
            />
          </div>
          
          {/* 清洁 */}
          <ActionButton
            icon={<Icons.Clean />}
            label="清洁"
            onClick={() => handleAction(clean, '清洁完成！+10 🪷')}
            loading={actionLoading === 'clean'}
            badge={status.needsClean ? '!' : undefined}
            color="green"
          />
          
          {/* 玩耍 */}
          <ActionButton
            icon={<Icons.Play />}
            label="玩耍"
            onClick={() => {
              const guess = Math.random() < 0.5 ? 'left' : 'right';
              handleAction(() => playGuess(guess as 'left' | 'right'), '开心玩耍！');
            }}
            loading={actionLoading === 'play'}
            color="purple"
          />
          
          {/* 治疗 */}
          <ActionButton
            icon={<Icons.Heal />}
            label="治疗"
            onClick={() => handleAction(heal, '治疗成功！')}
            loading={actionLoading === 'heal'}
            disabled={!status.isSick && status.health > 40}
            color="red"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default StatusPanel;
