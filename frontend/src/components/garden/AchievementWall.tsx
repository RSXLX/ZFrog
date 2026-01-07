/**
 * AchievementWall - 成就墙组件
 * 
 * 功能:
 * - 显示成就进度
 * - 成就徽章展示
 * - SBT 铸造
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'TRAVEL' | 'SOCIAL' | 'COLLECTION' | 'DECORATION';
  rarity: number;
  isSbt: boolean;
}

export interface EarnedAchievement {
  id: string;
  earnedAt: string;
  sbtTokenId?: string;
  achievement: Achievement;
}

interface AchievementProgress {
  total: number;
  earned: number;
  percentage: number;
}

interface AchievementWallProps {
  frogId: number;
  isOwner: boolean;
  onClose: () => void;
}

const CATEGORY_INFO: Record<string, { label: string; color: string; icon: string }> = {
  TRAVEL: { label: '旅行', color: 'from-blue-400 to-cyan-400', icon: '✈️' },
  SOCIAL: { label: '社交', color: 'from-pink-400 to-rose-400', icon: '💬' },
  COLLECTION: { label: '收藏', color: 'from-amber-400 to-orange-400', icon: '🎁' },
  DECORATION: { label: '装饰', color: 'from-green-400 to-emerald-400', icon: '🏠' },
};

const RARITY_COLORS = [
  'bg-gray-400',
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
];

export const AchievementWall: React.FC<AchievementWallProps> = ({
  frogId,
  isOwner,
  onClose,
}) => {
  const [earned, setEarned] = useState<EarnedAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress>({ total: 0, earned: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | EarnedAchievement | null>(null);

  // 加载成就
  useEffect(() => {
    loadAchievements();
  }, [frogId]);

  const loadAchievements = async () => {
    try {
      const [frogResponse, allResponse] = await Promise.all([
        apiService.get(`/homestead/${frogId}/achievements`),
        apiService.get('/homestead/achievements'),
      ]);

      if (frogResponse.success) {
        setEarned(frogResponse.data?.earned || []);
        setProgress(frogResponse.data?.progress || { total: 0, earned: 0, percentage: 0 });
      }

      if (allResponse.success) {
        setAllAchievements(allResponse.data || []);
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查成就是否已获得
  const isEarned = (achievementId: string) =>
    earned.some((e) => e.achievement.id === achievementId);

  // 获取已获得成就信息
  const getEarnedInfo = (achievementId: string) =>
    earned.find((e) => e.achievement.id === achievementId);

  // 按类别筛选
  const filteredAchievements = selectedCategory
    ? allAchievements.filter((a) => a.category === selectedCategory)
    : allAchievements;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg 
                   max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b 
                        dark:border-gray-700 bg-gradient-to-r from-yellow-400 to-amber-400">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🏆 成就墙
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* 进度条 */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">完成进度</span>
            <span className="text-amber-500 font-bold">
              {progress.earned}/{progress.total}
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
          <div className="text-right text-sm text-gray-400 mt-1">
            {progress.percentage}%
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            全部
          </button>
          {Object.entries(CATEGORY_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all 
                         flex items-center gap-1 ${
                           selectedCategory === key
                             ? `bg-gradient-to-r ${info.color} text-white`
                             : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                         }`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </button>
          ))}
        </div>

        {/* 成就网格 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">加载中...</div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredAchievements.map((achievement) => {
                const earnedInfo = getEarnedInfo(achievement.id);
                const hasEarned = !!earnedInfo;

                return (
                  <motion.div
                    key={achievement.id}
                    className={`relative aspect-square rounded-xl flex flex-col 
                               items-center justify-center cursor-pointer transition-all ${
                                 hasEarned
                                   ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30'
                                   : 'bg-gray-100 dark:bg-gray-700 grayscale opacity-50'
                               }`}
                    onClick={() => setSelectedAchievement(earnedInfo || achievement)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* 徽章图标 */}
                    <span className="text-3xl mb-1">{achievement.icon}</span>
                    
                    {/* 稀有度指示 */}
                    <div className={`w-2 h-2 rounded-full ${RARITY_COLORS[achievement.rarity - 1]}`} />
                    
                    {/* SBT 标记 */}
                    {achievement.isSbt && hasEarned && (
                      <div className="absolute top-1 right-1 text-xs">⛓️</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* 成就详情弹窗 */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4"
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-xs w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 徽章 */}
              <motion.div
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-yellow-200 
                           dark:from-amber-900/50 dark:to-yellow-900/50 rounded-full 
                           flex items-center justify-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-4xl">
                  {'achievement' in selectedAchievement
                    ? selectedAchievement.achievement.icon
                    : selectedAchievement.icon}
                </span>
              </motion.div>

              {/* 名称 */}
              <h3 className="text-xl font-bold mb-2">
                {'achievement' in selectedAchievement
                  ? selectedAchievement.achievement.name
                  : selectedAchievement.name}
              </h3>

              {/* 描述 */}
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                {'achievement' in selectedAchievement
                  ? selectedAchievement.achievement.description
                  : selectedAchievement.description}
              </p>

              {/* 稀有度 */}
              <div className="flex items-center justify-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${
                      i < ('achievement' in selectedAchievement
                        ? selectedAchievement.achievement.rarity
                        : selectedAchievement.rarity)
                        ? 'text-amber-400'
                        : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* 获得信息 */}
              {'earnedAt' in selectedAchievement && (
                <div className="text-sm text-gray-400 mb-4">
                  获得于 {new Date(selectedAchievement.earnedAt).toLocaleDateString('zh-CN')}
                </div>
              )}

              {/* SBT 信息/铸造按钮 */}
              {'sbtTokenId' in selectedAchievement && selectedAchievement.sbtTokenId ? (
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-sm">
                  ⛓️ SBT Token #{selectedAchievement.sbtTokenId}
                </div>
              ) : (
                'achievement' in selectedAchievement &&
                selectedAchievement.achievement.isSbt &&
                isOwner && (
                  <button
                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 
                               text-white rounded-full font-medium hover:opacity-90"
                    onClick={() => alert('SBT 铸造功能即将上线')}
                  >
                    铸造为 SBT ⛓️
                  </button>
                )
              )}

              {/* 关闭按钮 */}
              <button
                onClick={() => setSelectedAchievement(null)}
                className="mt-4 text-gray-400 hover:text-gray-600"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AchievementWall;
