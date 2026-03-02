import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

type FrogState = 'idle' | 'sleeping' | 'eating' | 'happy' | 'excited' | 'scared' | 'dancing' | 'crying' | 'traveling' | 'thinking' | 'angry' | 'greeting';
type FrogMood = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad';

interface FrogProps {
  state: FrogState;
  mood: FrogMood;
  stats: { hunger: number; energy: number; happiness: number };
  onClick: (area: string) => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
}

// Extended animation variants with more natural movements
const stateVariants: Record<FrogState, any> = {
  idle: {
    y: [0, 4, 0],
    scale: [1, 1.015, 1],
    transition: { 
      duration: 4, 
      repeat: Infinity, 
      ease: "easeInOut",
      times: [0, 0.5, 1]
    }
  },
  greeting: {
    y: [0, -15, 0, -10, 0],
    rotate: [0, -5, 5, -3, 0],
    transition: { duration: 1.5, repeat: Infinity }
  },
  sleeping: {
    y: 15,
    scale: 0.92,
    opacity: 0.75,
    transition: { duration: 0.5 }
  },
  eating: {
    scale: [1, 1.1, 0.95, 1.05, 1],
    transition: { duration: 0.4, repeat: 3 }
  },
  happy: {
    y: [0, -12, 0, -8, 0],
    rotate: [0, 3, -3, 2, 0],
    transition: { duration: 0.8, repeat: 2 }
  },
  excited: {
    y: [0, -25, 5, -20, 0, -15, 0],
    rotate: [0, -8, 8, -5, 5, -3, 0],
    scale: [1, 1.05, 1, 1.03, 1],
    transition: { duration: 0.6, repeat: 2 }
  },
  scared: {
    x: [-4, 4, -4, 4, 0],
    y: [0, 5, 0, 3, 0],
    rotate: [0, -10, 10, -5, 0],
    transition: { duration: 0.25, repeat: 4 }
  },
  dancing: {
    rotate: [0, -15, 15, -10, 10, -5, 0],
    y: [0, -8, 0, -5, 0],
    transition: { duration: 0.6, repeat: Infinity }
  },
  crying: {
    y: [0, 8, 0, 5, 0],
    scale: [1, 0.98, 1, 0.99, 1],
    transition: { duration: 1.5, repeat: Infinity }
  },
  traveling: {
    x: [-8, 8, -8],
    y: [0, -5, 0],
    transition: { duration: 0.6, repeat: Infinity, ease: "linear" }
  },
  thinking: {
    rotate: [0, 5, 0, -5, 0],
    y: [0, 3, 0, -2, 0],
    transition: { duration: 3, repeat: Infinity }
  },
  angry: {
    scale: [1, 1.08, 1, 1.06, 1],
    rotate: [0, 3, -3, 2, -2, 0],
    transition: { duration: 0.3, repeat: 3 }
  }
};

// Eye blink animation component
const BlinkEyes: React.FC<{ isBlinking: boolean }> = ({ isBlinking }) => (
  <>
    <motion.g animate={{ scaleY: isBlinking ? 0.1 : 1 }} transition={{ duration: 0.1 }}>
      <circle cx="70" cy="65" r="12" fill="#1a1a1a"/>
      <circle cx="74" cy="61" r="4" fill="white"/>
    </motion.g>
    <motion.g animate={{ scaleY: isBlinking ? 0.1 : 1 }} transition={{ duration: 0.1 }}>
      <circle cx="130" cy="65" r="12" fill="#1a1a1a"/>
      <circle cx="134" cy="61" r="4" fill="white"/>
    </motion.g>
  </>
);

