import React from 'react';
import { motion } from 'framer-motion';

interface StatusBarProps {
  hunger: number;
  energy: number;
  happiness: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ hunger, energy, happiness }) => {
  const getColor = (value: number) => {
    if (value > 60) return '#4ADE80';
    if (value > 30) return '#FCD34D';
    return '#F87171';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        display: 'flex',
        gap: 8,
        zIndex: 50,
      }}
    >
      {/* Hunger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 12 }}>🍎</span>
        <div style={{ width: 30, height: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${hunger}%` }}
            style={{ height: '100%', background: getColor(hunger), borderRadius: 2 }}
          />
        </div>
      </div>
      
      {/* Energy */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 12 }}>⚡</span>
        <div style={{ width: 30, height: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${energy}%` }}
            style={{ height: '100%', background: getColor(energy), borderRadius: 2 }}
          />
        </div>
      </div>
      
      {/* Happiness */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 12 }}>💖</span>
        <div style={{ width: 30, height: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${happiness}%` }}
            style={{ height: '100%', background: getColor(happiness), borderRadius: 2 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default StatusBar;
