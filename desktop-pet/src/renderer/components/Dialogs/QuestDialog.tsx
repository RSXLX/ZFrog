import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  claimed: boolean;
  expiresAt?: number;
}

const defaultQuests: Quest[] = [
  { id: '1', title: '新手任务', description: '完成5次互动', progress: 3, target: 5, reward: 100, claimed: false },
  { id: '2', title: '喂食专家', description: '喂食10次', progress: 7, target: 10, reward: 200, claimed: false },
  { id: '3', title: '社交达人', description: '添加3个好友', progress: 1, target: 3, reward: 300, claimed: false },
];

const QuestDialog: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [quests, setQuests] = useState<Quest[]>(defaultQuests);

  const claimReward = (questId: string) => {
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, claimed: true } : q));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="dialog-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="dialog-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
            <button className="dialog-close" onClick={onClose}>×</button>
            <h2 className="dialog-title">📜 任务</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quests.map(quest => (
                <div key={quest.id} style={{ background: quest.claimed ? '#f0f0f0' : 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 'bold' }}>{quest.title}</span>
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>+{quest.reward}🪙</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{quest.description}</div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(quest.progress / quest.target) * 100}%` }} style={{ height: '100%', background: quest.claimed ? '#9ca3af' : '#4ADE80' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: '#666' }}>{quest.progress}/{quest.target}</span>
                    {quest.claimed ? <span style={{ color: '#9ca3af' }}>✅ 已领取</span> : quest.progress >= quest.target ? <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => claimReward(quest.id)} style={{ background: '#4ADE80', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer' }}>领取</motion.button> : <span style={{ color: '#9ca3af' }}>进行中</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuestDialog;
