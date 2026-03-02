import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StatisticsDialogProps {
  visible: boolean;
  onClose: () => void;
  stats: {
    totalPlayTime: number;
    totalInteractions: number;
    feedCount: number;
    petCount: number;
    patrolCount: number;
    travelCount: number;
    achievementsUnlocked: number;
    longestSession: number;
  };
  getTotalScore: () => number;
}

const StatisticsDialog: React.FC<StatisticsDialogProps> = ({ visible, onClose, stats, getTotalScore }) => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="dialog-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="dialog-close" onClick={onClose}>×</button>
            
            <h2 className="dialog-title">📊 统计数据</h2>
            
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ 
                fontSize: 36, 
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {getTotalScore()}
              </div>
              <div style={{ fontSize: 14, color: '#666' }}>总成就分</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <StatCard icon="⏱️" label="游戏时长" value={formatTime(stats.totalPlayTime)} />
              <StatCard icon="👆" label="总互动" value={`${stats.totalInteractions}次`} />
              <StatCard icon="🍎" label="喂食次数" value={`${stats.feedCount}次`} />
              <StatCard icon="👋" label="抚摸次数" value={`${stats.petCount}次`} />
              <StatCard icon="🎯" label="巡逻次数" value={`${stats.patrolCount}次`} />
              <StatCard icon="✈️" label="旅行次数" value={`${stats.travelCount}次`} />
              <StatCard icon="🏆" label="成就解锁" value={`${stats.achievementsUnlocked}个`} />
              <StatCard icon="⭐" label="最长会话" value={formatTime(stats.longestSession)} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const StatCard: React.FC<{icon: string; label: string; value: string}> = ({ icon, label, value }) => (
  <div style={{ 
    background: '#f5f5f5', 
    borderRadius: 12, 
    padding: 12, 
    textAlign: 'center' 
  }}>
    <div style={{ fontSize: 24 }}>{icon}</div>
    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: '600', marginTop: 2 }}>{value}</div>
  </div>
);

export default StatisticsDialog;
