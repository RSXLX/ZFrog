import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartupAnimationProps {
  onComplete: () => void;
}

const StartupAnimation: React.FC<StartupAnimationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1500),
      setTimeout(() => setStage(3), 2500),
      setTimeout(() => onComplete(), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage < 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10 }}
          >
            <svg width="120" height="120" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="startGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4ADE80" />
                  <stop offset="100%" stopColor="#22C55E" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="80" fill="url(#startGradient)" />
              <circle cx="75" cy="80" r="15" fill="white" />
              <circle cx="125" cy="80" r="15" fill="white" />
              <circle cx="75" cy="80" r="8" fill="#1a1a2e" />
              <circle cx="125" cy="80" r="8" fill="#1a1a2e" />
              <path d="M 70 110 Q 100 140 130 110" stroke="#1a1a2e" strokeWidth="5" fill="none" strokeLinecap="round" />
            </svg>
          </motion.div>

          {/* Loading text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ marginTop: 24 }}
          >
            <h1 style={{ color: 'white', fontSize: 28, margin: 0 }}>ZetaFrog</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>桌面宠物</p>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            style={{ marginTop: 40 }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4ADE80',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Version */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: stage >= 2 ? 1 : 0 }}
            style={{ 
              position: 'absolute', 
              bottom: 40, 
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
            }}
          >
            v1.0.0 | Powered by Electron
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartupAnimation;
