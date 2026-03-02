import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DragTrailProps {
  isDragging: boolean;
  startX: number;
  startY: number;
}

const DragTrail: React.FC<DragTrailProps> = ({ isDragging, startX, startY }) => {
  const [trails, setTrails] = useState<{x: number; y: number; id: number}[]>([]);

  useEffect(() => {
    if (isDragging) {
      const interval = setInterval(() => {
        setTrails(prev => [
          ...prev.slice(-8),
          { x: startX, y: startY, id: Date.now() }
        ]);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setTrails([]);
    }
  }, [isDragging, startX, startY]);

  return (
    <AnimatePresence>
      {isDragging && trails.map((trail, i) => (
        <motion.div
          key={trail.id}
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 0.3, opacity: 0 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            left: trail.x,
            top: trail.y,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74,222,128,0.6) 0%, transparent 70%)',
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </AnimatePresence>
  );
};

export default DragTrail;
