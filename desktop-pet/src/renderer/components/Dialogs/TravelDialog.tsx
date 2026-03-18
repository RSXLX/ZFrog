import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type TravelHistoryRecord, type TravelStats } from '../../services/api';
import type { LocalTravelHistoryEntry, TravelDestination } from '../../hooks/useTravel';

interface TravelDialogProps {
  visible: boolean;
  onClose: () => void;
  onTravelStart: (destinationId: string, duration: number) => void;
  onTravelComplete: () => void;
  walletAddress: string;
  tokenId: number;
  petName: string;
  travel: {
    destinations: TravelDestination[];
    currentTravel: TravelDestination | null;
    travelHistory: LocalTravelHistoryEntry[];
    getProgress: () => number;
    getRemainingTime: () => number;
    cancelTravel: () => void;
  };
}

interface DisplayHistoryEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  chainId: number;
  completedAt?: number | string;
  mood?: string;
  journalContent?: string;
  souvenir?: {
    name: string;
    rarity: string;
  };
  completed: boolean;
}

const durationOptions = [
  { id: 15, label: '15 分钟' },
  { id: 30, label: '30 分钟' },
  { id: 60, label: '60 分钟' },
];

const chainConfig = {
  97: { name: 'BSC 测试网', icon: '🟡', gradient: 'linear-gradient(135deg, #facc15, #fb923c)' },
  7001: { name: 'ZetaChain Athens', icon: '⚡', gradient: 'linear-gradient(135deg, #22c55e, #14b8a6)' },
  11155111: { name: '以太坊 Sepolia', icon: '💎', gradient: 'linear-gradient(135deg, #60a5fa, #8b5cf6)' },
};

const moodEmojis: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  thoughtful: '🤔',
  adventurous: '🧗',
  tired: '😴',
  curious: '🤔',
  sleepy: '😴',
  HAPPY: '😊',
  CURIOUS: '🤔',
  SURPRISED: '😲',
  PEACEFUL: '😌',
  EXCITED: '🤗',
  SLEEPY: '😴',
  THOUGHTFUL: '🤔',
};

const rewardItemLabels: Record<string, string> = {
  gift_box: '礼盒',
  cake: '蛋糕',
  toy_ball: '皮球',
  flower: '花朵',
};

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} 小时 ${minutes % 60} 分`;
  }
  return `${minutes} 分 ${remainingSeconds} 秒`;
}

function getLocalStats(history: LocalTravelHistoryEntry[]): TravelStats {
  const completedEntries = history.filter(item => item.completed);

  return {
    totalTrips: completedEntries.length,
    bscTrips: completedEntries.filter(item => item.chainId === 97).length,
    ethTrips: completedEntries.filter(item => item.chainId === 11155111).length,
    zetaTrips: completedEntries.filter(item => item.chainId === 7001).length,
    totalDiscoveries: completedEntries.length,
    rareFinds: completedEntries.filter(item => ['Rare', 'Epic', 'Legendary'].includes(item.souvenir?.rarity || '')).length,
    totalFrogs: 1,
    recentTravel: completedEntries.length > 0 ? {
      id: completedEntries.length,
      frogName: '桌宠',
      completedAt: new Date(completedEntries[completedEntries.length - 1].timestamp).toISOString(),
    } : null,
  };
}

function mapRemoteHistoryEntry(item: TravelHistoryRecord): DisplayHistoryEntry {
  const fallbackChain = chainConfig[item.chainId as keyof typeof chainConfig] || chainConfig[7001];
  return {
    id: `${item.id}`,
    title: item.journal?.title || `Journey #${item.id}`,
    subtitle: item.frog?.name || fallbackChain.name,
    icon: fallbackChain.icon,
    chainId: item.chainId,
    completedAt: item.completedAt,
    mood: item.journal?.mood || item.diaryMood || undefined,
    journalContent: item.journal?.content || item.journalContent || item.diary || undefined,
    souvenir: item.souvenir || undefined,
    completed: item.status === 'Completed',
  };
}

function mapLocalHistoryEntry(item: LocalTravelHistoryEntry): DisplayHistoryEntry {
  return {
    id: item.id,
    title: item.journalTitle || `${item.destination} Journey`,
    subtitle: item.destination,
    icon: item.icon,
    chainId: item.chainId,
    completedAt: item.timestamp,
    mood: item.journalMood,
    journalContent: item.journalContent,
    souvenir: item.souvenir,
    completed: item.completed,
  };
}

