import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useChainMonitor } from '../../hooks/useChainMonitor';
import { ChainEvent } from '../../types/frogAnimation';

// 简单的时间格式化函数
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天前`;
  }
  
  if (hours > 0) {
    return `${hours}小时前`;
  }
  
  if (minutes > 0) {
    return `${minutes}分钟前`;
  }
  
  return '刚刚';
}

export function ChainEventPanel() {
  const { events, gasPrice, isConnected, refresh, clearAlerts } = useChainMonitor();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  
  const eventIcons: Record<string, string> = {
    large_buy: '🟢',
    large_sell: '🔴',
    whale_transfer: '🐋',
    new_listing: '🆕',
    price_change: '📊',
  };
  
  const eventLabels: Record<string, string> = {
    large_buy: '大单买入',
    large_sell: '大单卖出',
    whale_transfer: '鲸鱼转账',
    new_listing: '新项目',
    price_change: '价格变动',
  };
  
  const eventColors: Record<string, string> = {
    large_buy: 'border-green-200 bg-green-50',
    large_sell: 'border-red-200 bg-red-50',
    whale_transfer: 'border-blue-200 bg-blue-50',
    new_listing: 'border-purple-200 bg-purple-50',
    price_change: 'border-yellow-200 bg-yellow-50',
  };
  
  // 过滤事件
  const filteredEvents = events.filter(event => 
    filter === 'all' || event.type === filter
  );
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`fixed right-4 top-20 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden z-40 ${
        isExpanded ? 'w-96' : 'w-80'
      } transition-all duration-300`}
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            ⛓️ 链上监控
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-400'} animate-pulse`} />
          </h3>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ rotate: 180 }}
              onClick={refresh}
              className="text-white/80 hover:text-white transition-colors"
              title="刷新"
            >
              🔄
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white/80 hover:text-white transition-colors"
            >
              {isExpanded ? '🗕' : '🗖'}
            </motion.button>
          </div>
        </div>
        
        {/* Gas 价格 */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-white/80">⛽ Gas:</span>
          <span className="text-sm font-bold text-white">
            {Number(gasPrice / BigInt(1e9)).toFixed(1)} Gwei
          </span>
        </div>
        
        {/* 连接状态 */}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-white/70">状态:</span>
          <span className={`text-xs font-medium ${
            isConnected ? 'text-green-200' : 'text-red-200'
          }`}>
            {isConnected ? '已连接' : '连接中...'}
          </span>
        </div>
      </div>
      
      {/* 过滤器 */}
      {isExpanded && (
        <div className="p-3 border-b border-gray-200">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {Object.keys(eventIcons).map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                  filter === type 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{eventIcons[type]}</span>
                <span>{eventLabels[type]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* 事件列表 */}
      <div className={`${isExpanded ? 'max-h-96' : 'max-h-80'} overflow-y-auto`}>
        <AnimatePresence>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl mb-2"
              >
                🐸
              </motion.div>
              <p className="text-gray-400">暂无事件</p>
              <p className="text-xs text-gray-400">青蛙正在监控中...</p>
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <motion.div
                key={`${event.timestamp}-${index}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`border-l-4 ${eventColors[event.type]} p-3 hover:shadow-md transition-all cursor-pointer`}
                onClick={() => {
                  // 点击事件可以查看详情
                  if (event.txHash) {
                    window.open(`https://etherscan.io/tx/${event.txHash}`, '_blank');
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <motion.span
                    className="text-xl flex-shrink-0"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {eventIcons[event.type]}
                  </motion.span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">
                        {eventLabels[event.type]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {event.type === 'price_change' 
                        ? `${event.token} ${event.value > 0 ? '📈' : '📉'} ${Math.abs(event.value).toFixed(2)}%`
                        : `${formatValue(event.value)} ${event.token}`
                      }
                    </p>
                    {event.from && event.to && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {event.from.slice(0, 6)}... → {event.to.slice(0, 6)}...
                        </span>
                      </div>
                    )}
                    {event.txHash && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {event.txHash.slice(0, 10)}...{event.txHash.slice(-8)}
                        </span>
                        <span className="text-xs text-green-600 hover:underline">
                          查看交易 ↗
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* 底部操作 */}
      {events.length > 0 && (
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              显示最近 {filteredEvents.length} 条事件
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearAlerts}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              清除警报
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// 鲸鱼警报组件
export function WhaleAlert({ alert, onClose }: { 
  alert: any;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.8 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl p-4 z-50 min-w-[300px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.span
            className="text-2xl"
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 1, repeat: 2 }}
          >
            🐋
          </motion.span>
          <span className="font-bold text-lg">鲸鱼警报！</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-blue-100">方向:</span>
          <span className={`font-medium ${
            alert.direction === 'in' ? 'text-green-200' : 'text-red-200'
          }`}>
            {alert.direction === 'in' ? '买入 📈' : '卖出 📉'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-blue-100">金额:</span>
          <span className="font-bold text-lg">
            {formatValue(alert.amount)} {alert.token}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-blue-100">地址:</span>
          <span className="text-sm font-mono">
            {alert.address.slice(0, 8)}...{alert.address.slice(-6)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// 价格变化警报组件
export function PriceAlert({ change, token, onClose }: {
  change: number;
  token: string;
  onClose: () => void;
}) {
  const isPositive = change > 0;
  const isLargeChange = Math.abs(change) >= 20;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      className={`fixed top-20 right-80 text-white rounded-2xl shadow-xl p-4 z-50 min-w-[250px] ${
        isPositive 
          ? 'bg-gradient-to-r from-green-500 to-green-600' 
          : 'bg-gradient-to-r from-red-500 to-red-600'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.span
            className="text-2xl"
            animate={{ 
              scale: isLargeChange ? [1, 1.3, 1] : [1, 1.1, 1],
              rotate: isPositive ? [0, -10, 0] : [0, 10, 0]
            }}
            transition={{ duration: 0.5, repeat: isLargeChange ? 3 : 1 }}
          >
            {isPositive ? '📈' : '📉'}
          </motion.span>
          <span className="font-bold">
            {isLargeChange ? '剧烈' : ''}价格变动！
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="text-center">
        <div className={`text-2xl font-bold mb-1 ${
          isPositive ? 'text-green-200' : 'text-red-200'
        }`}>
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </div>
        <div className="text-sm opacity-90">
          {token}
        </div>
      </div>
    </motion.div>
  );
}

// 辅助函数
function formatValue(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}