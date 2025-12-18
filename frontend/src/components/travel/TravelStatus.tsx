import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TravelStatusProps {
  frogName: string;
  startTime: Date;
  endTime: Date;
  targetWallet: string;
}

export function TravelStatus({ frogName, startTime, endTime, targetWallet }: TravelStatusProps) {
  const [progress, setProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState('');
  
  useEffect(() => {
    const updateProgress = () => {
      const now = Date.now();
      const start = startTime.getTime();
      const end = endTime.getTime();
      
      const elapsed = now - start;
      const total = end - start;
      const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
      
      setProgress(percent);
      
      // 计算剩余时间
      const remaining = Math.max(0, end - now);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setRemainingTime(`${hours}小时 ${minutes}分钟`);
      } else if (minutes > 0) {
        setRemainingTime(`${minutes}分钟 ${seconds}秒`);
      } else {
        setRemainingTime(`${seconds}秒`);
      }
    };
    
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, endTime]);
  
  // 根据进度获取状态文案
  const getStatusMessage = () => {
    if (progress >= 100) return '正在生成旅行日记...';
    if (progress < 20) return '正在穿越虫洞...';
    if (progress < 40) return '到达目的地，开始观察...';
    if (progress < 60) return '发现了有趣的东西！';
    if (progress < 80) return '正在记录旅行日记...';
    if (progress < 95) return '准备返程...';
    return '即将到家！';
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-blue-800">
          ✈️ {frogName} 旅行中
        </h3>
        <span className="text-sm text-blue-600">
          剩余: {remainingTime}
        </span>
      </div>
      
      {/* 进度条 */}
      <div className="mb-4">
        <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-blue-600">
          <span>出发</span>
          <span>{Math.round(progress)}%</span>
          <span>返回</span>
        </div>
      </div>
      
      {/* 状态信息 */}
      <div className="text-center py-4">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-4xl mb-2"
        >
          🐸
        </motion.div>
        <p className="text-blue-700 font-medium">
          {getStatusMessage()}
        </p>
      </div>
      
      {/* 目标地址 */}
      <div className="mt-4 p-3 bg-white/50 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">观察目标</p>
        <p className="text-sm font-mono text-gray-700 truncate">
          {targetWallet}
        </p>
      </div>
    </motion.div>
  );
}
