import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardDialogProps {
  visible: boolean;
  onClose: () => void;
}

const mockLeaderboard = [
  { rank: 1, name: '🐸 小绿', level: 25, score: 12500, avatar: '🐸' },
  { rank: 2, name: '🐰 小红', level: 22, score: 10200, avatar: '🐰' },
  { rank: 3, name: '🐱 小明', level: 20, score: 9800, avatar: '🐱' },
  { rank: 4, name: '🦊 小华', level: 18, score: 8500, avatar: '🦊' },
  { rank: 5, name: '🐶 旺财', level: 15, score: 7200, avatar: '🐶' },
];

const LeaderboardDialog: React.FC<LeaderboardDialogProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState('level');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="dialog-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="dialog-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} style={{ minWidth: 340 }}>
            <button className="dialog-close" onClick={onClose}>×</button>
            <h2 className="dialog-title">🏆 排行榜</h2>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['level', 'score', 'friends'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: 10, background: activeTab === tab ? '#4ADE80' : '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer', color: activeTab === tab ? 'white' : '#666' }}>
                  {tab === 'level' && '等级'}
                  {tab === 'score' && '积分'}
                  {tab === 'friends' && '好友'}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {mockLeaderboard.map((user, index) => (
                <motion.div key={user.rank} whileHover={{ scale: 1.01 }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: index < 3 ? '#fffbeb' : 'white', borderRadius: 12, marginBottom: 8, border: `1px solid ${index === 0 ? '#FCD34D' : index === 1 ? '#9CA3AF' : index === 2 ? '#F97316' : '#e5e7eb'}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: user.rank <= 3 ? ['#FCD34D', '#9CA3AF', '#F97316'][user.rank - 1] : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>{user.rank}</div>
                  <div style={{ fontSize: 24 }}>{user.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Lv.{user.level}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#F59E0B' }}>{user.score.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>积分</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeaderboardDialog;
