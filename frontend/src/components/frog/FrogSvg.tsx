/**
 * FrogSvg 组件 - 基于用户提供的 Frog.svg
 * 
 * 支持状态变化、Framer Motion 集成
 */

import { motion } from 'framer-motion';
import { FrogState } from '../../types/frogAnimation';

interface FrogSvgProps {
  /** 当前状态 */
  state?: FrogState;
  /** 尺寸 */
  size?: number;
  /** 方向 */
  direction?: 'left' | 'right';
  /** 是否显示背包 */
  showBackpack?: boolean;
  /** 是否显示纪念品 */
  showSouvenir?: boolean;
  /** 纪念品 emoji */
  souvenirEmoji?: string;
  /** 点击事件 */
  onClick?: () => void;
  /** 类名 */
  className?: string;
}

// 状态颜色映射
const STATE_COLORS: Record<string, { body: string[], cheek: string }> = {
  [FrogState.IDLE]: {
    body: ['#4ADE80', '#FCD34D', '#FDBA74'],
    cheek: '#FDA4AF',
  },
  [FrogState.ANGRY]: {
    body: ['#EF4444', '#F87171', '#FECACA'],
    cheek: '#FF6B6B',
  },
  [FrogState.SCARED]: {
    body: ['#93C5FD', '#A5B4FC', '#C4B5FD'],
    cheek: '#DDD6FE',
  },
  [FrogState.HAPPY]: {
    body: ['#4ADE80', '#FCD34D', '#FDBA74'],
    cheek: '#FDA4AF',
  },
  [FrogState.RICH]: {
    body: ['#FFD700', '#FFA500', '#FF8C00'],
    cheek: '#FFE4B5',
  },
  [FrogState.EXCITED]: {
    body: ['#34D399', '#FBBF24', '#F59E0B'],
    cheek: '#FCD34D',
  },
  [FrogState.CRYING]: {
    body: ['#94A3B8', '#CBD5E1', '#E2E8F0'],
    cheek: '#E2E8F0',
  },
  [FrogState.SLEEPING]: {
    body: ['#6366F1', '#A5B4FC', '#C4B5FD'],
    cheek: '#DDD6FE',
  },
};

// 嘴巴路径
const MOUTH_PATHS: Record<string, string> = {
  [FrogState.IDLE]: 'M 85 115 Q 100 125 115 115',
  [FrogState.HAPPY]: 'M 80 110 Q 100 130 120 110',
  [FrogState.ANGRY]: 'M 85 120 Q 100 110 115 120',
  [FrogState.SCARED]: 'M 90 115 Q 100 120 110 115',
  [FrogState.CRYING]: 'M 85 120 Q 100 112 115 120',
  [FrogState.EXCITED]: 'M 75 108 Q 100 135 125 108',
  [FrogState.RICH]: 'M 80 105 Q 100 130 120 105',
  [FrogState.SLEEPING]: 'M 90 118 Q 100 118 110 118',
};

