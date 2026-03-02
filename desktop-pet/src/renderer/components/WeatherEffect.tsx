import React from 'react';
import { motion } from 'framer-motion';
import { Weather } from '../hooks/useTimeSystem';

interface WeatherEffectProps {
  weather: Weather;
}

const WeatherEffect: React.FC<WeatherEffectProps> = ({ weather }) => {
  if (weather === 'sunny' || weather === 'cloudy') return null;

  const particles = Array.from({ length: 20 });

  if (weather === 'rainy') {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {particles.map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: Math.random() * 200, y: -20, opacity: 0.6 }}
            animate={{ 
              y: 250,
              opacity: [0.6, 0.3, 0.6]
            }}
            transition={{ 
              duration: 0.8 + Math.random() * 0.5, 
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'linear'
            }}
            style={{
              position: 'absolute',
              width: 2,
              height: 10 + Math.random() * 10,
              background: 'linear-gradient(to bottom, transparent, rgba(100, 150, 255, 0.6))',
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    );
  }

  if (weather === 'snowy') {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {particles.map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: Math.random() * 200, y: -20 }}
            animate={{ 
              y: 250,
              x: Math.random() * 50 - 25,
            }}
            transition={{ 
              duration: 3 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'linear'
            }}
            style={{
              position: 'absolute',
              width: 6 + Math.random() * 4,
              height: 6 + Math.random() * 4,
              background: 'white',
              borderRadius: '50%',
              opacity: 0.8,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

export default WeatherEffect;
