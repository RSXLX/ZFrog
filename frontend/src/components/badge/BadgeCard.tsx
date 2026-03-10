import { motion } from 'framer-motion';
import { Award, Lock, Unlock, Star, Trophy, Zap, Flame, Droplets, Wind, Mountain, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import { ScaleOnHover } from '../common/animations/FadeIn';
import type { Badge, BadgeRarity, BadgeCategory } from '../../types';

interface BadgeCardProps {
  badge: Badge;
  index?: number;
  owned?: boolean;
  progress?: number;
  onClaim?: (badge: Badge) => void;
  onViewDetails?: (badge: Badge) => void;
}

const rarityConfig: Record<BadgeRarity, { color: string; gradient: string; icon: typeof Star }> = {
  common: {
    color: 'text-gray-600',
    gradient: 'from-gray-100 to-gray-200',
    icon: Star,
  },
  uncommon: {
    color: 'text-green-600',
    gradient: 'from-green-100 to-emerald-200',
    icon: Sparkles,
  },
  rare: {
    color: 'text-blue-600',
    gradient: 'from-blue-100 to-indigo-200',
    icon: Zap,
  },
  epic: {
    color: 'text-purple-600',
    gradient: 'from-purple-100 to-pink-200',
    icon: Flame,
  },
  legendary: {
    color: 'text-amber-600',
    gradient: 'from-amber-100 to-orange-200',
    icon: Trophy,
  },
};

const categoryIcons: Record<BadgeCategory, typeof Award> = {
  travel: Mountain,
  social: Users,
  achievement: Award,
  collection: Star,
  special: Sparkles,
  event: Flame,
};

import { Users } from 'lucide-react';

export function BadgeCard({
  badge,
  index = 0,
  owned = false,
  progress = 0,
  onClaim,
  onViewDetails,
}: BadgeCardProps) {
  const rarity = rarityConfig[badge.rarity || 'common'];
  const CategoryIcon = categoryIcons[badge.category || 'achievement'];
  const RarityIcon = rarity.icon;

  const isLocked = !owned && progress < (badge.requirement?.value || 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group"
    >
      <ScaleOnHover scale={isLocked ? 1 : 1.03}>
        <div
          className={`relative bg-white rounded-2xl shadow-md overflow-hidden border-2 transition-all duration-300 ${
            owned
              ? 'border-transparent shadow-lg'
              : isLocked
              ? 'border-gray-200 opacity-75'
              : 'border-gray-200 hover:border-green-300'
          }`}
        >
          {/* Rarity Gradient Background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${rarity.gradient} ${
              owned ? 'opacity-30' : 'opacity-10'
            }`}
          />

          {/* Header */}
          <div className="relative p-4 flex items-start gap-4">
            {/* Icon */}
            <div
              className={`relative w-16 h-16 rounded-xl flex items-center justify-center shadow-md ${
                owned
                  ? `bg-gradient-to-br ${rarity.gradient}`
                  : 'bg-gray-100'
              }`}
            >
              {isLocked ? (
                <Lock className="w-8 h-8 text-gray-400" />
              ) : (
                <span className="text-3xl">{badge.icon || '🏆'}</span>
              )}

              {/* Rarity Badge */}
              <div
                className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                  owned ? 'bg-white' : 'bg-gray-100'
                }`}
              >
                <RarityIcon className={`w-3.5 h-3.5 ${rarity.color}`} />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900 truncate">{badge.name}</h3>
                {owned && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    已获得
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{badge.description}</p>
            </div>
          </div>

          {/* Progress Bar (if not owned) */}
          {!owned && badge.requirement && (
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>进度</span>
                <span>
                  {progress} / {badge.requirement.value}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((progress / badge.requirement.value) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 pb-4">
            {owned ? (
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => onViewDetails?.(badge)}
              >
                查看详情
              </Button>
            ) : isLocked ? (
              <Button variant="ghost" size="sm" fullWidth disabled>
                未解锁
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => onClaim?.(badge)}
              >
                领取徽章
              </Button>
            )}
          </div>
        </div>
      </ScaleOnHover>
    </motion.div>
  );
}
