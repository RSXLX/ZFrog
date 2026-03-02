import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ParticleEffectProps {
  type: 'hearts' | 'stars' | 'sparks' | 'confetti';
  trigger: number;
}

const ParticleEffect: React.FC<ParticleEffectProps> = ({ type, trigger }) => {
  const particles = useMemo(() => Array.from({ length: 15 }), [trigger]);

  if (type === 'hearts') {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 100, y: 100, opacity: 1, scale: 0 }}
            animate={{
              y: -100,
              x: (Math.random() - 0.5) * 100,
              opacity: [1, 1, 0],
              scale: [0, 1, 0.5],
              rotate: (Math.random() - 0.5) * 30,
            }}
            transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.3 }}
            style={{ position: 'absolute', left: '50%', fontSize: 16 + Math.random() * 8 }}
          >
            {['💕', '❤️', '💗', '💖', '💘'][Math.floor(Math.random() * 5)]}
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'stars') {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 100, y: 100, opacity: 0 }}
            animate={{
              y: -80,
              x: (Math.random() - 0.5) * 150,
              opacity: [0, 1, 0],
              scale: [0, 1.2, 0.8],
            }}
            transition={{ duration: 1.2 + Math.random() * 0.8, delay: Math.random() * 0.2 }}
            style={{ position: 'absolute', left: '50%', fontSize: 12 + Math.random() * 8 }}
          >
            {['✨', '⭐', '🌟', '💫'][Math.floor(Math.random() * 4)]}
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'confetti') {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: Math.random() * 200, y: -20, rotate: 0 }}
            animate={{
              y: 250,
              rotate: 360 + Math.random() * 360,
              x: (Math.random() - 0.5) * 200,
            }}
            transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.3 }}
            style={{
              position: 'absolute',
              left: '30%',
              width: 8,
              height: 8,
              background: colors[Math.floor(Math.random() * colors.length)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

export default ParticleEffect;
