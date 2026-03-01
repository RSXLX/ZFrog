import React from 'react';
import { motion } from 'framer-motion';

interface StatusBarProps {
  hunger: number;
  energy: number;
  happiness: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ hunger, energy, happiness }) => {
  const getColor = (value: number) => {
    if (value > 60) return '#22c55e';
    if (value > 30) return '#f59e0b';
    return '#ef4444';
  };

  const getEmoji = (value: number, type: 'hunger' | 'energy' | 'happiness') => {
    if (type === 'hunger') {
      if (value > 60) return '🍎';
      if (value > 30) return '🍏';
      return '😵';
    }
    if (type === 'energy') {
      if (value > 60) return '⚡';
      if (value > 30) return '🔋';
      return '😴';
    }
    if (type === 'happiness') {
      if (value > 60) return '💖';
      if (value > 30) return '💔';
      return '😭';
    }
    return '❓';
  };

  return (
    <div className="status-bar">
      {/* Hunger */}
      <motion.div 
        className="status-item"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        title={`饥饿: ${Math.round(hunger)}%`}
      >
        <span>{getEmoji(hunger, 'hunger')}</span>
        <span>{Math.round(hunger)}</span>
        <div style={{ width: 35, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
          <motion.div 
            style={{ 
              height: '100%', 
              background: getColor(hunger), 
              borderRadius: 2 
            }}
            initial={{ width: 0 }}
            animate={{ width: `${hunger}%` }}
          />
        </div>
      </motion.div>

      {/* Energy */}
      <motion.div 
        className="status-item"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        title={`精力: ${Math.round(energy)}%`}
      >
        <span>{getEmoji(energy, 'energy')}</span>
        <span>{Math.round(energy)}</span>
        <div style={{ width: 35, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
          <motion.div 
            style={{ 
              height: '100%', 
              background: getColor(energy), 
              borderRadius: 2 
            }}
            initial={{ width: 0 }}
            animate={{ width: `${energy}%` }}
          />
        </div>
      </motion.div>

      {/* Happiness */}
      <motion.div 
        className="status-item"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        title={`快乐: ${Math.round(happiness)}%`}
      >
        <span>{getEmoji(happiness, 'happiness')}</span>
        <span>{Math.round(happiness)}</span>
        <div style={{ width: 35, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
          <motion.div 
            style={{ 
              height: '100%', 
              background: getColor(happiness), 
              borderRadius: 2 
            }}
            initial={{ width: 0 }}
            animate={{ width: `${happiness}%` }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default StatusBar;
