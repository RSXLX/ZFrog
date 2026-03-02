import React from 'react';
import { motion } from 'framer-motion';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  action: () => void;
}

interface QuickActionBarProps {
  actions: QuickAction[];
  visible: boolean;
}

const QuickActionBar: React.FC<QuickActionBarProps> = ({ actions, visible }) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'absolute',
        bottom: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        background: 'rgba(0,0,0,0.7)',
        padding: '8px 16px',
        borderRadius: 30,
        backdropFilter: 'blur(10px)',
      }}
    >
      {actions.map(action => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={action.action}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
          title={action.label}
        >
          {action.icon}
        </motion.button>
      ))}
    </motion.div>
  );
};

export default QuickActionBar;
