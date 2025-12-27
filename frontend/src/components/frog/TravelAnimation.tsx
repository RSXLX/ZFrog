/**
 * 旅行动画组件 - 实现青蛙旅行的完整动画序列
 * 包含：出发动画、旅途动画、归来动画、写日记动画
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { FrogState } from '../../types/frogAnimation';

// 旅行动画阶段
export type TravelAnimationPhase = 
  | 'idle'           // 待机
  | 'preparing'      // 准备出发（背包）
  | 'departing'      // 出发中（挥手告别）
  | 'traveling'      // 旅途中
  | 'returning'      // 归来中
  | 'arrived'        // 到达（展示礼物）
  | 'writing';       // 写日记

interface TravelAnimationProps {
  /** 当前动画阶段 */
  phase: TravelAnimationPhase;
  /** 目的地链名称 */
  destinationChain?: string;
  /** 旅行进度 0-100 */
  progress?: number;
  /** 纪念品图标 */
  souvenirEmoji?: string;
  /** 阶段变化回调 */
  onPhaseComplete?: (phase: TravelAnimationPhase) => void;
  /** 尺寸 */
  size?: number;
}

// 链图标映射
const CHAIN_ICONS: Record<string, string> = {
  ethereum: '⟠',
  bsc: '🟡',
  polygon: '🟣',
  arbitrum: '🔵',
  optimism: '🔴',
  zeta: '🟢',
  zetachain: '🟢',
  default: '🌐',
};

