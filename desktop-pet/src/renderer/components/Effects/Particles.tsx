import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  type: 'heart' | 'coin' | 'star' | 'sparkle';
  x: number;
  y: number;
}

interface ParticlesProps {
  trigger: boolean;
  type: 'heart' | 'coin' | 'star' | 'sparkle';
  count?: number;
  onComplete?: () => void;
}

const particleEmojis = {
  heart: ['❤️', '💖', '💕', '💗'],
  coin: ['💰', '🪙', '✨', '🌟'],
  star: ['⭐', '🌟', '✨', '💫'],
  sparkle: ['✨', '💫', '⭐', '🌟'],
};

export const Particles: React.FC<ParticlesProps> = ({ trigger, type, count = 5, onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        type,
        x: 50 + Math.random() * 20 - 10,
        y: 50 + Math.random() * 20 - 10,
      }));
      setParticles(newParticles);

      setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 1500);
    }
  }, [trigger, type, count, onComplete]);

  return (
    <AnimatePresence>
      {particles.map((particle) => {
        const emoji = particleEmojis[particle.type][Math.floor(Math.random() * 4)];
        return (
          <motion.div
            key={particle.id}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 1, y: -100, x: (Math.random() - 0.5) * 100 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ position: 'absolute', left: `${particle.x}%`, top: `${particle.y}%`, fontSize: 24, pointerEvents: 'none' }}
          >
            {emoji}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
};

export default Particles;
