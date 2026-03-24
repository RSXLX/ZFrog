/**
 * 🐸 宠物蛋系统 - 休息面板
 * 功能：让青蛙休息恢复活力值
 * - 夜间(22:00-06:00)自动休息，活力+30
 * - 休息期间属性衰减速度减半
 * - 休息中无法操作
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lifeFeatureApi } from '../../features/life/api';

interface RestPanelProps {
  frogId: number;
  ownerAddress: string;
  energy: number;
  isResting?: boolean;
  onRestChange?: () => void;
}

export function RestPanel({ 
  frogId, 
  ownerAddress, 
  energy, 
  isResting = false, 
  onRestChange 
}: RestPanelProps) {
  const [resting, setResting] = useState(isResting);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restInfo, setRestInfo] = useState<{
    canRest: boolean;
    isNightTime: boolean;
    estimatedRecovery: number;
    restingSince?: string;
  } | null>(null);

  // 检查是否为夜间时段
  const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  };

  // 获取休息状态
  const fetchRestStatus = async () => {
    try {
      const response: any = await lifeFeatureApi.getLegacyRestStatus(frogId);
      if (response.success) {
        setRestInfo(response.data);
        setResting(response.data.isResting);
      }
    } catch (err) {
      console.error('获取休息状态失败:', err);
    }
  };

  useEffect(() => {
    fetchRestStatus();
    // 每分钟检查一次
    const interval = setInterval(fetchRestStatus, 60000);
    return () => clearInterval(interval);
  }, [frogId]);

  // 开始休息
  const startRest = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response: any = await lifeFeatureApi.startLegacyRest(frogId);
      if (response.success) {
        setResting(true);
        onRestChange?.();
        fetchRestStatus();
      } else {
        setError(response.error || '无法开始休息');
      }
    } catch (err: any) {
      setError(err.message || '休息失败');
    } finally {
      setLoading(false);
    }
  };

  // 结束休息
  const endRest = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response: any = await lifeFeatureApi.endLegacyRest(frogId);
      if (response.success) {
        setResting(false);
        onRestChange?.();
        fetchRestStatus();
      } else {
        setError(response.error || '无法结束休息');
      }
    } catch (err: any) {
      setError(err.message || '唤醒失败');
    } finally {
      setLoading(false);
    }
  };

  const nightMode = isNightTime();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-4 rounded-2xl border-2
        ${resting 
          ? 'bg-gradient-to-br from-indigo-900 to-purple-900 border-indigo-700' 
          : nightMode
            ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
        }
        shadow-lg transition-all duration-500
      `}
    >
      <div className="flex items-center justify-between">
        {/* 左侧：状态指示 */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={resting ? { 
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-3xl"
          >
            {resting ? '💤' : nightMode ? '🌙' : '☀️'}
          </motion.div>
          
          <div>
            <div className={`font-medium ${resting || nightMode ? 'text-white' : 'text-gray-800'}`}>
              {resting ? '休息中...' : nightMode ? '夜间模式' : '活动状态'}
            </div>
            <div className={`text-xs ${resting || nightMode ? 'text-gray-300' : 'text-gray-500'}`}>
              {resting 
                ? '活力恢复中，属性衰减减半'
                : `活力值: ${energy}%`
              }
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div>
          {resting ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={endRest}
              disabled={loading}
              className={`
                px-4 py-2 rounded-xl font-medium text-sm
                bg-gradient-to-r from-amber-400 to-orange-400
                text-white shadow-lg
                hover:from-amber-500 hover:to-orange-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all
              `}
            >
              {loading ? '...' : '☀️ 唤醒'}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRest}
              disabled={loading || energy >= 100}
              className={`
                px-4 py-2 rounded-xl font-medium text-sm
                ${energy >= 100
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:from-indigo-600 hover:to-purple-600'
                }
                disabled:opacity-50 transition-all
              `}
            >
              {loading ? '...' : energy >= 100 ? '精力充沛' : '🛏️ 休息'}
            </motion.button>
          )}
        </div>
      </div>

      {/* 休息状态详情 */}
      <AnimatePresence>
        {resting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-indigo-700"
          >
            <div className="flex justify-between text-sm text-gray-300">
              <span>预计恢复</span>
              <span className="text-green-400">+{restInfo?.estimatedRecovery ?? 30} 活力</span>
            </div>
            
            {/* 夜间提示 */}
            {nightMode && (
              <div className="mt-2 text-xs text-indigo-300 text-center">
                🌙 夜间时段(22:00-06:00) 恢复效率更高
              </div>
            )}

            {/* Z动画 */}
            <div className="flex justify-center mt-3 gap-2">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    y: [0, -10, -20],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    delay: i * 0.3,
                  }}
                  className="text-2xl"
                >
                  z
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 p-2 bg-red-100 text-red-600 text-xs rounded-lg text-center"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}

export default RestPanel;
