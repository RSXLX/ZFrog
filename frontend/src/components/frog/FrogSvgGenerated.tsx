/**
 * 参数化青蛙 SVG 渲染组件
 * 
 * 6 层插槽架构:
 * - Layer 1: Base (身体)
 * - Layer 2: Markings (纹理)
 * - Layer 3: Eyes (眼睛)
 * - Layer 4: Mouth (嘴巴 + 腮红)
 * - Layer 5: Clothes (服装)
 * - Layer 6: Headgear (头饰)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FrogAppearanceParams } from '../../services/appearance.api';

interface FrogSvgGeneratedProps {
  params: FrogAppearanceParams;
  size?: number;
  animated?: boolean;
  className?: string;
}

export const FrogSvgGenerated: React.FC<FrogSvgGeneratedProps> = ({
  params,
  size = 200,
  animated = true,
  className = '',
}) => {
  const { colors, accessories, baseExpression, effects } = params;
  
  // 根据表情获取嘴巴路径
  const getMouthPath = () => {
    switch (baseExpression) {
      case 'happy':
        return 'M 85 130 Q 100 145 115 130';
      case 'curious':
        return 'M 90 130 Q 100 135 110 130';
      case 'sleepy':
        return 'M 90 130 L 110 130';
      case 'cool':
        return 'M 85 135 Q 100 125 115 135';
      case 'shy':
        return 'M 95 130 Q 100 135 105 130';
      default:
        return 'M 85 130 Q 100 145 115 130';
    }
  };
  
  // 眼睛形状
  const getEyeShape = () => {
    if (baseExpression === 'sleepy') {
      return { rx: 12, ry: 6 };
    }
    return { rx: 12, ry: 12 };
  };
  
  return (
    <motion.div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ========== 特效层: Glow (底层) ========== */}
        {effects.glow && (
          <defs>
            <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feComposite in="blur" in2="SourceGraphic" operator="over" />
            </filter>
          </defs>
        )}
        
        {/* ========== Layer 1: Base 身体 ========== */}
        <g style={{ zIndex: 10 }}>
          {/* 身体主体 */}
          <ellipse 
            cx="100" 
            cy="120" 
            rx="60" 
            ry="50" 
            fill={colors.primaryColor}
            filter={effects.glow ? 'url(#glowFilter)' : undefined}
          />
          {/* 头部 */}
          <ellipse 
            cx="100" 
            cy="80" 
            rx="50" 
            ry="45" 
            fill={colors.primaryColor}
          />
          {/* 肚皮 */}
          <ellipse 
            cx="100" 
            cy="130" 
            rx="35" 
            ry="30" 
            fill={colors.secondaryColor}
          />
        </g>
        
        {/* ========== Layer 2: Markings 纹理 ========== */}
        <g style={{ zIndex: 20 }}>
          <MarkingsLayer type={accessories.markings} accentColor={colors.accentColor} />
        </g>
        
        {/* ========== Layer 3: Eyes 眼睛 ========== */}
        <g style={{ zIndex: 30 }}>
          {/* 左眼 */}
          <ellipse 
            cx="75" 
            cy="70" 
            rx={getEyeShape().rx} 
            ry={getEyeShape().ry} 
            fill={colors.eyeColor}
            stroke="#333"
            strokeWidth="1"
          />
          <circle cx="75" cy="70" r="6" fill="#333" />
          <circle cx="77" cy="68" r="2" fill="white" />
          
          {/* 右眼 */}
          <ellipse 
            cx="125" 
            cy="70" 
            rx={getEyeShape().rx} 
            ry={getEyeShape().ry} 
            fill={colors.eyeColor}
            stroke="#333"
            strokeWidth="1"
          />
          <circle cx="125" cy="70" r="6" fill="#333" />
          <circle cx="127" cy="68" r="2" fill="white" />
          
          {/* 眨眼动画 */}
          {animated && (
            <>
              <motion.ellipse
                cx="75"
                cy="70"
                rx={getEyeShape().rx}
                ry={getEyeShape().ry}
                fill={colors.primaryColor}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: [0, 0, 1, 0, 0] }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  times: [0, 0.45, 0.5, 0.55, 1] 
                }}
                style={{ transformOrigin: '75px 70px' }}
              />
              <motion.ellipse
                cx="125"
                cy="70"
                rx={getEyeShape().rx}
                ry={getEyeShape().ry}
                fill={colors.primaryColor}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: [0, 0, 1, 0, 0] }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  times: [0, 0.45, 0.5, 0.55, 1] 
                }}
                style={{ transformOrigin: '125px 70px' }}
              />
            </>
          )}
        </g>
        
        {/* ========== Layer 4: Mouth 嘴巴 + 腮红 ========== */}
        <g style={{ zIndex: 40 }}>
          {/* 嘴巴 */}
          <path 
            d={getMouthPath()} 
            stroke="#333" 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 鼻孔 */}
          <circle cx="95" cy="95" r="2" fill="#333" />
          <circle cx="105" cy="95" r="2" fill="#333" />
          
          {/* 腮红 */}
          {effects.blush && (
            <>
              <ellipse cx="55" cy="95" rx="10" ry="6" fill={colors.cheekColor} opacity="0.6" />
              <ellipse cx="145" cy="95" rx="10" ry="6" fill={colors.cheekColor} opacity="0.6" />
            </>
          )}
        </g>
        
        {/* ========== Layer 5: Clothes 服装 ========== */}
        <g style={{ zIndex: 60 }}>
          <NecklaceSlot type={accessories.necklace} />
        </g>
        
        {/* ========== Layer 6: Headgear 头饰 ========== */}
        <g style={{ zIndex: 80 }}>
          <GlassesSlot type={accessories.glasses} />
          <HatSlot type={accessories.hat} />
        </g>
        
        {/* ========== 特效层: Sparkle ========== */}
        {effects.sparkle && animated && (
          <SparkleEffect />
        )}
        
        {/* ========== 特效层: Rainbow (隐藏款) ========== */}
        {effects.rainbow && (
          <RainbowEffect />
        )}
      </svg>
    </motion.div>
  );
};

