import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlacedItem {
  id: string;
  name: string;
  x: number;
  y: number;
  type: string;
}

interface HomeDialogProps {
  tokenId: number;
  visible: boolean;
  onClose: () => void;
}

const DEFAULT_ITEMS: PlacedItem[] = [
  { id: '1', name: '池塘', x: 50, y: 60, type: 'pond' },
  { id: '2', name: '荷叶', x: 40, y: 70, type: 'lotus' },
  { id: '3', name: '石头', x: 70, y: 80, type: 'rock' },
];

const HomeDialog: React.FC<HomeDialogProps> = ({ tokenId, visible, onClose }) => {
  const [items, setItems] = useState<PlacedItem[]>(DEFAULT_ITEMS);
  const [comfortScore, setComfortScore] = useState(85);

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
            background: 'linear-gradient(180deg, #a8e6cf 0%, #88d8b0 100%)',
            borderRadius: 16, padding: 20, width: 360, height: 450,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#1a5c3a' }}>🏠 我的家园</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Comfort Score */}
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 10, background: 'rgba(255,255,255,0.5)', borderRadius: 8, marginBottom: 16 
          }}>
            <span style={{ fontWeight: 'bold', color: '#1a5c3a' }}>舒适度</span>
            <span style={{ fontSize: 20 }}>⭐ {comfortScore}</span>
          </div>

          {/* Garden Preview */}
          <div style={{
            width: '100%', height: 250, background: '#88d8b0', borderRadius: 12,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Grass pattern */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
              background: 'linear-gradient(180deg, transparent, #6bbf6b)',
            }} />
            
            {/* Items */}
            {items.map((item) => (
              <motion.div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  fontSize: 32,
                }}
                whileHover={{ scale: 1.1 }}
              >
                {item.type === 'pond' && '💧'}
                {item.type === 'lotus' && '🪷'}
                {item.type === 'rock' && '🪨'}
              </motion.div>
            ))}

            {/* Frog */}
            <motion.div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                fontSize: 40,
              }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🐸
            </motion.div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
            <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
              <div style={{ fontSize: 20 }}>👁️</div>
              <div style={{ fontSize: 12 }}>访客</div>
              <div style={{ fontWeight: 'bold' }}>12</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
              <div style={{ fontSize: 20 }}>🎁</div>
              <div style={{ fontSize: 12 }}>礼物</div>
              <div style={{ fontWeight: 'bold' }}>5</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
              <div style={{ fontSize: 20 }}>📸</div>
              <div style={{ fontSize: 12 }}>照片</div>
              <div style={{ fontWeight: 'bold' }}>8</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HomeDialog;
