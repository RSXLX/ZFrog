import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onSelect: (action: string) => void;
  onClose: () => void;
}

const menuItems = [
  { id: 'pet', icon: '👋', label: '抚摸' },
  { id: 'feed', icon: '🍎', label: '喂食' },
  { id: 'patrol', icon: '🎯', label: '巡逻' },
  { id: 'travel', icon: '✈️', label: '旅行' },
  { id: 'sleep', icon: '😴', label: '睡觉' },
];

const QuickMenu: React.FC<QuickMenuProps> = ({ visible, x, y, onSelect, onClose }) => {
  return (
    <AnimatePresence>
      {visible && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed',
              left: x,
              top: y,
              background: 'rgba(30, 30, 30, 0.95)',
              borderRadius: 12,
              padding: '8px 0',
              zIndex: 100,
              minWidth: 120,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {menuItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  background: 'transparent',
                  color: 'white',
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickMenu;
