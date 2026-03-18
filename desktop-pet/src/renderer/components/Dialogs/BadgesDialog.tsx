import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type BadgeData, type BadgeReward } from '../../services/api';
import type { Achievement } from '../../hooks/useAchievements';

interface BadgesDialogProps {
  tokenId: number;
  ownerAddress: string;
  petName: string;
  visible: boolean;
  onClose: () => void;
  achievements?: Achievement[];
}

type BadgeFilter = 'all' | 'unlocked' | 'locked';

const BADGE_CATEGORIES = [
  { key: 'all', label: '全部', icon: '🏆' },
  { key: 'TRIP_COUNT', label: '旅行', icon: '🗺️' },
  { key: 'CHAIN_VISIT', label: '链探索', icon: '⛓️' },
  { key: 'MULTI_CHAIN', label: '跨链', icon: '🔗' },
  { key: 'RARE_FIND', label: '发现', icon: '🔍' },
  { key: 'SOCIAL', label: '社交', icon: '🤝' },
  { key: 'COLLECTION', label: '收藏', icon: '🏠' },
  { key: 'SPECIAL', label: '特殊', icon: '🎭' },
];

const RARITY_CONFIG: Record<number, {
  name: string;
  background: string;
  border: string;
  badgeBackground: string;
  badgeColor: string;
  glow: string;
  stars: string;
}> = {
  1: {
    name: '普通',
    background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
    border: '#cbd5e1',
    badgeBackground: '#e2e8f0',
    badgeColor: '#475569',
    glow: '#f1f5f9',
    stars: '⭐',
  },
  2: {
    name: '稀有',
    background: 'linear-gradient(135deg, #ecfccb, #dcfce7)',
    border: '#86efac',
    badgeBackground: '#dcfce7',
    badgeColor: '#15803d',
    glow: '#d9f99d',
    stars: '⭐⭐',
  },
  3: {
    name: '精良',
    background: 'linear-gradient(135deg, #dbeafe, #cffafe)',
    border: '#7dd3fc',
    badgeBackground: '#dbeafe',
    badgeColor: '#1d4ed8',
    glow: '#bfdbfe',
    stars: '⭐⭐⭐',
  },
  4: {
    name: '史诗',
    background: 'linear-gradient(135deg, #ede9fe, #f5d0fe)',
    border: '#c4b5fd',
    badgeBackground: '#ede9fe',
    badgeColor: '#7c3aed',
    glow: '#ddd6fe',
    stars: '⭐⭐⭐⭐',
  },
  5: {
    name: '传说',
    background: 'linear-gradient(135deg, #fef3c7, #fdba74)',
    border: '#f59e0b',
    badgeBackground: 'linear-gradient(135deg, #fbbf24, #f97316)',
    badgeColor: '#ffffff',
    glow: '#fde68a',
    stars: '⭐⭐⭐⭐⭐',
  },
};

function toFallbackCategory(achievement: Achievement) {
  if (achievement.id.includes('travel')) return 'TRIP_COUNT';
  if (achievement.id.includes('friend')) return 'SOCIAL';
  if (achievement.id.includes('all_stats')) return 'COLLECTION';
  return 'SPECIAL';
}

function toFallbackRarity(achievement: Achievement) {
  if (achievement.id.includes('all_stats')) return 5;
  if (achievement.id.includes('travel') || achievement.id.includes('streak')) return 3;
  return 2;
}

function mapAchievementToBadge(achievement: Achievement): BadgeData {
  return {
    id: achievement.id,
    code: achievement.id.toUpperCase(),
    name: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
    rarity: toFallbackRarity(achievement),
    isHidden: false,
    unlocked: achievement.unlocked,
    unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt).toISOString() : undefined,
    unlockType: toFallbackCategory(achievement),
  };
}

function formatRewardAmount(rewards: BadgeReward[]) {
  try {
    const total = rewards.reduce((sum, reward) => sum + BigInt(reward.amount || '0'), 0n);
    return total > 0n ? (Number(total) / 1e18).toFixed(4) : '0';
  } catch {
    return '0';
  }
}

function formatUnlockedAt(unlockedAt?: string) {
  if (!unlockedAt) return '完成特定条件后解锁';
  return `解锁于 ${new Date(unlockedAt).toLocaleDateString()}`;
}