// ============ 子组件 ============

// 纹理层
const MarkingsLayer: React.FC<{ type?: string; accentColor: string }> = ({ type, accentColor }) => {
  if (!type || type === 'none') return null;
  
  switch (type) {
    case 'spots':
      return (
        <>
          <circle cx="70" cy="100" r="5" fill={accentColor} opacity="0.5" />
          <circle cx="130" cy="100" r="5" fill={accentColor} opacity="0.5" />
          <circle cx="100" cy="60" r="4" fill={accentColor} opacity="0.5" />
        </>
      );
    case 'stripes':
      return (
        <>
          <path d="M 60 90 Q 80 85 100 90" stroke={accentColor} strokeWidth="3" fill="none" opacity="0.5" />
          <path d="M 100 90 Q 120 85 140 90" stroke={accentColor} strokeWidth="3" fill="none" opacity="0.5" />
        </>
      );
    case 'heart':
      return (
        <path 
          d="M 100 80 L 95 75 Q 90 70 95 65 Q 100 60 100 70 Q 100 60 105 65 Q 110 70 105 75 Z" 
          fill={accentColor} 
          opacity="0.6"
        />
      );
    case 'star':
      return (
        <polygon 
          points="100,50 103,60 113,60 105,67 108,77 100,71 92,77 95,67 87,60 97,60" 
          fill={accentColor} 
          opacity="0.6"
        />
      );
    case 'galaxy':
      return (
        <>
          <circle cx="70" cy="80" r="3" fill="#FFD700" opacity="0.8" />
          <circle cx="130" cy="80" r="2" fill="#FFD700" opacity="0.8" />
          <circle cx="100" cy="55" r="2" fill="#FFD700" opacity="0.8" />
          <circle cx="85" cy="110" r="2" fill="#E879F9" opacity="0.8" />
          <circle cx="115" cy="110" r="3" fill="#E879F9" opacity="0.8" />
        </>
      );
    default:
      return null;
  }
};

