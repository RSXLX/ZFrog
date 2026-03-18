import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

type FrogState = 'idle' | 'sleeping' | 'eating' | 'happy' | 'excited' | 'scared' | 'dancing' | 'crying' | 'traveling' | 'thinking' | 'angry' | 'greeting' | 'stretching' | 'yawning' | 'looking' | 'walking' | 'patrolling';
type FrogMood = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad';

interface FrogProps {
  state: FrogState;
  mood: FrogMood;
  stats: { hunger: number; energy: number; happiness: number };
  onClick: (area: string) => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
}

// Extended animation variants
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
  },
  patrolling: {
    x: [-2, 2, -2],
    y: [0, -4, 0],
    transition: { duration: 0.45, repeat: Infinity, ease: "linear" }
  }
};

const Frog = ({ state, mood, stats, onClick, onDragStart, onDragEnd }: FrogProps) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isClickThroughRef = useRef(true);
  
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

  // Mouse enter/leave handling for click-through
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Disable click-through when mouse enters frog area
    if (window.electronAPI?.setClickThrough) {
      window.electronAPI.setClickThrough(false);
      isClickThroughRef.current = false;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Re-enable click-through when mouse leaves frog area
    if (!isDragging && window.electronAPI?.setClickThrough) {
      window.electronAPI.setClickThrough(true);
      isClickThroughRef.current = true;
    }
  }, [isDragging]);

  // Get stat-based appearance
  const getStatEffects = () => {
    if (stats.hunger < 15) return { scale: 0.86, filter: 'brightness(0.65) saturate(0.4)' };
    if (stats.hunger < 30) return { scale: 0.92, filter: 'brightness(0.8)' };
    if (stats.energy < 20) return { scale: 0.95, opacity: 0.85 };
    return {};
  };

  const statEffects = getStatEffects();

  // Handle drag
  const handleDragStart = useCallback((_event: MouseEvent | TouchEvent | PointerEvent) => {
    setIsDragging(true);
    onDragStart();
    if (window.electronAPI?.setClickThrough) {
      window.electronAPI.setClickThrough(false);
    }
  }, [onDragStart]);

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
    setIsDragging(false);
    // Get window position and calculate new position
    const windowX = info.point.x - 110;
    const windowY = info.point.y - 120;
    onDragEnd(windowX, windowY);
    
    // Re-enable click-through after drag ends
    setTimeout(() => {
      if (window.electronAPI?.setClickThrough) {
        window.electronAPI.setClickThrough(true);
      }
    }, 500);
  }, [onDragEnd]);

  return (
    <motion.div
      ref={containerRef}
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      drag={!isHovered}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <svg 
        viewBox="0 0 200 200" 
        width="200" 
        height="200"
        style={{ overflow: 'visible' }}
      >
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
            
            {state === 'eating' && (
              <g>
                <motion.circle cx="92" cy="112" r="3.5" fill="#f97316" animate={{ cy: [112, 98, 112], opacity: [1, 0.4, 0] }} transition={{ duration: 0.45, repeat: 4 }} />
                <motion.circle cx="108" cy="114" r="2.5" fill="#f97316" animate={{ cy: [114, 100, 114], opacity: [1, 0.4, 0] }} transition={{ duration: 0.45, repeat: 4, delay: 0.08 }} />
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
          
          {(mood === 'sad' || mood === 'very_sad' || state === 'crying') && (
            <g opacity="0.35">
              <circle cx="46" cy="100" r="5" fill="#94a3b8"/>
              <circle cx="154" cy="100" r="5" fill="#94a3b8"/>
            </g>
          )}
        </motion.g>
        
        {/* Hover indicator */}
        {isHovered && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <text x="100" y="145" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>
              🐸 点击互动
            </text>
          </motion.g>
        )}
      </svg>
    </motion.div>
  );
};

export default Frog;
