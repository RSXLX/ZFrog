import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface MouseFollowerProps {
  enabled: boolean;
}

const MouseFollower: React.FC<MouseFollowerProps> = ({ enabled }) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsFollowing(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsFollowing(true);
    };

    const handleMouseLeave = () => {
      setIsFollowing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled]);

  if (!enabled || !isFollowing) return null;

  return (
    <motion.div
      animate={{ x: position.x - 100, y: position.y - 100, opacity: 0.5 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="12" fill="none" stroke="rgba(74, 222, 128, 0.5)" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="15" cy="15" r="3" fill="rgba(74, 222, 128, 0.8)" />
      </svg>
    </motion.div>
  );
};

export default MouseFollower;