export function TravelAnimation({
  phase,
  destinationChain = 'ethereum',
  progress = 0,
  souvenirEmoji = '🎁',
  onPhaseComplete,
  size = 200,
}: TravelAnimationProps) {
  const controls = useAnimation();
  const [currentPhase, setCurrentPhase] = useState<TravelAnimationPhase>(phase);
  const [showBackpack, setShowBackpack] = useState(false);
  const [showSouvenir, setShowSouvenir] = useState(false);
  const [speechText, setSpeechText] = useState('');

  // 获取链图标
  const chainIcon = CHAIN_ICONS[destinationChain.toLowerCase()] || CHAIN_ICONS.default;

  // 阶段切换效果
  useEffect(() => {
    setCurrentPhase(phase);
    
    switch (phase) {
      case 'preparing':
        runPreparingAnimation();
        break;
      case 'departing':
        runDepartingAnimation();
        break;
      case 'traveling':
        setShowBackpack(true);
        setSpeechText('');
        break;
      case 'returning':
        runReturningAnimation();
        break;
      case 'arrived':
        runArrivedAnimation();
        break;
      case 'writing':
        runWritingAnimation();
        break;
      default:
        setShowBackpack(false);
        setShowSouvenir(false);
        setSpeechText('');
    }
  }, [phase]);

  // 准备出发动画
  const runPreparingAnimation = useCallback(async () => {
    setShowBackpack(true);
    setSpeechText('准备出发！🎒');
    
    await controls.start({
      y: [0, -5, 0],
      transition: { duration: 0.5, repeat: 2 }
    });
    
    onPhaseComplete?.('preparing');
  }, [controls, onPhaseComplete]);

  // 出发动画
  const runDepartingAnimation = useCallback(async () => {
    setSpeechText('出发啦！👋');
    
    // 挥手 + 跳跃
    await controls.start({
      x: [0, 10, -10, 10, 0],
      y: [0, -20, 0],
      transition: { duration: 1 }
    });
    
    // 向右移动并缩小
    await controls.start({
      x: 150,
      scale: 0.3,
      opacity: 0,
      transition: { duration: 1.5, ease: 'easeIn' }
    });
    
    onPhaseComplete?.('departing');
  }, [controls, onPhaseComplete]);

  // 归来动画
  const runReturningAnimation = useCallback(async () => {
    setShowSouvenir(true);
    setSpeechText('');
    
    // 从远处出现
    await controls.start({
      x: [-150, 0],
      scale: [0.3, 1],
      opacity: [0, 1],
      transition: { duration: 1.5, ease: 'easeOut' }
    });
    
    setSpeechText('我回来啦！🎉');
    
    onPhaseComplete?.('returning');
  }, [controls, onPhaseComplete]);

  // 到达动画
  const runArrivedAnimation = useCallback(async () => {
    setShowSouvenir(true);
    setSpeechText(`带回了纪念品！${souvenirEmoji}`);
    
    // 开心跳跃
    await controls.start({
      y: [0, -30, 0, -15, 0],
      rotate: [0, -5, 5, -5, 0],
      transition: { duration: 1.5 }
    });
    
    onPhaseComplete?.('arrived');
  }, [controls, souvenirEmoji, onPhaseComplete]);

  // 写日记动画
  const runWritingAnimation = useCallback(async () => {
    setShowBackpack(false);
    setSpeechText('让我写下这次旅程... 📝');
    
    // 思考动作
    await controls.start({
      rotate: [0, -3, 3, -3, 0],
      transition: { duration: 2, repeat: 2 }
    });
    
    setSpeechText('写完了！📖');
    
    onPhaseComplete?.('writing');
  }, [controls, onPhaseComplete]);

  return (
    <div 
      className="relative" 
      style={{ width: size, height: size }}
    >
      {/* 语音气泡 */}
      <AnimatePresence>
        {speechText && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap
                       bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-lg
                       text-sm font-medium z-10"
          >
            {speechText}
            {/* 气泡尾巴 */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 
                            bg-white dark:bg-gray-800 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 青蛙主体 */}
      <motion.div
        animate={controls}
        className="relative w-full h-full"
      >
        {/* 旅途中的飞行轨迹 */}
        {currentPhase === 'traveling' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* 目的地图标 */}
            <motion.div
              className="absolute -top-4 right-0 text-2xl"
              animate={{ 
                y: [0, -5, 0],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {chainIcon}
            </motion.div>
            
            {/* 进度指示 */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}

        {/* 青蛙 SVG */}
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 200 200" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xl"
        >
          <defs>
            <linearGradient id="travelSkinGradient" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0.4" stopColor="#4ADE80" />
              <stop offset="0.8" stopColor="#FCD34D" />
              <stop offset="1.0" stopColor="#FDBA74" />
            </linearGradient>
          </defs>
          
          {/* 身体 */}
          <motion.ellipse
            cx="100" cy="120" rx="60" ry="50"
            fill="url(#travelSkinGradient)"
            animate={currentPhase === 'traveling' ? {
              scaleY: [1, 0.95, 1],
              y: [0, 2, 0]
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          
          {/* 头部 */}
          <circle cx="100" cy="80" r="45" fill="url(#travelSkinGradient)" />
          
          {/* 眼睛 */}
          <circle cx="75" cy="70" r="18" fill="white" />
          <circle cx="125" cy="70" r="18" fill="white" />
          
          {/* 瞳孔 - 根据阶段变化 */}
          <motion.circle
            cx="75" cy="70" r="8"
            fill="#1a1a1a"
            animate={currentPhase === 'writing' ? {
              cx: [75, 72, 78, 75],
            } : currentPhase === 'traveling' ? {
              cx: [75, 78, 75],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle
            cx="125" cy="70" r="8"
            fill="#1a1a1a"
            animate={currentPhase === 'writing' ? {
              cx: [125, 122, 128, 125],
            } : currentPhase === 'traveling' ? {
              cx: [125, 128, 125],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* 嘴巴 */}
          <motion.path
            d={currentPhase === 'arrived' || currentPhase === 'returning' 
              ? "M 80 100 Q 100 120 120 100" // 大笑
              : currentPhase === 'writing'
              ? "M 85 100 Q 100 105 115 100" // 思考
              : "M 85 100 Q 100 110 115 100" // 微笑
            }
            stroke="#1a1a1a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 腮红 */}
          <ellipse cx="55" cy="90" rx="12" ry="8" fill="#FDA4AF" opacity="0.6" />
          <ellipse cx="145" cy="90" rx="12" ry="8" fill="#FDA4AF" opacity="0.6" />

          {/* 手臂 - 挥手动画 */}
          {currentPhase === 'departing' && (
            <motion.g
              animate={{ rotate: [-20, 20, -20] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ transformOrigin: '40px 100px' }}
            >
              <ellipse cx="30" cy="90" rx="15" ry="10" fill="url(#travelSkinGradient)" />
            </motion.g>
          )}
        </svg>

        {/* 背包配件 */}
        <AnimatePresence>
          {showBackpack && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-1/2 right-2 text-3xl"
              style={{ transform: 'translateY(-50%)' }}
            >
              🎒
            </motion.div>
          )}
        </AnimatePresence>

        {/* 纪念品配件 */}
        <AnimatePresence>
          {showSouvenir && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.2, 1],
                rotate: 0,
              }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-1/3 left-0 text-3xl"
            >
              {souvenirEmoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 写日记时的笔 */}
        <AnimatePresence>
          {currentPhase === 'writing' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                rotate: [0, -5, 5, -5, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 1, repeat: Infinity } }}
              className="absolute bottom-1/4 right-1/4 text-2xl"
            >
              ✏️
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 粒子效果 */}
      <AnimatePresence>
        {(currentPhase === 'arrived' || currentPhase === 'returning') && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 1, 
                  scale: 0,
                  x: size / 2,
                  y: size / 2
                }}
                animate={{ 
                  opacity: [1, 0],
                  scale: [0, 1],
                  x: size / 2 + Math.cos(i * 60 * Math.PI / 180) * 80,
                  y: size / 2 + Math.sin(i * 60 * Math.PI / 180) * 80 - 50
                }}
                transition={{ 
                  duration: 1,
                  delay: i * 0.1,
                  repeat: 2
                }}
                className="absolute text-xl pointer-events-none"
              >
                {['⭐', '✨', '🌟', '💫', '🎉', '🎊'][i]}
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TravelAnimation;