const BadgesDialog: React.FC<BadgesDialogProps> = ({
  tokenId,
  ownerAddress,
  petName,
  visible,
  onClose,
  achievements = [],
}) => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [rewards, setRewards] = useState<BadgeReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<BadgeFilter>('all');
  const [category, setCategory] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!visible) return;

    const loadBadges = async () => {
      setLoading(true);
      try {
        const [remoteBadges, remoteRewards] = await Promise.all([
          api.getBadges(tokenId, ownerAddress),
          ownerAddress ? api.getPendingRewards(ownerAddress) : Promise.resolve([]),
        ]);

        setBadges(remoteBadges.length > 0 ? remoteBadges : achievements.map(mapAchievementToBadge));
        setRewards(remoteRewards);
      } catch (error) {
        console.error('Failed to load badges:', error);
        setBadges(achievements.map(mapAchievementToBadge));
        setRewards([]);
      } finally {
        setLoading(false);
      }
    };

    void loadBadges();
  }, [visible, tokenId, ownerAddress, achievements]);

  const handleClaimAll = async () => {
    if (!ownerAddress || rewards.length === 0) return;

    setClaiming(true);
    setClaimResult(null);
    try {
      const result = await api.claimAllRewards(ownerAddress);
      setClaimResult({
        success: true,
        message: `成功领取 ${result.successCount} 份奖励！`,
      });
      setRewards(await api.getPendingRewards(ownerAddress));
    } catch (error) {
      setClaimResult({
        success: false,
        message: error instanceof Error ? error.message : '领取失败，请稍后重试',
      });
    } finally {
      setClaiming(false);
    }
  };

  if (!visible) return null;

  const filteredBadges = badges.filter((badge) => {
    if (filter === 'unlocked' && !badge.unlocked) return false;
    if (filter === 'locked' && badge.unlocked) return false;
    if (category !== 'all' && badge.unlockType !== category) return false;
    return true;
  });

  const unlockedCount = badges.filter(item => item.unlocked).length;
  const progressPercent = badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0;
  const formattedReward = formatRewardAmount(rewards);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
          style={{
            width: 'min(860px, 100%)',
            maxHeight: '88vh',
            overflow: 'auto',
            borderRadius: 28,
            background: 'linear-gradient(180deg, #f8fffb 0%, #eefbf5 100%)',
            boxShadow: '0 20px 80px rgba(15, 23, 42, 0.25)',
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 28, color: '#166534' }}>🏆 {petName} 的徽章</h2>
              <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>桌面端优先对齐 web 徽章库与领奖状态。</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 999,
                width: 40,
                height: 40,
                fontSize: 20,
                cursor: 'pointer',
                color: '#334155',
              }}
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#475569' }}>正在同步 web 徽章与奖励...</div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    padding: 20,
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.82)',
                    border: '1px solid rgba(187, 247, 208, 0.9)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>🎯</span>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                      {unlockedCount} / {badges.length}
                    </div>
                    <div style={{ color: '#64748b' }}>({progressPercent}%)</div>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: '#d9f99d', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, #22c55e, #10b981, #14b8a6)',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>收集徽章，记录旅行、跨链探索和收藏进度。</div>
                </div>

                <div
                  style={{
                    padding: 20,
                    borderRadius: 20,
                    background: rewards.length > 0 ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'rgba(255,255,255,0.82)',
                    border: rewards.length > 0 ? '1px solid #f59e0b' : '1px solid rgba(226, 232, 240, 0.9)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{rewards.length > 0 ? '🎁' : '🧾'}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#92400e' }}>
                        {rewards.length > 0 ? `${rewards.length} 份待领取奖励` : '暂无待领取奖励'}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: rewards.length > 0 ? '#a16207' : '#64748b' }}>
                        {rewards.length > 0 ? `${formattedReward} ZETA` : 'web 端奖励状态已同步到桌面端'}
                      </div>
                    </div>
                  </div>
                  {rewards.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClaimAll}
                      disabled={claiming}
                      style={{
                        marginTop: 14,
                        width: '100%',
                        border: 'none',
                        borderRadius: 12,
                        padding: '11px 14px',
                        color: '#fff',
                        cursor: claiming ? 'not-allowed' : 'pointer',
                        fontWeight: 800,
                        background: claiming ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #f97316)',
                      }}
                    >
                      {claiming ? '⏳ 领取中...' : '🎉 一键领取'}
                    </button>
                  )}
                  {claimResult && (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 12,
                        padding: '10px 12px',
                        fontSize: 12,
                        color: claimResult.success ? '#166534' : '#b91c1c',
                        background: claimResult.success ? '#dcfce7' : '#fee2e2',
                      }}
                    >
                      {claimResult.success ? '✅' : '❌'} {claimResult.message}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
                {BADGE_CATEGORIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCategory(item.key)}
                    style={{
                      flexShrink: 0,
                      border: 'none',
                      borderRadius: 999,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      background: category === item.key ? 'linear-gradient(135deg, #16a34a, #10b981)' : 'rgba(255,255,255,0.85)',
                      color: category === item.key ? '#fff' : '#475569',
                    }}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 16,
                  padding: 6,
                  gap: 6,
                  background: 'rgba(255,255,255,0.78)',
                  marginBottom: 18,
                }}
              >
                {[
                  { key: 'all', label: '全部', count: badges.length },
                  { key: 'unlocked', label: '已解锁', count: unlockedCount },
                  { key: 'locked', label: '未解锁', count: Math.max(0, badges.length - unlockedCount) },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key as BadgeFilter)}
                    style={{
                      border: 'none',
                      borderRadius: 12,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      background: filter === item.key ? '#ffffff' : 'transparent',
                      color: filter === item.key ? '#0f172a' : '#64748b',
                    }}
                  >
                    {item.label} ({item.count})
                  </button>
                ))}
              </div>

              {filteredBadges.length === 0 ? (
                <div
                  style={{
                    padding: '48px 20px',
                    textAlign: 'center',
                    borderRadius: 24,
                    background: 'rgba(255,255,255,0.72)',
                    color: '#64748b',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 10 }}>{filter === 'locked' ? '🎉' : '🐸'}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>
                    {filter === 'locked' ? '所有可见徽章都已经解锁了' : '这一类下暂时还没有徽章'}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    可以先去旅行、探索不同链或完成社交互动，再回来看看。
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 14,
                  }}
                >
                  {filteredBadges.map((badge, index) => {
                    const rarity = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG[1];
                    return (
                      <motion.button
                        key={badge.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={badge.unlocked ? { y: -6, scale: 1.03 } : undefined}
                        type="button"
                        onClick={() => setSelectedBadge(badge)}
                        style={{
                          position: 'relative',
                          borderRadius: 22,
                          padding: '18px 12px',
                          cursor: 'pointer',
                          border: `2px solid ${badge.unlocked ? rarity.border : '#e2e8f0'}`,
                          background: badge.unlocked ? rarity.background : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                          textAlign: 'center',
                        }}
                      >
                        {!badge.unlocked && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: 20,
                              background: 'rgba(15, 23, 42, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 28,
                            }}
                          >
                            🔒
                          </div>
                        )}
                        <div style={{ fontSize: 42, filter: badge.unlocked ? undefined : 'grayscale(1)', opacity: badge.unlocked ? 1 : 0.4 }}>
                          {badge.unlocked ? badge.icon : '❓'}
                        </div>
                        <div style={{ marginTop: 10, fontWeight: 800, color: badge.unlocked ? '#0f172a' : '#94a3b8', fontSize: 13 }}>
                          {badge.unlocked ? badge.name : '???'}
                        </div>
                        {badge.unlocked && (
                          <div style={{ marginTop: 6, fontSize: 11 }}>{rarity.stars}</div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  marginTop: 18,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.72)',
                  padding: '12px 14px',
                  fontSize: 12,
                  color: '#475569',
                }}
              >
                💡 和 web 端一致，旅行、探索不同链、社交互动、收藏摆件都会推进徽章解锁。
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBadge(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.56)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 120,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(420px, 100%)',
                borderRadius: 28,
                background: '#ffffff',
                padding: 28,
                textAlign: 'center',
              }}
            >
              {(() => {
                const rarity = RARITY_CONFIG[selectedBadge.rarity] || RARITY_CONFIG[1];
                return (
                  <>
                    <div
                      style={{
                        width: 112,
                        height: 112,
                        margin: '0 auto 16px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: selectedBadge.unlocked ? rarity.glow : '#e2e8f0',
                        fontSize: 58,
                      }}
                    >
                      {selectedBadge.unlocked ? selectedBadge.icon : '🔒'}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>
                      {selectedBadge.unlocked ? selectedBadge.name : '???'}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.6, color: '#475569' }}>
                      {selectedBadge.unlocked ? selectedBadge.description : '完成特定条件后解锁此徽章'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center', marginTop: 18 }}>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          background: rarity.badgeBackground,
                          color: rarity.badgeColor,
                        }}
                      >
                        {rarity.name}
                      </span>
                      <span style={{ fontSize: 13 }}>{rarity.stars}</span>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
                      {formatUnlockedAt(selectedBadge.unlockedAt)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBadge(null)}
                      style={{
                        marginTop: 20,
                        width: '100%',
                        border: 'none',
                        borderRadius: 14,
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontWeight: 800,
                        color: '#fff',
                        background: 'linear-gradient(135deg, #16a34a, #0ea5e9)',
                      }}
                    >
                      关闭详情
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default BadgesDialog;
