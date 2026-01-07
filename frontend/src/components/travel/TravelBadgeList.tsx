/**
 * TravelBadge Component
 * 
 * Displays travel achievement badges earned from cross-chain exploration
 * Features:
 * - Badge grid with icons and rarity colors
 * - Progress indicator for total badges
 * - Animation on hover
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TravelBadge {
  id: number;
  badgeType: string;
  earnedAt: string;
  metadata?: {
    name: string;
    icon: string;
    description: string;
    rarity: number;
  };
}

interface BadgeStats {
  total: number;
  earned: number;
  progress: number;
  badges: string[];
}

interface TravelBadgeListProps {
  frogId: number;
  className?: string;
  showProgress?: boolean;
}

// Rarity colors
const rarityColors: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' },  // Common
  2: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' }, // Uncommon
  3: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },   // Rare
  4: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' }, // Epic
  5: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' }, // Legendary
};

const rarityNames: Record<number, string> = {
  1: '普通',
  2: '稀有',
  3: '精良',
  4: '史诗',
  5: '传说',
};

export function TravelBadgeList({ frogId, className = '', showProgress = true }: TravelBadgeListProps) {
  const [badges, setBadges] = useState<TravelBadge[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<TravelBadge | null>(null);

  useEffect(() => {
    fetchBadges();
  }, [frogId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      
      // Fetch badges
      const badgesRes = await fetch(`/api/badges/frog/${frogId}/travel`);
      const badgesData = await badgesRes.json();
      
      if (badgesData.success) {
        setBadges(badgesData.data || []);
      }
      
      // Fetch stats
      const statsRes = await fetch(`/api/badges/frog/${frogId}/stats`);
      const statsData = await statsRes.json();
      
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch badges:', error);
      setError('加载徽章失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="text-2xl"
          >
            🏆
          </motion.div>
          <span className="ml-2 text-gray-500">加载徽章...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20 ${className}`}>
        <div className="text-center py-4 text-red-500">
          <span className="text-3xl block mb-2">⚠️</span>
          {error}
        </div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className={`bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
          <span className="text-2xl mr-2">🏆</span>
          旅行徽章
        </h3>
        <div className="text-center py-4 text-gray-500">
          <span className="text-3xl block mb-2">🐸</span>
          还没有获得任何徽章
          <p className="text-xs mt-1">完成跨链旅行即可解锁!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="text-2xl mr-2">🏆</span>
          旅行徽章
        </h3>
        {showProgress && stats && (
          <span className="text-sm text-gray-500">
            {stats.earned}/{stats.total} ({stats.progress}%)
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && stats && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
            />
          </div>
        </div>
      )}

      {/* Badge Grid */}
      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge, index) => {
          const rarity = badge.metadata?.rarity || 1;
          const colors = rarityColors[rarity] || rarityColors[1];
          
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedBadge(badge)}
              className={`cursor-pointer rounded-lg p-3 border-2 ${colors.bg} ${colors.border} text-center transition-shadow hover:shadow-md`}
            >
              <div className="text-3xl mb-1">{badge.metadata?.icon || '🏅'}</div>
              <p className={`text-xs font-medium ${colors.text} truncate`}>
                {badge.metadata?.name || badge.badgeType}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {rarityNames[rarity]}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedBadge(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4">{selectedBadge.metadata?.icon || '🏅'}</div>
            <h4 className="text-xl font-bold text-gray-800 mb-2">
              {selectedBadge.metadata?.name || selectedBadge.badgeType}
            </h4>
            <p className="text-gray-600 mb-4">
              {selectedBadge.metadata?.description || '跨链旅行成就'}
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className={`px-2 py-1 rounded ${rarityColors[selectedBadge.metadata?.rarity || 1].bg}`}>
                {rarityNames[selectedBadge.metadata?.rarity || 1]}
              </span>
              <span className="text-gray-400">
                获得于 {new Date(selectedBadge.earnedAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
            >
              关闭
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
