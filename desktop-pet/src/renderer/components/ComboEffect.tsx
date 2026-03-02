import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComboEffectProps {
  combo: number;
}

const ComboEffect: React.FC<ComboEffectProps> = ({ combo }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (combo > 1) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [combo]);

  if (!show || combo < 2) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 20 }}
        animate={{ scale: 1.2, opacity: 1, y: 0 }}
        exit={{ scale: 1.5, opacity: 0, y: -50 }}
        style={{
          position: 'absolute',
          top: -60,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
          padding: '8px 20px',
          borderRadius: 20,
          boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
          zIndex: 100,
        }}
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          style={{
            color: 'white',
            fontSize: 24,
            fontWeight: 'bold',
          }}
        >
          {combo}x COMBO! 
        </motion.span>
        <motion.span
          animate={{ rotate: [0, -10, 10, 0] }}
          style={{ fontSize: 20, marginLeft: 8 }}
        >
          🔥
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
};

export default ComboEffect;
