// frontend/src/components/travel/TravelResult.tsx

import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Travel, SouvenirP0, Discovery, DiaryMood, UserBadge } from '../../types';
import { travelFeatureApi } from '../../features/travel/api';
import type { MemoryPalaceLite } from '../../features/memory-palace/api';

interface TravelResultProps {
  travel: Travel;
  frogName: string;
  discoveries?: Discovery[];
  souvenir?: SouvenirP0;
  diary?: string;
  diaryMood?: DiaryMood;
  newBadges?: UserBadge[];
  memoryPalace?: MemoryPalaceLite | null;
}

const moodEmojis: Record<DiaryMood, string> = {
  HAPPY: '😊',
  CURIOUS: '🤔',
  SURPRISED: '😲',
  PEACEFUL: '😌',
  EXCITED: '🤩',
  SLEEPY: '😴',
};

const allowedMoods = new Set(Object.keys(moodEmojis));

const normalizeDiaryMood = (mood?: string): DiaryMood => {
  const normalized = (mood || 'HAPPY').toUpperCase();
  return allowedMoods.has(normalized) ? (normalized as DiaryMood) : 'HAPPY';
};

export const TravelResult = memo(function TravelResult({
  travel,
  frogName,
  discoveries = [],
  souvenir,
  diary,
  diaryMood = 'HAPPY',
  newBadges = [],
  memoryPalace = null,
}: TravelResultProps) {
  const [souvenirImageUrl, setSouvenirImageUrl] = useState<string | undefined>();
  const displayJournal = memoryPalace?.journal?.content || diary || '';
  const displayJournalMood = normalizeDiaryMood(memoryPalace?.journal?.mood || diaryMood);
  const displaySouvenir = memoryPalace?.souvenir || souvenir;
  const displayHighlights = memoryPalace?.highlights || [];

  useEffect(() => {
    // 优先使用传入的 souvenir 对象查找，如果是 P0 则使用 ID 拼接
    const sId = (travel?.souvenir as any)?.tokenId ||
                (displaySouvenir as any)?.tokenId ||
                (displaySouvenir as any)?.id ||
                ((travel as any)?.souvenirData ? `p0-${travel.id}` : null);

    if (sId) {
      travelFeatureApi.getSouvenirImageStatus(sId.toString())
        .then(res => {
          if (res.success && res.record) {
            setSouvenirImageUrl(res.record.gatewayUrl || res.record.imageUrl);
          }
        })
        .catch(() => {
          setSouvenirImageUrl(undefined);
        });
    }
  }, [travel, displaySouvenir]);

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

      {/* 旅行统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* XP 获得 */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
          <div className="text-3xl font-bold text-purple-600">
            +{(travel as any).crossChainXpEarned || (travel as any).xpEarned || 0}
          </div>
          <div className="text-sm text-purple-500 mt-1">经验值</div>
        </div>

        {/* 干粮退还 */}
        {(travel as any).refundAmount && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 text-center border border-green-200">
            <div className="text-lg font-bold text-green-600">
              +{(Number((travel as any).refundAmount) / 1e18).toFixed(4)}
            </div>
            <div className="text-sm text-green-500 mt-1">ZETA 退还</div>
          </div>
        )}

        {/* 探索发现 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200">
          <div className="text-3xl font-bold text-blue-600">
            {discoveries.length}
          </div>
          <div className="text-sm text-blue-500 mt-1">链上发现</div>
        </div>
      </div>

      {memoryPalace?.summary && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">🧠 记忆空间</h3>
          {memoryPalace.title ? <p className="text-base font-semibold text-gray-700 mb-2">{memoryPalace.title}</p> : null}
          <p className="text-gray-700 leading-relaxed">{memoryPalace.summary}</p>
          {displayHighlights.length > 0 ? (
            <div className="mt-4 space-y-2">
              {displayHighlights.map((highlight, index) => (
                <div key={`${highlight}-${index}`} className="text-sm text-gray-600">
                  • {highlight}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* 旅行日记 */}
      {displayJournal && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">📖 旅行日记</h3>
            <span className="text-3xl">{moodEmojis[displayJournalMood]}</span>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{displayJournal}</p>
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
      {displaySouvenir && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-lg p-6 border border-yellow-100">
          <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center">
            <span className="mr-2">🎁</span> 带回的纪念品
          </h3>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-4xl shadow-inner border border-yellow-200 overflow-hidden">
              {souvenirImageUrl ? (
                <img src={souvenirImageUrl} alt={displaySouvenir.name || 'Souvenir'} className="w-full h-full object-cover" />
              ) : (
                (displaySouvenir as any).emoji || '🎁'
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800">{displaySouvenir.name || '未知纪念品'}</h4>
              {'description' in displaySouvenir && (displaySouvenir as any).description ? (
                <p className="text-sm text-gray-600">{(displaySouvenir as any).description}</p>
              ) : null}
              <div className="mt-2 flex items-center space-x-2">
                {'rarity' in displaySouvenir && typeof (displaySouvenir as any).rarity === 'number' ? (
                  <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full font-semibold">
                    {'⭐'.repeat(Math.max(1, Math.min(5, Math.floor((displaySouvenir as any).rarity))))}
                  </span>
                ) : null}
                {'chainOrigin' in displaySouvenir && (displaySouvenir as any).chainOrigin ? (
                  <span className="text-xs text-gray-500">来自 {(displaySouvenir as any).chainOrigin}</span>
                ) : null}
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
});