// Status effect overlays
const StatusEffects: React.FC<{ state: FrogState }> = ({ state }) => {
  const effects: Record<FrogState, React.ReactNode> = {
    sleeping: (
      <g>
        <motion.text x="145" y="45" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0.8, 0.4, 0.8], y: [0, -15, -25] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} fill="#3b82f6" fontSize="24" fontWeight="bold">Z</motion.text>
        <motion.text x="160" y="40" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0.6, 0.3, 0.6], y: [0, -12, -20] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.3 }} fill="#3b82f6" fontSize="18" fontWeight="bold">z</motion.text>
        <motion.text x="172" y="48" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0.4, 0.2, 0.4], y: [0, -8, -15] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.6 }} fill="#3b82f6" fontSize="12" fontWeight="bold">z</motion.text>
      </g>
    ),
    excited: (
      <g>
        <motion.text x="15" y="25" initial={{ scale: 0, rotate: -180 }} animate={{ scale: [0, 1.2, 1], rotate: [0, -15, 0] }} transition={{ duration: 0.5 }} fontSize="22">💰</motion.text>
        <motion.text x="40" y="20" initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 0.9, 1] }} transition={{ duration: 0.4, delay: 0.2 }} fontSize="16">🚀</motion.text>
        <motion.text x="60" y="28" initial={{ scale: 0 }} animate={{ scale: [0, 1, 0.8, 1] }} transition={{ duration: 0.35, delay: 0.4 }} fontSize="14">✨</motion.text>
      </g>
    ),
    dancing: (
      <g>
        <motion.text x="10" y="25" animate={{ y: [0, -10, 0], rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5, repeat: Infinity }} fontSize="20">🎵</motion.text>
        <motion.text x="35" y="35" animate={{ y: [0, -8, 0], rotate: [0, -10, 10, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} fontSize="16">🎶</motion.text>
      </g>
    ),
    crying: (
      <g>
        <motion.circle cx="58" cy="82" r="5" fill="#3b82f6" opacity="0.8" animate={{ cy: [82, 95, 82], opacity: [0.8, 0.3, 0.8] }} transition={{ duration: 2, repeat: Infinity }} />
        <motion.circle cx="142" cy="82" r="5" fill="#3b82f6" opacity="0.8" animate={{ cy: [82, 95, 82], opacity: [0.8, 0.3, 0.8] }} transition={{ duration: 2, repeat: Infinity, delay: 0.2 }} />
      </g>
    ),
    traveling: (
      <g transform="translate(5, 5)">
        <motion.rect x="0" y="0" width="35" height="28" rx="4" fill="#f97316" stroke="#ea580c" strokeWidth="1" animate={{ x: [-2, 2, -2] }} transition={{ duration: 0.5, repeat: Infinity }} />
        <motion.text x="17" y="18" textAnchor="middle" fill="white" fontSize="14">🎒</motion.text>
      </g>
    ),
    thinking: (
      <g>
        <motion.text x="155" y="25" animate={{ scale: [0.8, 1.1, 0.9, 1], opacity: [0.6, 1, 0.8, 1] }} transition={{ duration: 2, repeat: Infinity }} fontSize="18">💭</motion.text>
        <motion.text x="172" y="40" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} fill="#666" fontSize="14">?</motion.text>
      </g>
    ),
    angry: (
      <g>
        <motion.text x="50" y="40" animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 0.5, repeat: Infinity }} fontSize="16">💢</motion.text>
        <motion.text x="140" y="40" animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }} fontSize="16">💢</motion.text>
      </g>
    ),
    greeting: (
      <motion.text x="80" y="35" animate={{ scale: [0.8, 1.2, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1, repeat: Infinity }} fontSize="20">👋</motion.text>
    ),
    idle: null,
    happy: (
      <g>
        <motion.text x="45" y="35" initial={{ scale: 0, y: 10 }} animate={{ scale: [0, 1.2, 1], y: [10, 0, 0] }} transition={{ duration: 0.5 }} fontSize="14">💕</motion.text>
        <motion.text x="145" y="35" initial={{ scale: 0, y: 10 }} animate={{ scale: [0, 1.2, 1], y: [10, 0, 0] }} transition={{ duration: 0.5, delay: 0.1 }} fontSize="14">💕</motion.text>
      </g>
    ),
    scared: (
      <g>
        <motion.text x="15" y="25" animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.3, repeat: Infinity }} fontSize="18">😱</motion.text>
      </g>
    ),
    eating: null,
  };
  return <>{effects[state]}</>;
};

