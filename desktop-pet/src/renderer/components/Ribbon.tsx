import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingRibbonProps {
  visible: boolean;
  message: string;
  type: 'levelup' | 'achievement' | 'gift' | 'milestone';
}

const FloatingRibbon: React.FC<FloatingRibbonProps> = ({ visible, message, type }) => {
  const colors = {
    levelup: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', text: '#78350F' },
    achievement: { bg: 'linear-gradient(135deg, #A78BFA, #8B5CF6)', text: 'white' },
    gift: { bg: 'linear-gradient(135deg, #F472B6, #EC4899)', text: 'white' },
    milestone: { bg: 'linear-gradient(135deg, #4ADE80, #22C55E)', text: 'white' },
  };

  const icons = {
    levelup: '⬆️',
    achievement: '🏆',
    gift: '🎁',
    milestone: '⭐',
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          style={{
            position: 'absolute',
            top: -80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: colors[type].bg,
            padding: '12px 24px',
            borderRadius: 30,
            boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 20, marginRight: 8 }}>{icons[type]}</span>
          <span style={{ color: colors[type].text, fontWeight: 'bold', fontSize: 16 }}>
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingRibbon;
