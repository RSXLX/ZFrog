import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

type FrogState = 'idle' | 'sleeping' | 'eating' | 'happy' | 'excited' | 'scared' | 'dancing' | 'crying' | 'traveling' | 'thinking' | 'angry' | 'greeting' | 'stretching' | 'yawning' | 'looking' | 'walking';
type FrogMood = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad';

interface FrogProps {
  state: FrogState;
  mood: FrogMood;
  stats: { hunger: number; energy: number; happiness: number };
  onClick: (area: string) => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
}

// Extended animation variants - more natural movements
const stateVariants: Record<FrogState, any> = {
  idle: {
    y: [0, 3, 0],
    scale: [1, 1.01, 1],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
  },
  greeting: {
    y: [0, -12, 0, -8, 0],
    rotate: [0, -4, 4, -2, 0],
    transition: { duration: 1.2, repeat: 2 }
  },
  stretching: {
    scaleX: [1, 1.15, 1.2, 1],
    scaleY: [1, 1.1, 0.95, 1],
    y: [0, -5, 0],
    transition: { duration: 2, repeat: 1 }
  },
  yawning: {
    scale: [1, 1.02, 1],
    y: [0, 2, 0],
    transition: { duration: 3 }
  },
  looking: {
    rotate: [0, 3, -3, 2, 0],
    transition: { duration: 2 }
  },
  sleeping: {
    y: 12,
    scale: 0.92,
    opacity: 0.75,
    transition: { duration: 0.5 }
  },
  eating: {
    scale: [1, 1.08, 0.96, 1.04, 1],
    transition: { duration: 0.35, repeat: 4 }
  },
  happy: {
    y: [0, -10, 0, -6, 0],
    rotate: [0, 2, -2, 1, 0],
    transition: { duration: 0.6, repeat: 2 }
  },
  excited: {
    y: [0, -20, 5, -15, 0, -10, 0],
    rotate: [0, -6, 6, -4, 4, -2, 0],
    scale: [1, 1.04, 1, 1.02, 1],
    transition: { duration: 0.5, repeat: 3 }
  },
  scared: {
    x: [-3, 3, -3, 3, 0],
    y: [0, 4, 0, 2, 0],
    rotate: [0, -8, 8, -4, 0],
    transition: { duration: 0.2, repeat: 5 }
  },
  dancing: {
    rotate: [0, -12, 12, -8, 8, -4, 0],
    y: [0, -6, 0, -4, 0],
    transition: { duration: 0.5, repeat: Infinity }
  },
  crying: {
    y: [0, 6, 0, 4, 0],
    scale: [1, 0.98, 1, 0.99, 1],
    transition: { duration: 1.2, repeat: Infinity }
  },
  traveling: {
    x: [-6, 6, -6],
    y: [0, -4, 0],
    transition: { duration: 0.5, repeat: Infinity, ease: "linear" }
  },
  thinking: {
    rotate: [0, 4, 0, -4, 0],
    y: [0, 2, 0, -1, 0],
    transition: { duration: 2.5, repeat: Infinity }
  },
  angry: {
    scale: [1, 1.06, 1, 1.04, 1],
    rotate: [0, 2, -2, 1, -1, 0],
    transition: { duration: 0.25, repeat: 4 }
  },
  walking: {
    y: [0, -3, 0],
    transition: { duration: 0.4, repeat: Infinity, ease: "linear" }
  }
};