const Frog: React.FC<FrogProps> = ({ state, mood, stats, onClick, onDragStart, onDragEnd }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Get appearance modifications based on stats
  const getMoodEmoji = () => {
    if (stats.happiness > 70) return '😊';
    if (stats.happiness > 40) return '😐';
    if (stats.happiness > 20) return '😟';
    return '😭';
  };

  const getHungerEffect = () => {
    if (stats.hunger < 20) return { scale: 0.88, filter: 'brightness(0.7) saturate(0.5)' };
    if (stats.hunger < 40) return { scale: 0.94, filter: 'brightness(0.85)' };
    return {};
  };

  const hungerEffect = getHungerEffect();

  return (
    <motion.div
      className="frog-svg"
      variants={stateVariants}
      animate={state}
      style={{
        cursor: 'pointer',
        transformOrigin: 'center bottom',
        ...hungerEffect
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
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
            <stop offset="0" stopColor="#fca5a5" stopOpacity="0.9" />
            <stop offset="1" stopColor="#f87171" stopOpacity="0.6" />
          </linearGradient>
          
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dy="4" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <style>{`
          .frog-body { transform-origin: 100px 180px; }
          .eye-pupil { transform-origin: center; }
        `}</style>

        <motion.g className="frog-body" filter="url(#softShadow)">
          {/* Left Foot */}
          <motion.ellipse cx="60" cy="175" rx="28" ry="14" fill="#4ADE80" stroke="#22C55E" strokeWidth="1.5" animate={state === 'walking' ? { cx: [55, 65, 55] } : {}} transition={state === 'walking' ? { duration: 0.4, repeat: Infinity } : {}} />
          <motion.ellipse cx="140" cy="175" rx="28" ry="14" fill="#4ADE80" stroke="#22C55E" strokeWidth="1.5" animate={state === 'walking' ? { cx: [145, 135, 145] } : {}} transition={state === 'walking' ? { duration: 0.4, repeat: Infinity } : {}} />
          
          {/* Body */}
          <motion.path
            d="M 45 75 A 32 32 0 1 1 90 60 Q 100 70 110 60 A 32 32 0 1 1 155 75 C 180 90 190 120 190 145 C 190 180 150 190 100 190 C 50 190 10 180 10 145 C 10 120 20 90 45 75 Z"
            fill="url(#skinGradient)"
            stroke="#22C55E"
            strokeWidth="1.5"
            animate={state === 'excited' ? { scale: [1, 1.02, 1] } : {}}
            transition={state === 'excited' ? { duration: 0.3, repeat: Infinity } : {}}
          />
          
          {/* Eyes */}
          <g onClick={(e) => { e.stopPropagation(); onClick('head'); }} style={{ cursor: 'pointer' }}>
            <circle cx="70" cy="65" r="18" fill="white" stroke="#22C55E" strokeWidth="1"/>
            <circle cx="130" cy="65" r="18" fill="white" stroke="#22C55E" strokeWidth="1"/>
            
            {/* Pupils with blink */}
            <motion.g className="eye-pupil" animate={{ scaleY: isBlinking ? 0.1 : 1 }}>
              <circle cx="70" cy="65" r="12" fill="#1a1a1a"/>
              <circle cx="74" cy="61" r="4" fill="white"/>
            </motion.g>
            <motion.g className="eye-pupil" animate={{ scaleY: isBlinking ? 0.1 : 1 }}>
              <circle cx="130" cy="65" r="12" fill="#1a1a1a"/>
              <circle cx="134" cy="61" r="4" fill="white"/>
            </motion.g>
          </g>
          
          {/* Mouth */}
          <g onClick={(e) => { e.stopPropagation(); onClick('mouth'); }} style={{ cursor: 'pointer' }}>
            {state === 'crying' || mood === 'sad' || mood === 'very_sad' ? (
              <path d="M 85 120 Q 100 115 115 120" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round"/>
            ) : state === 'happy' || state === 'excited' ? (
              <path d="M 80 108 Q 100 128 120 108" fill="none" stroke="#166534" strokeWidth="3.5" strokeLinecap="round"/>
            ) : (
              <path d="M 85 112 Q 100 122 115 112" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round"/>
            )}
            
            {/* Eating animation - food particles */}
            {state === 'eating' && (
              <g>
                <motion.circle cx="90" cy="110" r="4" fill="#f97316" animate={{ cy: [110, 95, 110], opacity: [1, 0.5, 0] }} transition={{ duration: 0.5, repeat: 3 }} />
                <motion.circle cx="108" cy="112" r="3" fill="#f97316" animate={{ cy: [112, 98, 112], opacity: [1, 0.5, 0], delay: 0.1 }} transition={{ duration: 0.5, repeat: 3 }} />
              </g>
            )}
          </g>
          
          {/* Cheeks - happiness indicator */}
          {(mood === 'happy' || mood === 'very_happy' || state === 'happy' || state === 'excited') && (
            <>
              <ellipse cx="48" cy="95" rx="10" ry="6" fill="url(#cheekGradient)" opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
              </ellipse>
              <ellipse cx="152" cy="95" rx="10" ry="6" fill="url(#cheekGradient)" opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite"/>
              </ellipse>
            </>
          )}
          
          {/* Sad cheeks - when unhappy */}
          {(mood === 'sad' || mood === 'very_sad' || state === 'crying') && (
            <g opacity="0.4">
              <circle cx="48" cy="100" r="6" fill="#94a3b8"/>
              <circle cx="152" cy="100" r="6" fill="#94a3b8"/>
            </g>
          )}
        </motion.g>
        
        {/* Status Effects */}
        <StatusEffects state={state} />
        
        {/* Interaction hint - shows on hover when idle */}
        {state === 'idle' && isHovered && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <text x="100" y="145" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              👆 点击互动
            </text>
          </motion.g>
        )}
      </svg>
    </motion.div>
  );
};

export default Frog;
