// frontend/src/components/badge/BadgeDisplay.tsx

import { motion } from 'framer-motion';
import type { TravelBadge } from '../../types';

interface BadgeDisplayProps {
  badges: TravelBadge[];
}

const rarityColors: Record<number, string> = {
  1: 'bg-gray-100 border-gray-300',
  2: 'bg-green-100 border-green-300',
  3: 'bg-blue-100 border-blue-300',
  4: 'bg-purple-100 border-purple-300',
  5: 'bg-yellow-100 border-yellow-300',
};

export function BadgeDisplay({ badges }: BadgeDisplayProps) {
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);

  return (
    <div className="space-y-6">
      {/* 已解锁徽章 */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          🏆 已解锁徽章 ({unlockedBadges.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {unlockedBadges.map((badge) => (
            <motion.div
              key={badge.id}
              whileHover={{ scale: 1.05 }}
              className={`p-4 rounded-xl border-2 ${rarityColors[badge.rarity] || rarityColors[1]} shadow-sm`}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">{badge.icon}</div>
                <h4 className="font-bold text-gray-800 text-sm">{badge.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                {badge.unlockedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(badge.unlockedAt).toLocaleDateString('zh-CN')}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 未解锁徽章 */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            🔒 未解锁徽章 ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedBadges.map((badge) => (
              <div
                key={badge.id}
                className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 opacity-60"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
                  <h4 className="font-bold text-gray-600 text-sm">{badge.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
