import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiReactionProps {
  visible: boolean;
  emoji: string;
  x: number;
  y: number;
}

const EmojiReaction: React.FC<EmojiReactionProps> = ({ visible, emoji, x, y }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, y: 0, opacity: 1 }}
          animate={{ 
            scale: [0, 1.5, 1.2, 1],
            y: -80,
            opacity: [1, 1, 0],
            rotate: [0, -15, 15, -10, 10, 0],
          }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            fontSize: 32,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {emoji}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmojiReaction;
