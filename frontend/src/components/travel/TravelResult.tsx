// frontend/src/components/travel/TravelResult.tsx

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Travel, SouvenirP0, Discovery, DiaryMood, UserBadge } from '../../types';

interface TravelResultProps {
  travel: Travel;
  frogName: string;
  discoveries?: Discovery[];
  souvenir?: SouvenirP0;
  diary?: string;
  diaryMood?: DiaryMood;
  newBadges?: UserBadge[];
}

const moodEmojis: Record<DiaryMood, string> = {
  HAPPY: '😊',
  CURIOUS: '🤔',
  SURPRISED: '😲',
  PEACEFUL: '😌',
  EXCITED: '🤩',
  SLEEPY: '😴',
};

import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

export function TravelResult({
  travel,
  frogName,
  discoveries = [],
  souvenir,
  diary,
  diaryMood = 'HAPPY',
  newBadges = [],
}: TravelResultProps) {
  const [souvenirImageUrl, setSouvenirImageUrl] = useState<string | undefined>();

  useEffect(() => {
    // 优先使用传入的 souvenir 对象查找，如果是 P0 则使用 ID 拼接
    const sId = (travel?.souvenir as any)?.tokenId || 
                (souvenir as any)?.tokenId || 
                ((travel as any)?.souvenirData ? `p0-${travel.id}` : null);
    
    if (sId) {
      apiService.getSouvenirImageStatus(sId.toString())
        .then(res => {
          if (res.success && res.record) {
            setSouvenirImageUrl(res.record.gatewayUrl || res.record.imageUrl);
          }
        })
        .catch(() => {});
    }
  }, [travel, souvenir]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">🐸 {frogName} 回来啦！</h2>
        <p className="text-gray-600 mt-2">
          {travel.completedAt && formatDistanceToNow(new Date(travel.completedAt), { addSuffix: true, locale: zhCN })}
        </p>
      </div>

      {/* 旅行日记 */}
      {diary && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">📖 旅行日记</h3>
            <span className="text-3xl">{moodEmojis[diaryMood]}</span>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{diary}</p>
        </div>
      )}

      {/* 发现 */}
      {discoveries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">✨ 旅途发现</h3>
          <div className="space-y-3">
            {discoveries.map((discovery, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {'⭐'.repeat(discovery.rarity)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{discovery.title}</h4>
                  <p className="text-sm text-gray-600">{discovery.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 纪念品 */}
      {souvenir && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-lg p-6 border border-yellow-100">
          <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center">
            <span className="mr-2">🎁</span> 带回的纪念品
          </h3>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-4xl shadow-inner border border-yellow-200 overflow-hidden">
              {souvenirImageUrl ? (
                <img src={souvenirImageUrl} alt={souvenir.name} className="w-full h-full object-cover" />
              ) : (
                souvenir.emoji
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800">{souvenir.name}</h4>
              <p className="text-sm text-gray-600">{souvenir.description}</p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full font-semibold">
                  {'⭐'.repeat(souvenir.rarity)}
                </span>
                <span className="text-xs text-gray-500">来自 {souvenir.chainOrigin}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新解锁徽章 */}
      {newBadges.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border border-purple-100">
          <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center">
            <span className="mr-2">🏆</span> 解锁新徽章！
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {newBadges.map((userBadge) => (
              <div key={userBadge.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                <span className="text-2xl">{userBadge.badge?.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">{userBadge.badge?.name}</h4>
                  <p className="text-xs text-gray-600">{userBadge.badge?.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