// 项链插槽
const NecklaceSlot: React.FC<{ type?: string }> = ({ type }) => {
  if (!type || type === 'none') return null;
  
  switch (type) {
    case 'pearl':
      return (
        <g transform="translate(65, 145)">
          <path d="M 0 0 Q 35 15 70 0" stroke="#F5F5DC" strokeWidth="3" fill="none" />
          {[0, 10, 20, 30, 40, 50, 60, 70].map((x, i) => (
            <circle key={i} cx={x} cy={Math.sin(x / 10) * 5} r="4" fill="#F5F5DC" />
          ))}
        </g>
      );
    case 'chain':
      return (
        <path 
          d="M 65 145 Q 100 165 135 145" 
          stroke="#C0C0C0" 
          strokeWidth="2" 
          fill="none"
          strokeDasharray="4 2"
        />
      );
    case 'scarf':
      return (
        <g transform="translate(50, 135)">
          <path d="M 0 0 Q 50 20 100 0" fill="#E53E3E" />
          <path d="M 80 5 L 90 30 L 100 5" fill="#E53E3E" />
        </g>
      );
    case 'diamond':
      return (
        <g transform="translate(90, 150)">
          <polygon points="10,0 20,10 10,20 0,10" fill="#00D9FF" stroke="#87CEEB" strokeWidth="1" />
          <path d="M 10 0 L 10 20" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
        </g>
      );
    default:
      return null;
  }
};

// 眼镜插槽
const GlassesSlot: React.FC<{ type?: string }> = ({ type }) => {
  if (!type || type === 'none') return null;
  
  switch (type) {
    case 'round':
      return (
        <g>
          <circle cx="75" cy="70" r="15" fill="none" stroke="#333" strokeWidth="2" />
          <circle cx="125" cy="70" r="15" fill="none" stroke="#333" strokeWidth="2" />
          <path d="M 90 70 L 110 70" stroke="#333" strokeWidth="2" />
        </g>
      );
    case 'sunglasses':
      return (
        <g>
          <rect x="60" y="60" width="30" height="20" rx="3" fill="#333" />
          <rect x="110" y="60" width="30" height="20" rx="3" fill="#333" />
          <path d="M 90 70 L 110 70" stroke="#333" strokeWidth="2" />
        </g>
      );
    case 'heart':
      return (
        <g fill="#FF69B4" opacity="0.8">
          <path d="M 75 60 L 70 55 Q 60 50 65 60 Q 70 65 75 75 Q 80 65 85 60 Q 90 50 80 55 Z" />
          <path d="M 125 60 L 120 55 Q 110 50 115 60 Q 120 65 125 75 Q 130 65 135 60 Q 140 50 130 55 Z" />
        </g>
      );
    case 'star':
      return (
        <g fill="#FFD700">
          <polygon points="75,55 78,65 88,65 80,72 83,82 75,76 67,82 70,72 62,65 72,65" />
          <polygon points="125,55 128,65 138,65 130,72 133,82 125,76 117,82 120,72 112,65 122,65" />
        </g>
      );
    case 'monocle':
      return (
        <g>
          <circle cx="125" cy="70" r="15" fill="none" stroke="#B8860B" strokeWidth="2" />
          <path d="M 140 70 L 155 120" stroke="#B8860B" strokeWidth="1.5" />
        </g>
      );
    default:
      return null;
  }
};

