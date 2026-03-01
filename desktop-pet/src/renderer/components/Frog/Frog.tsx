import React from 'react';
import { motion } from 'framer-motion';

type FrogState = 'idle' | 'sleeping' | 'eating' | 'happy' | 'excited' | 'scared' | 'dancing' | 'crying' | 'traveling' | 'thinking';
type FrogMood = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad';

interface FrogProps {
  state: FrogState;
  mood: FrogMood;
  stats: { hunger: number; energy: number; happiness: number };
  onClick: (area: string) => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
}

// Animation variants
const stateVariants: Record<FrogState, any> = {
  idle: {
    y: [0, 3, 0],
    scale: [1, 1.02, 1],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  },
  sleeping: {
    y: 10,
    scale: 0.95,
    opacity: 0.8,
    transition: { duration: 0.5 }
  },
  eating: {
    scale: [1, 1.08, 1],
    transition: { duration: 0.3, repeat: 3 }
  },
  happy: {
    y: [0, -10, 0],
    transition: { duration: 0.5, repeat: 2 }
  },
  excited: {
    y: [0, -20, 0, -20, 0],
    rotate: [0, -5, 5, -5, 0],
    transition: { duration: 0.5, repeat: 3 }
  },
  scared: {
    x: [-3, 3, -3, 3, 0],
    transition: { duration: 0.2, repeat: 5 }
  },
  dancing: {
    rotate: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.8, repeat: Infinity }
  },
  crying: {
    y: [0, 5, 0],
    transition: { duration: 1, repeat: Infinity }
  },
  traveling: {
    x: [-5, 5, -5],
    transition: { duration: 0.5, repeat: Infinity }
  },
  thinking: {
    rotate: [0, 3, 0, -3, 0],
    transition: { duration: 2, repeat: Infinity }
  }
};

// Get appearance based on stats
const getAppearance = (stats: { hunger: number; energy: number; happiness: number }, mood: FrogMood) => {
  const appearances: any = {
    hungry: {
      scale: Math.max(0.85, stats.hunger / 100),
      filter: 'brightness(0.8)',
      overlay: null
    },
    tired: {
      eyes: 'droopy',
      opacity: 0.85
    },
    sad: {
      mouth: 'frown',
      tears: true
    },
    normal: {
      eyes: 'normal',
      mouth: 'smile'
    }
  };
  
  if (stats.hunger < 30) return { ...appearances.normal, ...appearances.hungry };
  if (stats.energy < 30) return { ...appearances.normal, ...appearances.tired };
  if (stats.happiness < 30 || mood === 'sad' || mood === 'very_sad') return { ...appearances.normal, ...appearances.sad };
  return appearances.normal;
};