const TravelDialog: React.FC<TravelDialogProps> = ({
  visible,
  onClose,
  onTravelStart,
  onTravelComplete,
  walletAddress,
  tokenId,
  petName,
  travel,
}) => {
  const [selectedDestinationId, setSelectedDestinationId] = useState(travel.destinations[0]?.id ?? '');
  const [selectedDuration, setSelectedDuration] = useState(durationOptions[1].id);
  const [history, setHistory] = useState<TravelHistoryRecord[]>([]);
  const [stats, setStats] = useState<TravelStats | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);

  useEffect(() => {
    if (!visible || !walletAddress) return;

    let cancelled = false;
    const loadRemoteData = async () => {
      setLoadingRemote(true);
      try {
        const [travelHistory, travelStats] = await Promise.all([
          api.getTravelHistory(walletAddress, tokenId),
          api.getTravelStats(walletAddress, tokenId),
        ]);

        if (cancelled) return;
        setHistory(travelHistory?.travels || []);
        setStats(travelStats);
      } catch (error) {
        console.error('Failed to sync travel history:', error);
        if (!cancelled) {
          setHistory([]);
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingRemote(false);
        }
      }
    };

    void loadRemoteData();

    return () => {
      cancelled = true;
    };
  }, [visible, walletAddress, tokenId]);

  if (!visible) return null;

  const currentTravel = travel.currentTravel;
  const progress = currentTravel ? travel.getProgress() : 0;
  const localStats = getLocalStats(travel.travelHistory);
  const summary = stats || localStats;
  const displayHistory = history.length > 0
    ? history.slice(0, 8).map(mapRemoteHistoryEntry)
    : [...travel.travelHistory].reverse().slice(0, 8).map(mapLocalHistoryEntry);

  const chainFootprint = [
    { key: 7001, count: summary.zetaTrips },
    { key: 97, count: summary.bscTrips },
    { key: 11155111, count: summary.ethTrips },
  ];
  const chainsVisited = chainFootprint.filter(item => item.count > 0).length;

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
            width: 'min(920px, 100%)',
            maxHeight: '88vh',
            overflow: 'auto',
            borderRadius: 28,
            background: 'linear-gradient(180deg, #eefbf8 0%, #f8fffb 100%)',
            boxShadow: '0 20px 80px rgba(15, 23, 42, 0.25)',
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 28, color: '#0f766e' }}>🧭 {petName} 的旅行日志</h2>
              <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
                桌面端优先展示 web 的旅行历史、统计和足迹。
              </div>
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

          {currentTravel ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr)',
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 24,
                  background: 'linear-gradient(135deg, #d1fae5, #cffafe)',
                  border: '1px solid #99f6e4',
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 42 }}>{currentTravel.icon}</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                      正在前往 {currentTravel.name}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>
                      {currentTravel.description}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 6 }}>
                    <span>旅行进度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: 10, background: '#dbeafe', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, #14b8a6, #22c55e)',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                    剩余时间：{formatRemaining(travel.getRemainingTime())}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 24,
                  background: 'rgba(255,255,255,0.84)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>预计收获</div>
                <div style={{ fontSize: 13, color: '#475569' }}>经验 +{currentTravel.rewards.exp}</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                  道具：{(currentTravel.rewards.items || []).map(item => rewardItemLabels[item] || item).join('、') || '无'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => {
                      travel.cancelTravel();
                      onClose();
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#b91c1c',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    取消旅行
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTravelComplete();
                      onClose();
                    }}
                    disabled={progress < 100}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: 'none',
                      background: progress >= 100 ? 'linear-gradient(135deg, #16a34a, #0ea5e9)' : '#cbd5e1',
                      color: '#fff',
                      cursor: progress >= 100 ? 'pointer' : 'not-allowed',
                      fontWeight: 800,
                    }}
                  >
                    {progress >= 100 ? '领取旅行收获' : '尚未抵达'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 20,
                borderRadius: 24,
                background: 'rgba(255,255,255,0.84)',
                border: '1px solid rgba(45, 212, 191, 0.2)',
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>开始一段与 web 保持一致的链上旅行</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
                {travel.destinations.map((destination) => (
                  <motion.button
                    key={destination.id}
                    type="button"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDestinationId(destination.id)}
                    style={{
                      textAlign: 'left',
                      padding: 14,
                      borderRadius: 18,
                      cursor: 'pointer',
                      background: selectedDestinationId === destination.id ? 'linear-gradient(135deg, #ccfbf1, #d1fae5)' : '#f8fafc',
                      border: selectedDestinationId === destination.id ? '2px solid #14b8a6' : '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: 26 }}>{destination.icon}</div>
                    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{destination.name}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>{destination.description}</div>
                  </motion.button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                {durationOptions.map((duration) => (
                  <button
                    key={duration.id}
                    type="button"
                    onClick={() => setSelectedDuration(duration.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: selectedDuration === duration.id ? '2px solid #14b8a6' : '1px solid #e2e8f0',
                      background: selectedDuration === duration.id ? '#ccfbf1' : '#fff',
                      cursor: 'pointer',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {duration.label}
                  </button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={() => {
                  onTravelStart(selectedDestinationId, selectedDuration);
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: 14,
                  background: 'linear-gradient(135deg, #0f766e, #10b981)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                🚀 开始旅行
              </motion.button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
            {[
              { icon: '🗺️', label: '总旅行数', value: summary.totalTrips, gradient: 'linear-gradient(135deg, #60a5fa, #4f46e5)' },
              { icon: '📖', label: '发现记录', value: summary.totalDiscoveries, gradient: 'linear-gradient(135deg, #a855f7, #ec4899)' },
              { icon: '🏆', label: '稀有发现', value: summary.rareFinds, gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' },
              { icon: '🧭', label: '到访链数', value: chainsVisited, gradient: 'linear-gradient(135deg, #22c55e, #14b8a6)' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  color: '#fff',
                  background: item.gradient,
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
                }}
              >
                <div style={{ fontSize: 26 }}>{item.icon}</div>
                <div style={{ marginTop: 12, fontSize: 24, fontWeight: 800 }}>{item.value}</div>
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.88 }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.84)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>链上足迹分布</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {loadingRemote ? '同步 web 足迹中...' : history.length > 0 ? '已同步 web 旅行历史' : '暂无 web 记录，展示本地旅行足迹'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chainFootprint.map((item) => {
                const config = chainConfig[item.key as keyof typeof chainConfig];
                const percentage = summary.totalTrips > 0 ? (item.count / summary.totalTrips) * 100 : 0;
                return (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {config.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>{config.name}</span>
                        <span style={{ color: '#64748b' }}>{item.count} 次</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          style={{
                            height: '100%',
                            borderRadius: 999,
                            background: config.gradient,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.84)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>最近旅程</div>
            {displayHistory.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748b' }}>
                还没有旅行记录，先从上面的目的地里出发一次吧。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {displayHistory.map((item, index) => {
                  const config = chainConfig[item.chainId as keyof typeof chainConfig] || chainConfig[7001];
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      style={{
                        borderRadius: 20,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: 16,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ width: 50, height: 50, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                            {item.icon || config.icon}
                          </div>
                          <div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{config.name}</span>
                              <span style={{ fontSize: 11, color: item.completed ? '#166534' : '#b91c1c', background: item.completed ? '#dcfce7' : '#fee2e2', borderRadius: 999, padding: '2px 8px' }}>
                                {item.completed ? '已完成' : '已取消'}
                              </span>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 13, color: '#334155' }}>{item.title}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                              {item.subtitle} · {item.completedAt ? new Date(item.completedAt).toLocaleString() : '刚刚更新'}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 24 }}>
                          {item.mood ? moodEmojis[item.mood] || moodEmojis[item.mood.toLowerCase()] || '😊' : '😊'}
                        </div>
                      </div>

                      {item.souvenir && (
                        <div
                          style={{
                            marginTop: 12,
                            marginLeft: 62,
                            display: 'inline-flex',
                            gap: 10,
                            alignItems: 'center',
                            padding: '8px 10px',
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
                          }}
                        >
                          <span style={{ fontSize: 18 }}>🎁</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#4338ca' }}>{item.souvenir.name}</div>
                            <div style={{ fontSize: 10, color: '#6366f1', textTransform: 'uppercase' }}>{item.souvenir.rarity}</div>
                          </div>
                        </div>
                      )}

                      {item.journalContent && (
                        <div
                          style={{
                            marginTop: 12,
                            marginLeft: 62,
                            paddingLeft: 12,
                            borderLeft: '3px solid #5eead4',
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: '#475569',
                            fontStyle: 'italic',
                          }}
                        >
                          “{item.journalContent}”
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TravelDialog;