// 帽子插槽
const HatSlot: React.FC<{ type?: string }> = ({ type }) => {
  if (!type || type === 'none') return null;
  
  switch (type) {
    case 'cap':
      return (
        <g transform="translate(60, 15)">
          <ellipse cx="40" cy="15" rx="45" ry="12" fill="#E53E3E" />
          <rect x="10" y="10" width="60" height="20" rx="5" fill="#E53E3E" />
          <rect x="5" y="25" width="70" height="8" fill="#C53030" />
        </g>
      );
    case 'crown':
      return (
        <g transform="translate(65, 10)">
          <path 
            d="M0 35 L15 10 L35 25 L55 10 L70 35 Z" 
            fill="#FFD700" 
            stroke="#B8860B" 
            strokeWidth="1"
          />
          <circle cx="15" cy="15" r="4" fill="#FF6B6B" />
          <circle cx="35" cy="8" r="4" fill="#4ECDC4" />
          <circle cx="55" cy="15" r="4" fill="#9B59B6" />
        </g>
      );
    case 'flower':
      return (
        <g transform="translate(125, 30)">
          <circle cx="0" cy="0" r="8" fill="#FF69B4" />
          <circle cx="10" cy="-5" r="6" fill="#FF69B4" />
          <circle cx="10" cy="5" r="6" fill="#FF69B4" />
          <circle cx="5" cy="0" r="4" fill="#FFD700" />
        </g>
      );
    case 'bow':
      return (
        <g transform="translate(85, 25)">
          <ellipse cx="0" cy="0" rx="12" ry="8" fill="#FF69B4" />
          <ellipse cx="30" cy="0" rx="12" ry="8" fill="#FF69B4" />
          <circle cx="15" cy="0" r="5" fill="#FF1493" />
        </g>
      );
    case 'antenna':
      return (
        <g>
          <path d="M 90 40 Q 85 20 80 10" stroke="#333" strokeWidth="2" fill="none" />
          <path d="M 110 40 Q 115 20 120 10" stroke="#333" strokeWidth="2" fill="none" />
          <circle cx="80" cy="10" r="5" fill="#FFD700" />
          <circle cx="120" cy="10" r="5" fill="#FFD700" />
        </g>
      );
    case 'halo':
      return (
        <g transform="translate(50, -5)">
          <motion.ellipse 
            cx="50" cy="25" rx="40" ry="10" 
            fill="none" 
            stroke="url(#haloGradient)" 
            strokeWidth="4"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <defs>
            <linearGradient id="haloGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFF8DC" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
          </defs>
        </g>
      );
    default:
      return null;
  }
};

// 闪光特效
const SparkleEffect: React.FC = () => {
  const sparkles = [
    { x: 50, y: 60, delay: 0 },
    { x: 150, y: 80, delay: 0.5 },
    { x: 80, y: 150, delay: 1 },
    { x: 120, y: 40, delay: 1.5 },
  ];
  
  return (
    <g>
      {sparkles.map((s, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            delay: s.delay,
          }}
        >
          <polygon 
            points={`${s.x},${s.y-8} ${s.x+2},${s.y-2} ${s.x+8},${s.y} ${s.x+2},${s.y+2} ${s.x},${s.y+8} ${s.x-2},${s.y+2} ${s.x-8},${s.y} ${s.x-2},${s.y-2}`}
            fill="#FFD700"
          />
        </motion.g>
      ))}
    </g>
  );
};

// 彩虹特效 (隐藏款)
const RainbowEffect: React.FC = () => {
  return (
    <>
      <defs>
        <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <motion.stop 
            offset="0%" 
            animate={{ stopColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF6B6B'] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.stop 
            offset="50%" 
            animate={{ stopColor: ['#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF6B6B', '#4ECDC4'] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.stop 
            offset="100%" 
            animate={{ stopColor: ['#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF6B6B', '#4ECDC4', '#45B7D1'] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </linearGradient>
        <filter id="rainbowGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        </filter>
      </defs>
      <motion.circle 
        cx="100" cy="100" r="95" 
        fill="none" 
        stroke="url(#rainbowGradient)" 
        strokeWidth="3" 
        opacity="0.6"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '100px 100px' }}
      />
    </>
  );
};

export default FrogSvgGenerated;