const Frog: React.FC<FrogProps> = ({ state, mood, stats, onClick, onDragStart, onDragEnd }) => {
  const appearance = getAppearance(stats, mood);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragPos, setDragPos] = React.useState({ x: 0, y: 0 });

  const handleDragStart = () => {
    setIsDragging(true);
    onDragStart();
  };

  const handleDragEnd = (e: React.MouseEvent) => {
    setIsDragging(false);
    onDragEnd(e.clientX, e.clientY);
  };

  return (
    <motion.div
      className="frog-svg"
      variants={stateVariants}
      animate={state}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: `scale(${appearance.scale || 1})`
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      drag={!isDragging}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <svg viewBox="0 0 200 200" width="200" height="200" style={{ filter: appearance.filter }}>
        <defs>
          <linearGradient id="skinGradient" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0.4" stopColor="#4ADE80" />
            <stop offset="0.8" stopColor="#FCD34D" />
            <stop offset="1.0" stopColor="#FDBA74" />
          </linearGradient>
          
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dy="3" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <style>{`
          @keyframes squish {
            0%, 100% { transform: scale(1, 1) translateY(0); }
            50% { transform: scale(1.03, 0.97) translateY(3px); }
          }
          @keyframes blink {
            0%, 96%, 100% { transform: scaleY(1); }
            98% { transform: scaleY(0.1); }
          }
          .frog-body { transform-origin: bottom center; animation: squish 3.5s ease-in-out infinite; }
          .frog-pupil { transform-origin: center; animation: blink 4.5s infinite; }
          .clickable { cursor: pointer; }
          .clickable:hover { filter: brightness(1.1); }
        `}</style>

        {/* Body */}
        <g className="frog-body" filter="url(#softShadow)">
          {/* Left Foot - Drag Area */}
          <g className="clickable" onClick={(e) => { e.stopPropagation(); onClick('foot'); }}>
            <ellipse cx="60" cy="175" rx="25" ry="12" fill="#4ADE80" stroke="#22C55E"/>
            <ellipse cx="140" cy="175" rx="25" ry="12" fill="#4ADE80" stroke="#22C55E"/>
          </g>
          
          {/* Body - Poke Area */}
          <path 
            className="clickable"
            onClick={(e) => { e.stopPropagation(); onClick('body'); }}
            d="M 45 75 A 32 32 0 1 1 90 60 Q 100 70 110 60 A 32 32 0 1 1 155 75 C 180 90 190 120 190 145 C 190 180 150 190 100 190 C 50 190 10 180 10 145 C 10 120 20 90 45 75 Z" 
            fill="url(#skinGradient)" 
            stroke="#22C55E" 
            strokeWidth="1.5"
          />
          
          {/* Left Eye - Head/Pet Area */}
          <g className="clickable" onClick={(e) => { e.stopPropagation(); onClick('head'); }}>
            <circle cx="70" cy="65" r="18" fill="white" stroke="#22C55E" strokeWidth="1"/>
            <circle cx="70" cy="65" r="12" fill="#1a1a1a"/>
            <circle cx="74" cy="61" r="4" fill="white" className="frog-pupil"/>
            {/* Droopy eyes when tired */}
            {appearance.opacity === 0.85 && (
              <path d="M 55 60 Q 70 55 85 60" stroke="#22C55E" strokeWidth="1" fill="none" opacity="0.5"/>
            )}
          </g>
          
          {/* Right Eye */}
          <g className="clickable" onClick={(e) => { e.stopPropagation(); onClick('head'); }}>
            <circle cx="130" cy="65" r="18" fill="white" stroke="#22C55E" strokeWidth="1"/>
            <circle cx="130" cy="65" r="12" fill="#1a1a1a"/>
            <circle cx="134" cy="61" r="4" fill="white" className="frog-pupil"/>
            {appearance.opacity === 0.85 && (
              <path d="M 115 60 Q 130 55 145 60" stroke="#22C55E" strokeWidth="1" fill="none" opacity="0.5"/>
            )}
          </g>
          
          {/* Mouth - Feed Area */}
          <g className="clickable" onClick={(e) => { e.stopPropagation(); onClick('mouth'); }}>
            {appearance.mouth === 'frown' ? (
              <path d="M 85 120 Q 100 110 115 120" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round"/>
            ) : (
              <path 
                d="M 85 110 Q 100 125 115 110" 
                fill="none" 
                stroke="#166534" 
                strokeWidth="3" 
                strokeLinecap="round"
              />
            )}
            {/* Hungry animation */}
            {state !== 'eating' && stats.hunger < 30 && (
              <circle cx="100" cy="115" r="3" fill="#ef4444" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite"/>
              </circle>
            )}
            {/* Eating animation */}
            {state === 'eating' && (
              <g>
                <circle cx="95" cy="112" r="5" fill="#f97316"/>
                <circle cx="108" cy="112" r="4" fill="#f97316"/>
              </g>
            )}
          </g>
          
          {/* Cheeks - Happy */}
          {(mood === 'happy' || mood === 'very_happy') && (
            <>
              <circle cx="50" cy="95" r="8" fill="#fca5a5" opacity="0.6"/>
              <circle cx="150" cy="95" r="8" fill="#fca5a5" opacity="0.6"/>
            </>
          )}
          
          {/* Tears - Sad */}
          {appearance.tears && (
            <>
              <circle cx="60" cy="80" r="4" fill="#3b82f6" opacity="0.7">
                <animate attributeName="cy" values="80;95;80" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="140" cy="80" r="4" fill="#3b82f6" opacity="0.7">
                <animate attributeName="cy" values="80;95;80" dur="2s" repeatCount="indefinite"/>
              </circle>
            </>
          )}
        </g>
        
        {/* Status effects overlay */}
        {state === 'sleeping' && (
          <g>
            <text x="140" y="50" fontSize="24" fill="#3b82f6">Z</text>
            <text x="155" y="45" fontSize="18" fill="#3b82f6">z</text>
            <text x="168" y="50" fontSize="12" fill="#3b82f6">z</text>
          </g>
        )}
        
        {state === 'excited' && (
          <g>
            <text x="10" y="30" fontSize="20">💰</text>
            <text x="35" y="25" fontSize="15">🚀</text>
          </g>
        )}
        
        {state === 'dancing' && (
          <g>
            <text x="10" y="30" fontSize="20">🎵</text>
            <text x="35" y="35" fontSize="15">🎶</text>
          </g>
        )}
        
        {state === 'crying' && (
          <g>
            <text x="10" y="25" fontSize="18">💔</text>
            <text x="35" y="30" fontSize="12">🌧️</text>
          </g>
        )}
        
        {state === 'thinking' && (
          <g>
            <text x="155" y="30" fontSize="16">💭</text>
            <text x="170" y="45" fontSize="12" fill="#666">?</text>
          </g>
        )}
        
        {state === 'traveling' && (
          <g transform="translate(10, 10)">
            <rect x="0" y="0" width="30" height="25" rx="3" fill="#f97316" stroke="#ea580c"/>
            <text x="15" y="17" fontSize="14" fill="white" textAnchor="middle">🎒</text>
          </g>
        )}
        
        {/* Interaction hint when idle */}
        {state === 'idle' && (
          <g opacity="0.5">
            <text x="100" y="140" fontSize="10" fill="#666" textAnchor="middle">👆戳我</text>
          </g>
        )}
      </svg>
    </motion.div>
  );
};

export default Frog;