// Status effect overlays
const StatusEffects: React.FC<{ state: FrogState; mood: FrogMood }> = ({ state, mood }) => {
  const effects: Record<FrogState, React.ReactNode> = {
    sleeping: (
      <g>
        <motion.text x="148" y="48" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0.7, 0.3, 0.7], y: [0, -12, -20] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} fill="#3b82f6" fontSize="22" fontWeight="bold">Z</motion.text>
        <motion.text x="162" y="42" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0.5, 0.2, 0.5], y: [0, -10, -16] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.25 }} fill="#3b82f6" fontSize="16" fontWeight="bold">z</motion.text>
        <motion.text x="174" y="50" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0.3, 0.1, 0.3], y: [0, -6, -12] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.5 }} fill="#3b82f6" fontSize="10" fontWeight="bold">z</motion.text>
      </g>
    ),
    yawning: (
      <g>
        <motion.text x="100" y="35" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }} transition={{ duration: 2.5 }} fontSize="20">😴</motion.text>
      </g>
    ),
    excited: (
      <g>
        <motion.text x="12" y="22" initial={{ scale: 0, rotate: -180 }} animate={{ scale: [0, 1.1, 1], rotate: [0, -12, 0] }} transition={{ duration: 0.4 }} fontSize="20">💰</motion.text>
        <motion.text x="35" y="18" initial={{ scale: 0 }} animate={{ scale: [0, 1, 0.9, 1] }} transition={{ duration: 0.35, delay: 0.15 }} fontSize="14">🚀</motion.text>
        <motion.text x="55" y="25" initial={{ scale: 0 }} animate={{ scale: [0, 0.9, 0.7, 0.9] }} transition={{ duration: 0.3, delay: 0.3 }} fontSize="12">✨</motion.text>
      </g>
    ),
    dancing: (
      <g>
        <motion.text x="8" y="22" animate={{ y: [0, -8, 0], rotate: [0, 12, -12, 0] }} transition={{ duration: 0.45, repeat: Infinity }} fontSize="18">🎵</motion.text>
        <motion.text x="32" y="32" animate={{ y: [0, -6, 0], rotate: [0, -8, 8, 0] }} transition={{ duration: 0.55, repeat: Infinity, delay: 0.15 }} fontSize="14">🎶</motion.text>
      </g>
    ),
    crying: (
      <g>
        <motion.circle cx="55" cy="80" r="4" fill="#3b82f6" opacity="0.75" animate={{ cy: [80, 92, 80], opacity: [0.75, 0.25, 0.75] }} transition={{ duration: 1.8, repeat: Infinity }} />
        <motion.circle cx="145" cy="80" r="4" fill="#3b82f6" opacity="0.75" animate={{ cy: [80, 92, 80], opacity: [0.75, 0.25, 0.75] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.15 }} />
      </g>
    ),
    traveling: (
      <g transform="translate(3, 3)">
        <motion.rect x="0" y="0" width="32" height="26" rx="3" fill="#f97316" stroke="#ea580c" strokeWidth="1" animate={{ x: [-1, 1, -1] }} transition={{ duration: 0.45, repeat: Infinity }} />
        <motion.text x="16" y="17" textAnchor="middle" fill="white" fontSize="13">🎒</motion.text>
      </g>
    ),
    thinking: (
      <g>
        <motion.text x="158" y="28" animate={{ scale: [0.8, 1.1, 0.9, 1], opacity: [0.5, 1, 0.7, 1] }} transition={{ duration: 1.8, repeat: Infinity }} fontSize="16">💭</motion.text>
        <motion.text x="175" y="42" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }} fill="#555" fontSize="12">?</motion.text>
      </g>
    ),
    angry: (
      <g>
        <motion.text x="48" y="38" animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 0.4, repeat: Infinity }} fontSize="14">💢</motion.text>
        <motion.text x="142" y="38" animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 0.4, repeat: Infinity, delay: 0.08 }} fontSize="14">💢</motion.text>
      </g>
    ),
    greeting: (
      <motion.text x="78" y="38" initial={{ scale: 0, y: 8 }} animate={{ scale: [0, 1.1, 1], y: [8, 0, 0] }} transition={{ duration: 0.8, repeat: 2 }} fontSize="18">👋</motion.text>
    ),
    happy: (
      <g>
        <motion.text x="42" y="32" initial={{ scale: 0, y: 8 }} animate={{ scale: [0, 1.1, 1], y: [8, 0, 0] }} transition={{ duration: 0.4 }} fontSize="12">💕</motion.text>
        <motion.text x="148" y="32" initial={{ scale: 0, y: 8 }} animate={{ scale: [0, 1.1, 1], y: [8, 0, 0] }} transition={{ duration: 0.4, delay: 0.08 }} fontSize="12">💕</motion.text>
      </g>
    ),
    scared: (
      <motion.text x="12" y="22" animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.25, repeat: Infinity }} fontSize="16">😱</motion.text>
    ),
    looking: (
      <motion.text x="100" y="35" animate={{ scale: [0.8, 1, 0.8], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }} fontSize="14">👀</motion.text>
    ),
    idle: null,
    eating: null,
    stretching: null,
    walking: null,
  };
  return <>{effects[state]}</>;
};

