import React from 'react';
import { motion } from 'framer-motion';

interface SceneObjectProps {
  id: string;
  imageSrc: string;
  label: string;
  position: { x: number; y: number };
  scale?: number;
  hasNotification?: boolean;
  onClick: () => void;
}

export const SceneObject: React.FC<SceneObjectProps> = ({
  imageSrc,
  label,
  position,
  scale = 1,
  hasNotification = false,
  onClick
}) => {
  return (
    <motion.div
      className="absolute cursor-pointer group"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: Math.round(position.y) // Simple depth sorting
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Object Image */}
      <motion.img 
        src={imageSrc} 
        alt={label}
        className="drop-shadow-lg"
        style={{ width: `${80 * scale}px`, mixBlendMode: 'multiply' }}
        animate={hasNotification ? { 
          rotate: [0, -5, 5, -5, 5, 0],
          y: [0, -5, 0]
        } : {}}
        transition={hasNotification ? { 
          duration: 2, 
          repeat: Infinity,
          repeatDelay: 3 
        } : {}}
        draggable={false}
      />

      {/* Label Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
        {label}
      </div>

      {/* Notification Dot */}
      {hasNotification && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </motion.div>
  );
};
