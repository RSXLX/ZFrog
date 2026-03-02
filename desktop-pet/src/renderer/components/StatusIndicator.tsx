import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StatusIndicatorProps {
  status: 'happy' | 'excited' | 'sad' | 'angry' | 'sleepy' | 'hungry';
  visible: boolean;
}

const statusConfig = {
  happy: { emoji: '😊', color: '#4ADE80', text: '开心' },
  excited: { emoji: '🎉', color: '#FBBF24', text: '兴奋' },
  sad: { emoji: '😢', color: '#60A5FA', text: '难过' },
  angry: { emoji: '😠', color: '#F87171', text: '生气' },
  sleepy: { emoji: '😴', color: '#A78BFA', text: '困倦' },
  hungry: { emoji: '🍽️', color: '#FB923C', text: '饥饿' },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, visible }) => {
  const config = statusConfig[status];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          style={{
            position: 'absolute',
            top: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            background: config.color,
            padding: '4px 12px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{config.emoji}</span>
          <span style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
            {config.text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatusIndicator;
