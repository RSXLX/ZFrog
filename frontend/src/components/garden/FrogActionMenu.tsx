import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionOption {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  color: string;
}

interface FrogActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  actions: ActionOption[];
}

export const FrogActionMenu: React.FC<FrogActionMenuProps> = ({
  isOpen,
  onClose,
  position,
  actions
}) => {
  // Calculate positions for radial layout
  const radius = 80; // Distance from center
  const startAngle = -90; // Start at top
  const angleStep = 360 / actions.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={onClose} 
          />

          {/* Menu Items */}
          <div 
            className="absolute z-50 pointer-events-none"
            style={{ 
              left: `${position.x}%`, 
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)' // Center on frog
            }}
          >
            {actions.map((action, index) => {
              const angle = (startAngle + index * angleStep) * (Math.PI / 180);
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <motion.button
                  key={action.id}
                  className={`absolute w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl pointer-events-auto border-2 border-white
                    bg-gradient-to-br ${action.color}`}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{ x, y, scale: 1, opacity: 1 }}
                  exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 20, 
                    delay: index * 0.05 
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span role="img" aria-label={action.label}>{action.icon}</span>
                  <span className="absolute top-full mt-1 text-xs font-bold text-white drop-shadow-md whitespace-nowrap bg-black/50 px-1 rounded">
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
