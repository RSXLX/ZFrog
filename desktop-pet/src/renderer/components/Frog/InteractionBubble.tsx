import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractionBubbleProps {
  message: string;
  visible: boolean;
  onHide: () => void;
}

const InteractionBubble: React.FC<InteractionBubbleProps> = ({ message, visible, onHide }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.8 }}
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.95)',
            padding: '6px 14px',
            borderRadius: 16,
            fontSize: 13,
            color: '#333',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
            zIndex: 100,
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InteractionBubble;
