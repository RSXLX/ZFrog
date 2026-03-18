import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HaloMenuProps {
  visible: boolean;
  onSelect: (item: string) => void;
  onClose: () => void;
}

const menuItems = [
  { id: 'travel', icon: '✈️', label: '旅行' },
  { id: 'patrol', icon: '🎯', label: '巡逻' },
  { id: 'tasks', icon: '📋', label: '任务' },
  { id: 'bag', icon: '🎒', label: '背包' },
  { id: 'collection', icon: '📚', label: '图鉴' },
  { id: 'friends', icon: '👥', label: '好友' },
  { id: 'badges', icon: '🏅', label: '徽章' },
  { id: 'home', icon: '🏠', label: '家园' },
  { id: 'profile', icon: '🪪', label: '资料' },
  { id: 'monitor', icon: '⛓️', label: '监控' },
  { id: 'settings', icon: '⚙️', label: '设置' },
];

const HaloMenu: React.FC<HaloMenuProps> = ({ visible, onSelect, onClose }) => {
  const radius = 92;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="halo-menu visible"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: -1,
            }}
            onClick={onClose}
          />
          
          {/* Menu items in circle */}
          {menuItems.map((item, index) => {
            const angle = ((index * (360 / menuItems.length)) - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            return (
              <motion.button
                key={item.id}
                className="halo-btn"
                style={{
                  left: `calc(50% + ${x}px - 20px)`,
                  top: `calc(50% + ${y}px - 20px)`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onSelect(item.id);
                }}
                title={item.label}
              >
                {item.icon}
              </motion.button>
            );
          })}
          
          {/* Center button */}
          <motion.button
            className="halo-btn"
            style={{
              left: 'calc(50% - 20px)',
              top: 'calc(50% - 20px)',
              background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
              fontSize: 24,
            }}
            whileHover={{ scale: 1.1 }}
            onClick={onClose}
          >
            🐸
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HaloMenu;
