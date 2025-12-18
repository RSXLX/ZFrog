// frontend/src/components/frog/FrogPetAnimated.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogStatus } from '../../hooks/useFrogStatus';

// 青蛙状态枚举
export enum FrogState {
  IDLE = 'idle',
  WALKING = 'walking',
  SLEEPING = 'sleeping',
  EATING = 'eating',
  TRAVELING = 'traveling',
  HAPPY = 'happy'
}

interface FrogPetAnimatedProps {
  frogId?: number;
  frogName?: string;
  initialState?: FrogState;
  size?: number;
  interactive?: boolean;
}

// 动画变体
const frogVariants = {
  idle: {
    y: [0, -5, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  walking: {
    x: [0, 10, 20, 10, 0],
    y: [0, -8, 0, -8, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  },
  sleeping: {
    y: [0, -2, 0],
    rotate: [0, 5, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  traveling: {
    scale: [1, 0.9, 1],
    rotate: [-5, 5, -5],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  happy: {
    y: [0, -15, 0],
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.5,
      repeat: 3,
      ease: "easeOut"
    }
  },
  eating: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.3,
      repeat: 5,
      ease: "easeInOut"
    }
  }
};

// 眼睛动画
const eyeVariants = {
  open: { scaleY: 1 },
  blink: { 
    scaleY: [1, 0.1, 1],
    transition: { duration: 0.2 }
  },
  sleeping: { scaleY: 0.1 }
};

// 对话气泡组件
const SpeechBubble: React.FC<{ message: string; onComplete: () => void }> = ({ message, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      className="absolute -top-16 left-1/2 transform -translate-x-1/2 
                 bg-white rounded-xl px-4 py-2 shadow-lg z-10
                 before:content-[''] before:absolute before:bottom-[-8px] 
                 before:left-1/2 before:-translate-x-1/2
                 before:border-8 before:border-transparent before:border-t-white"
    >
      <p className="text-sm text-gray-700 whitespace-nowrap">{message}</p>
    </motion.div>
  );
};

// Zzz 动画（睡觉时）
const SleepingZzz: React.FC = () => (
  <motion.div
    className="absolute -top-8 right-0 text-2xl"
    initial={{ opacity: 0, y: 0 }}
    animate={{ 
      opacity: [0, 1, 0],
      y: -20,
      x: 10
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeOut"
    }}
  >
    💤
  </motion.div>
);

// 主组件
export const FrogPetAnimated: React.FC<FrogPetAnimatedProps> = ({ 
  frogId,
  frogName = "Froggy",
  initialState = FrogState.IDLE,
  size = 120,
  interactive = true 
}) => {
  const [currentState, setCurrentState] = useState<FrogState>(initialState);
  const [message, setMessage] = useState<string | null>(null);
  const [eyeState, setEyeState] = useState<'open' | 'blink' | 'sleeping'>('open');
  
  const { status: chainStatus } = useFrogStatus(frogId);

  // 同步链上状态
  useEffect(() => {
    if (chainStatus === 'Traveling') {
      setCurrentState(FrogState.TRAVELING);
      setMessage("我在旅行中~ 🌍");
    } else if (chainStatus === 'Idle' && currentState === FrogState.TRAVELING) {
      setCurrentState(FrogState.HAPPY);
      setMessage("我回来啦！🎉");
      setTimeout(() => setCurrentState(FrogState.IDLE), 2000);
    }
  }, [chainStatus, currentState]);

  // 自动眨眼
  useEffect(() => {
    if (currentState === FrogState.SLEEPING) return;
    
    const blinkInterval = setInterval(() => {
      setEyeState('blink');
      setTimeout(() => setEyeState('open'), 200);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, [currentState]);

  // 随机行为（仅在 Idle 状态）
  useEffect(() => {
    if (currentState !== FrogState.IDLE || !interactive) return;

    const behaviorInterval = setInterval(() => {
      const random = Math.random();
      
      if (random < 0.1) {
        // 10% 概率行走
        setCurrentState(FrogState.WALKING);
        setTimeout(() => setCurrentState(FrogState.IDLE), 3000);
      } else if (random < 0.15) {
        // 5% 概率打瞌睡
        setCurrentState(FrogState.SLEEPING);
        setEyeState('sleeping');
        setTimeout(() => {
          setCurrentState(FrogState.IDLE);
          setEyeState('open');
        }, 5000);
      }
    }, 5000);

    return () => clearInterval(behaviorInterval);
  }, [currentState, interactive]);

  // 随机自言自语
  useEffect(() => {
    if (currentState === FrogState.TRAVELING) return;
    
    const messages = [
      "今天天气真好~ ☀️",
      "想去探险...",
      "呱呱~ 🐸",
      "有点饿了...",
      `我是${frogName}！`,
      "ZetaChain 真棒！",
      "想念旅行的日子...",
      "区块链好神奇~"
    ];

    const messageInterval = setInterval(() => {
      if (Math.random() < 0.2 && !message) {
        setMessage(messages[Math.floor(Math.random() * messages.length)]);
      }
    }, 10000);

    return () => clearInterval(messageInterval);
  }, [frogName, currentState, message]);

  // 点击交互
  const handleClick = useCallback(() => {
    if (!interactive || currentState === FrogState.TRAVELING) return;
    
    setCurrentState(FrogState.HAPPY);
    setMessage("呱呱！你好呀~ 💚");
    
    setTimeout(() => {
      setCurrentState(FrogState.IDLE);
    }, 1500);
  }, [interactive, currentState]);

  // 喂食
  const handleFeed = useCallback(() => {
    if (!interactive || currentState === FrogState.TRAVELING) return;
    
    setCurrentState(FrogState.EATING);
    setMessage("好吃！谢谢~ 🍽️");
    
    setTimeout(() => {
      setCurrentState(FrogState.HAPPY);
      setTimeout(() => setCurrentState(FrogState.IDLE), 1000);
    }, 2000);
  }, [interactive, currentState]);

  return (
    <div className="relative inline-block" style={{ width: size, height: size + 40 }}>
      {/* 对话气泡 */}
      <AnimatePresence>
        {message && (
          <SpeechBubble 
            message={message} 
            onComplete={() => setMessage(null)} 
          />
        )}
      </AnimatePresence>

      {/* 睡觉 Zzz */}
      {currentState === FrogState.SLEEPING && <SleepingZzz />}

      {/* 青蛙主体 */}
      <motion.div
        className="relative cursor-pointer select-none"
        variants={frogVariants}
        animate={currentState}
        onClick={handleClick}
        whileHover={interactive ? { scale: 1.05 } : {}}
        whileTap={interactive ? { scale: 0.95 } : {}}
      >
        {/* SVG 青蛙 */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 身体 */}
          <ellipse cx="50" cy="60" rx="35" ry="30" fill="#4ADE80" />
          
          {/* 头部 */}
          <ellipse cx="50" cy="40" rx="30" ry="25" fill="#4ADE80" />
          
          {/* 眼睛背景 */}
          <circle cx="35" cy="30" r="12" fill="#4ADE80" />
          <circle cx="65" cy="30" r="12" fill="#4ADE80" />
          
          {/* 眼白 */}
          <circle cx="35" cy="30" r="10" fill="white" />
          <circle cx="65" cy="30" r="10" fill="white" />
          
          {/* 瞳孔 */}
          <motion.ellipse 
            cx="35" cy="30" rx="5" ry="6" fill="#1a1a1a"
            variants={eyeVariants}
            animate={eyeState}
          />
          <motion.ellipse 
            cx="65" cy="30" rx="5" ry="6" fill="#1a1a1a"
            variants={eyeVariants}
            animate={eyeState}
          />
          
          {/* 眼睛高光 */}
          <circle cx="33" cy="28" r="2" fill="white" />
          <circle cx="63" cy="28" r="2" fill="white" />
          
          {/* 脸颊红晕 */}
          <ellipse cx="25" cy="45" rx="6" ry="4" fill="#FDA4AF" opacity="0.5" />
          <ellipse cx="75" cy="45" rx="6" ry="4" fill="#FDA4AF" opacity="0.5" />
          
          {/* 嘴巴 */}
          <path 
            d={currentState === FrogState.HAPPY || currentState === FrogState.EATING
              ? "M 35 50 Q 50 60 65 50" 
              : "M 40 50 Q 50 55 60 50"
            }
            stroke="#2d5a27" 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 前腿 */}
          <ellipse cx="25" cy="75" rx="10" ry="8" fill="#22C55E" />
          <ellipse cx="75" cy="75" rx="10" ry="8" fill="#22C55E" />
          
          {/* 肚子 */}
          <ellipse cx="50" cy="65" rx="20" ry="15" fill="#86EFAC" />

          {/* 旅行中的背包 */}
          {currentState === FrogState.TRAVELING && (
            <g transform="translate(60, 45)">
              <rect x="0" y="0" width="15" height="20" rx="3" fill="#8B4513" />
              <rect x="2" y="2" width="11" height="5" fill="#A0522D" />
              <circle cx="7.5" cy="12" r="2" fill="#D4A574" />
            </g>
          )}
        </svg>

        {/* 状态指示器 */}
        {currentState === FrogState.TRAVELING && (
          <motion.div
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2
                       bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            旅行中...
          </motion.div>
        )}
      </motion.div>

      {/* 交互按钮（可选） */}
      {interactive && currentState === FrogState.IDLE && (
        <motion.button
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2
                     bg-yellow-400 hover:bg-yellow-500 text-yellow-900
                     px-3 py-1 rounded-full text-xs font-medium
                     shadow-md transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            handleFeed();
          }}
        >
          🍎 喂食
        </motion.button>
      )}
    </div>
  );
};

export default FrogPetAnimated;