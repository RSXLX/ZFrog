import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PARTICLE_CONFIGS } from '../../config/animations';

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  angle: number;
  delay: number;
}

interface ParticleEffectProps {
  type: string;
  onComplete?: () => void;
}

export function ParticleEffect({ type, onComplete }: ParticleEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const config = PARTICLE_CONFIGS[type];
  
  useEffect(() => {
    if (!config) return;
    
    // 生成粒子
    const newParticles: Particle[] = [];
    for (let i = 0; i < config.count; i++) {
      const angle = config.direction === 'burst' 
        ? (360 / config.count) * i 
        : (Math.random() - 0.5) * config.spread;
      
      newParticles.push({
        id: i,
        emoji: config.emoji,
        x: (Math.random() - 0.5) * 40,
        y: 0,
        angle,
        delay: i * 50,
      });
    }
    setParticles(newParticles);
    
    // 动画完成后回调
    const timer = setTimeout(() => {
      onComplete?.();
    }, config.duration + 500);
    
    return () => clearTimeout(timer);
  }, [type, config, onComplete]);
  
  if (!config) return null;
  
  const getEndPosition = (particle: Particle) => {
    const distance = 80 + Math.random() * 40;
    const rad = (particle.angle * Math.PI) / 180;
    
    switch (config.direction) {
      case 'up':
        return { x: particle.x, y: -distance };
      case 'down':
        return { x: particle.x, y: distance };
      case 'left':
        return { x: -distance, y: particle.y };
      case 'right':
        return { x: distance, y: particle.y };
      case 'burst':
        return {
          x: Math.cos(rad) * distance,
          y: Math.sin(rad) * distance,
        };
      default:
        return { x: distance * 0.5, y: -distance * 0.5 };
    }
  };
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => {
        const end = getEndPosition(particle);
        
        return (
          <motion.div
            key={particle.id}
            className="absolute left-1/2 top-1/2 text-2xl"
            initial={{
              x: particle.x,
              y: particle.y,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              x: end.x,
              y: end.y,
              scale: [0, 1.2, 1, 0.5],
              opacity: [0, 1, 1, 0],
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: config.duration / 1000,
              delay: particle.delay / 1000,
              ease: 'easeOut',
            }}
          >
            {particle.emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

// 预设粒子效果
export function CoinShower({ count = 20 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          initial={{
            x: Math.random() * 200 - 100,
            y: -50,
            rotate: 0,
          }}
          animate={{
            y: 200,
            rotate: 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: Math.random() * 1,
            ease: 'easeIn',
          }}
        >
          🪙
        </motion.div>
      ))}
    </div>
  );
}

export function HeartBurst({ count = 10 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i;
        const rad = (angle * Math.PI) / 180;
        const distance = 60 + Math.random() * 30;
        
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 text-xl"
            initial={{ x: 0, y: 0, scale: 0 }}
            animate={{
              x: Math.cos(rad) * distance,
              y: Math.sin(rad) * distance,
              scale: [0, 1.5, 1, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.05,
              ease: 'easeOut',
            }}
          >
            ❤️
          </motion.div>
        );
      })}
    </div>
  );
}

export function StarBurst({ count = 12 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i;
        const rad = (angle * Math.PI) / 180;
        const distance = 80 + Math.random() * 40;
        
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 text-2xl"
            initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
            animate={{
              x: Math.cos(rad) * distance,
              y: Math.sin(rad) * distance,
              scale: [0, 1.2, 1, 0.5],
              opacity: [0, 1, 1, 0],
              rotate: 360,
            }}
            transition={{
              duration: 1,
              delay: i * 0.03,
              ease: 'easeOut',
            }}
          >
            ⭐
          </motion.div>
        );
      })}
    </div>
  );
}

export function MusicNotes({ count = 6 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-xl"
          initial={{
            x: (Math.random() - 0.5) * 60,
            y: 0,
            opacity: 0,
          }}
          animate={{
            y: -100 - Math.random() * 50,
            x: (Math.random() - 0.5) * 100,
            opacity: [0, 1, 1, 0],
            rotate: [-10, 10, -10],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: i * 0.2,
            ease: 'easeOut',
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          🎵
        </motion.div>
      ))}
    </div>
  );
}

export function SweatDrops({ count = 3 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-lg"
          initial={{
            x: 20 + i * 15,
            y: 10,
            opacity: 0,
          }}
          animate={{
            x: 40 + i * 15 + Math.random() * 10,
            y: 30 + Math.random() * 10,
            opacity: [0, 1, 0],
            scale: [0, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            delay: i * 0.1,
            ease: 'easeOut',
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          💦
        </motion.div>
      ))}
    </div>
  );
}

export function FireParticles({ count = 8 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-xl"
          initial={{
            x: (Math.random() - 0.5) * 40,
            y: 0,
            opacity: 0,
          }}
          animate={{
            y: -60 - Math.random() * 40,
            x: (Math.random() - 0.5) * 60,
            opacity: [0, 1, 0.8, 0],
            scale: [0, 1.2, 0.8, 0.3],
          }}
          transition={{
            duration: 1 + Math.random() * 0.5,
            delay: i * 0.1,
            ease: 'easeOut',
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          🔥
        </motion.div>
      ))}
    </div>
  );
}

export function Tears({ count = 4 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-lg"
          initial={{
            x: -20 + i * 15,
            y: 20,
            opacity: 0,
          }}
          animate={{
            y: 60 + Math.random() * 20,
            opacity: [0, 1, 0.5, 0],
            scale: [0, 1, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.3,
            ease: 'easeIn',
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          😢
        </motion.div>
      ))}
    </div>
  );
}

export function ZzzParticles({ count = 3 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-lg"
          initial={{
            x: 10,
            y: -10 - i * 15,
            opacity: 0,
          }}
          animate={{
            x: 10 + Math.sin(i) * 10,
            y: -40 - i * 20,
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0.5],
          }}
          transition={{
            duration: 2,
            delay: i * 0.5,
            ease: 'easeOut',
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          💤
        </motion.div>
      ))}
    </div>
  );
}