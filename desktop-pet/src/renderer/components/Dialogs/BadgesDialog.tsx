import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

interface BadgesDialogProps {
  tokenId: number;
  visible: boolean;
  onClose: () => void;
}

const BadgesDialog: React.FC<BadgesDialogProps> = ({ tokenId, visible, onClose }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && tokenId) {
      loadBadges();
    }
  }, [visible, tokenId]);

  const loadBadges = async () => {
    setLoading(true);
    const data = await api.getBadges(tokenId);
    setBadges(data);
    setLoading(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white', borderRadius: 16, padding: 20,
            width: 320, maxHeight: '80vh', overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#11998e' }}>🏅 徽章墙</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
          ) : badges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
              暂无徽章<br />
              <small>完成旅行任务来获得徽章吧！</small>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {badges.map((badge) => (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.05 }}
                  style={{
                    textAlign: 'center', padding: 10, background: '#f8f9fa',
                    borderRadius: 8, cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 32 }}>{badge.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>{badge.name}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>{badge.description}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BadgesDialog;
