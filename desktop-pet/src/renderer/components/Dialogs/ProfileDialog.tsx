import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileDialogProps {
  tokenId: number;
  name: string;
  level: number;
  xp: number;
  visible: boolean;
  onClose: () => void;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ tokenId, name, level, xp, visible, onClose }) => {
  if (!visible) return null;

  const xpForNext = level * 1000;
  const progress = (xp / xpForNext) * 100;

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
            background: 'white', borderRadius: 16, padding: 20, width: 320,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#11998e' }}>🐸 青蛙资料</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: 64 }}
            >
              🐸
            </motion.div>
            <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 10 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>ID: #{tokenId}</div>
          </div>

          {/* Level */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>等级 Lv.{level}</span>
              <span style={{ fontSize: 12, color: '#666' }}>{xp} / {xpForNext} XP</span>
            </div>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #22c55e, #4ade80)' }}
              />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ textAlign: 'center', padding: 10, background: '#f8f9fa', borderRadius: 8 }}>
              <div style={{ fontSize: 20 }}>🎒</div>
              <div style={{ fontSize: 12, color: '#666' }}>旅行</div>
              <div style={{ fontWeight: 'bold' }}>12</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, background: '#f8f9fa', borderRadius: 8 }}>
              <div style={{ fontSize: 20 }}>🏅</div>
              <div style={{ fontSize: 12, color: '#666' }}>徽章</div>
              <div style={{ fontWeight: 'bold' }}>8</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, background: '#f8f9fa', borderRadius: 8 }}>
              <div style={{ fontSize: 20 }}>👥</div>
              <div style={{ fontSize: 12, color: '#666' }}>好友</div>
              <div style={{ fontWeight: 'bold' }}>15</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileDialog;