const Frog: React.FC<FrogProps> = ({ state, mood, stats, onClick, onDragStart, onDragEnd }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.6 && state === 'idle') {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 120);
      }
    }, 2500 + Math.random() * 3000);
    return () => clearInterval(blinkInterval);
  }, [state]);

  // Get stat-based appearance
  const getStatEffects = () => {
    if (stats.hunger < 15) return { scale: 0.86, filter: 'brightness(0.65) saturate(0.4)' };
    if (stats.hunger < 30) return { scale: 0.92, filter: 'brightness(0.8)' };
    if (stats.energy < 20) return { scale: 0.95, opacity: 0.85 };
    return {};
  };

  const statEffects = getStatEffects();

  return (
    <motion.div
      className="frog-svg"
      variants={stateVariants}
      animate={state}
      style={{
        cursor: 'pointer',
        transformOrigin: 'center bottom',
        ...statEffects
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      drag={!isHovered}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={(e: any) => onDragEnd(e.clientX, e.clientY)}
    >
      <svg viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="skinGradient" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0.4" stopColor="#4ADE80" />
            <stop offset="0.8" stopColor="#FCD34D" />
            <stop offset="1.0" stopColor="#FDBA74" />
          </linearGradient>
          <linearGradient id="cheekGradient" x1="0" y1="0" x2="1" y2="1" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fca5a5" stopOpacity="0.85" />
            <stop offset="1" stopColor="#f87171" stopOpacity="0.5" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>
            <feOffset dy="3" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <style>{`
          .frog-body { transform-origin: 100px 180px; }
          .eye-pupil { transform-origin: center; }
        `}</style>

        <motion.g className="frog-body" filter="url(#softShadow)">
          {/* Feet */}
          <motion.ellipse cx="58" cy="176" rx="26" ry="13" fill="#4ADE80" stroke="#22C55E" strokeWidth="1.2" />
          <motion.ellipse cx="142" cy="176" rx="26" ry="13" fill="#4ADE80" stroke="#22C55E" strokeWidth="1.2" />
          
          {/* Body */}
          <motion.path
            d="M 45 75 A 32 32 0 1 1 90 60 Q 100 70 110 60 A 32 32 0 1 1 155 75 C 180 90 190 120 190 145 C 190 180 150 190 100 190 C 50 190 10 180 10 145 C 10 120 20 90 45 75 Z"
            fill="url(#skinGradient)"
            stroke="#22C55E"
            strokeWidth="1.5"
          />
          
          {/* Eyes */}
          <g onClick={(e) => { e.stopPropagation(); onClick('head'); }} style={{ cursor: 'pointer' }}>
            <circle cx="70" cy="65" r="17" fill="white" stroke="#22C55E" strokeWidth="1"/>
            <circle cx="130" cy="65" r="17" fill="white" stroke="#22C55E" strokeWidth="1"/>
            
            {/* Pupils */}
            <motion.g className="eye-pupil" animate={{ scaleY: isBlinking ? 0.1 : 1 }} transition={{ duration: 0.08 }}>
              <circle cx="70" cy="65" r="11" fill="#1a1a1a"/>
              <circle cx="73" cy="62" r="3.5" fill="white"/>
            </motion.g>
            <motion.g className="eye-pupil" animate={{ scaleY: isBlinking ? 0.1 : 1 }} transition={{ duration: 0.08 }}>
              <circle cx="130" cy="65" r="11" fill="#1a1a1a"/>
              <circle cx="133" cy="62" r="3.5" fill="white"/>
            </motion.g>
          </g>
          
          {/* Mouth */}
          <g onClick={(e) => { e.stopPropagation(); onClick('mouth'); }} style={{ cursor: 'pointer' }}>
            {state === 'crying' || mood === 'sad' || mood === 'very_sad' ? (
              <path d="M 87 122 Q 100 118 113 122" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round"/>
            ) : state === 'yawning' ? (
              <path d="M 85 115 Q 100 135 115 115" fill="#1a1a1a" stroke="#166534" strokeWidth="1"/>
            ) : state === 'happy' || state === 'excited' ? (
              <path d="M 82 110 Q 100 130 118 110" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round"/>
            ) : (
              <path d="M 87 114 Q 100 124 113 114" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round"/>
            )}
            
            {/* Eating particles */}
            {state === 'eating' && (
              <g>
                <motion.circle cx="92" cy="112" r="3.5" fill="#f97316" animate={{ cy: [112, 98, 112], opacity: [1, 0.4, 0] }} transition={{ duration: 0.45, repeat: 4 }} />
                <motion.circle cx="108" cy="114" r="2.5" fill="#f97316" animate={{ cy: [114, 100, 114], opacity: [1, 0.4, 0], delay: 0.08 }} transition={{ duration: 0.45, repeat: 4 }} />
              </g>
            )}
          </g>
          
          {/* Cheeks */}
          {(mood === 'happy' || mood === 'very_happy' || state === 'happy' || state === 'excited' || state === 'greeting') && (
            <>
              <ellipse cx="46" cy="96" rx="9" ry="5" fill="url(#cheekGradient)" opacity="0.65" />
              <ellipse cx="154" cy="96" rx="9" ry="5" fill="url(#cheekGradient)" opacity="0.65" />
            </>
          )}
          
          {/* Sad cheeks */}
          {(mood === 'sad' || mood === 'very_sad' || state === 'crying') && (
            <g opacity="0.35">
              <circle cx="46" cy="100" r="5" fill="#94a3b8"/>
              <circle cx="154" cy="100" r="5" fill="#94a3b8"/>
            </g>
          )}
        </motion.g>
        
        {/* Status Effects */}
        <StatusEffects state={state} mood={mood} />
        
        {/* Hover hint */}
        {state === 'idle' && isHovered && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <text x="100" y="148" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>
              👆 点击互动
            </text>
          </motion.g>
        )}
      </svg>
    </motion.div>
  );
};

export default Frog;