export function FrogSvg({
  state = FrogState.IDLE,
  size = 200,
  direction = 'right',
  showBackpack = false,
  showSouvenir = false,
  souvenirEmoji = '🎁',
  onClick,
  className = '',
}: FrogSvgProps) {
  const colors = STATE_COLORS[state] || STATE_COLORS[FrogState.IDLE];
  const mouthPath = MOUTH_PATHS[state] || MOUTH_PATHS[FrogState.IDLE];
  
  // 动画变体
  const bodyVariants = {
    idle: {
      scaleY: [1, 0.97, 1],
      y: [0, 3, 0],
      transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
    },
    jumping: {
      y: [0, -30, 0],
      scaleY: [1, 1.1, 0.9, 1],
      transition: { duration: 0.5, ease: 'easeOut' }
    },
    scared: {
      x: [-3, 3, -3, 3, 0],
      transition: { duration: 0.4, repeat: 3 }
    },
    dancing: {
      rotate: [-5, 5, -5, 5, 0],
      y: [-5, 0, -5, 0],
      transition: { duration: 0.5, repeat: Infinity }
    },
  };

  // 眼睛动画
  const eyeVariants = {
    idle: {
      scaleY: [1, 1, 0.1, 1, 1],
      transition: { duration: 4.5, repeat: Infinity, times: [0, 0.96, 0.98, 1, 1] }
    },
    sleeping: {
      scaleY: 0.1,
    },
    angry: {
      scaleY: 0.7,
    },
    scared: {
      scale: 1.2,
    },
  };

  const getAnimationState = () => {
    switch (state) {
      case FrogState.JUMPING:
      case FrogState.EXCITED:
        return 'jumping';
      case FrogState.SCARED:
        return 'scared';
      case FrogState.DANCING:
        return 'dancing';
      default:
        return 'idle';
    }
  };

  const getEyeState = () => {
    switch (state) {
      case FrogState.SLEEPING:
        return 'sleeping';
      case FrogState.ANGRY:
        return 'angry';
      case FrogState.SCARED:
        return 'scared';
      default:
        return 'idle';
    }
  };

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
        transform: `scaleX(${direction === 'left' ? -1 : 1})`,
      }}
      onClick={onClick}
    >
      <motion.svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        variants={bodyVariants}
        animate={getAnimationState()}
        style={{ transformOrigin: 'bottom center' }}
      >
        <defs>
          {/* 皮肤渐变 */}
          <linearGradient id={`skinGradient-${state}`} x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0.4" stopColor={colors.body[0]} />
            <stop offset="0.8" stopColor={colors.body[1]} />
            <stop offset="1.0" stopColor={colors.body[2]} />
          </linearGradient>
          
          {/* 阴影滤镜 */}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="3" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.2"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#softShadow)">
          {/* 身体主体 */}
          <path 
            d="M 45 75 A 32 32 0 1 1 90 60 Q 100 70 110 60 A 32 32 0 1 1 155 75 C 180 90 190 120 190 145 C 190 180 150 190 100 190 C 50 190 10 180 10 145 C 10 120 20 90 45 75 Z" 
            fill={`url(#skinGradient-${state})`}
            stroke="#22C55E" 
            strokeWidth="1.5" 
            strokeLinejoin="round"
          />

          {/* 左眼 */}
          <g transform="translate(60, 45)">
            <circle cx="0" cy="0" r="24" fill="#FEF9C3" stroke="#D9F99D" strokeWidth="1"/>
            <motion.g variants={eyeVariants} animate={getEyeState()}>
              <circle cx="0" cy="0" r="16" fill="#1F2937"/>
              <circle cx="-5" cy="-5" r="5" fill="white" opacity="0.9"/>
            </motion.g>
          </g>
          
          {/* 右眼 */}
          <g transform="translate(140, 45)">
            <circle cx="0" cy="0" r="24" fill="#FEF9C3" stroke="#D9F99D" strokeWidth="1"/>
            <motion.g variants={eyeVariants} animate={getEyeState()}>
              <circle cx="0" cy="0" r="16" fill="#1F2937"/>
              <circle cx="-5" cy="-5" r="5" fill="white" opacity="0.9"/>
            </motion.g>
          </g>

          {/* 鼻孔 */}
          <circle cx="92" cy="100" r="1.5" fill="#15803D" opacity="0.6"/>
          <circle cx="108" cy="100" r="1.5" fill="#15803D" opacity="0.6"/>
          
          {/* 嘴巴 */}
          <motion.path
            d={mouthPath}
            stroke="#15803D"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            animate={{ d: mouthPath }}
            transition={{ duration: 0.3 }}
          />
          
          {/* 腮红 */}
          <ellipse cx="30" cy="125" rx="12" ry="8" fill={colors.cheek} opacity="0.4"/>
          <ellipse cx="170" cy="125" rx="12" ry="8" fill={colors.cheek} opacity="0.4"/>

          {/* Zeta 标志 */}
          <path 
            d="M96 152 L104 152 L96 160 L104 160" 
            stroke="#15803D" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity="0.5"
          />

          {/* 睡觉时的 ZZZ */}
          {state === FrogState.SLEEPING && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.text
                x="160" y="20"
                fill="#6366F1" fontSize="16" fontWeight="bold"
                animate={{ y: [20, 10, 20], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >Z</motion.text>
              <motion.text
                x="170" y="35"
                fill="#6366F1" fontSize="12" fontWeight="bold"
                animate={{ y: [35, 25, 35], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              >z</motion.text>
              <motion.text
                x="178" y="48"
                fill="#6366F1" fontSize="10" fontWeight="bold"
                animate={{ y: [48, 38, 48], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
              >z</motion.text>
            </motion.g>
          )}

          {/* 哭泣时的眼泪 */}
          {state === FrogState.CRYING && (
            <>
              <motion.ellipse
                cx="55" cy="75" rx="4" ry="8"
                fill="#60A5FA"
                animate={{ y: [0, 30], opacity: [1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.ellipse
                cx="145" cy="75" rx="4" ry="8"
                fill="#60A5FA"
                animate={{ y: [0, 30], opacity: [1, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
              />
            </>
          )}

          {/* 发财时的墨镜 */}
          {state === FrogState.RICH && (
            <>
              <rect x="35" y="35" width="50" height="25" rx="5" fill="#1F2937"/>
              <rect x="115" y="35" width="50" height="25" rx="5" fill="#1F2937"/>
              <rect x="85" y="42" width="30" height="5" fill="#1F2937"/>
            </>
          )}

          {/* 生气时的怒气符号 */}
          {state === FrogState.ANGRY && (
            <motion.g
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <text x="155" y="25" fontSize="24">💢</text>
            </motion.g>
          )}
        </g>
      </motion.svg>

      {/* 背包配件 */}
      {showBackpack && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute text-3xl"
          style={{ 
            top: '40%', 
            right: direction === 'right' ? '5%' : 'auto',
            left: direction === 'left' ? '5%' : 'auto',
          }}
        >
          🎒
        </motion.div>
      )}

      {/* 纪念品配件 */}
      {showSouvenir && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute text-3xl"
          style={{ 
            top: '30%', 
            left: direction === 'right' ? '5%' : 'auto',
            right: direction === 'left' ? '5%' : 'auto',
          }}
        >
          {souvenirEmoji}
        </motion.div>
      )}
    </motion.div>
  );
}

export default FrogSvg;
