// frontend/src/components/frog/FrogContainer.tsx

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubble } from '../chat/ChatBubble';

interface FrogContainerProps {
  frogId?: number;
  initialPosition?: { x: number; y: number };
  frogName?: string;
  personality?: string;
}

export function FrogContainer({ 
  frogId = 1, 
  initialPosition, 
  frogName = '小蛙',
  personality = 'COMEDIAN'
}: FrogContainerProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const frogRef = useRef<HTMLDivElement>(null);

  // 处理青蛙点击
  const handleFrogClick = () => {
    // 1. 播放点击动画
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);

    // 2. 打开/关闭对话框
    setIsChatOpen(prev => !prev);
  };

  // 处理点击外部关闭
  const handleClickOutside = () => {
    setIsChatOpen(false);
  };

  return (
    <div 
      className="frog-container"
      style={{
        position: 'fixed',
        bottom: initialPosition?.y ?? 20,
        right: initialPosition?.x ?? 20,
        zIndex: 9999,
      }}
    >
      {/* 聊天气泡 */}
      <AnimatePresence>
        {isChatOpen && (
          <ChatBubble
            frogId={frogId}
            frogName={frogName}
            personality={personality}
            onClose={() => setIsChatOpen(false)}
            onClickOutside={handleClickOutside}
          />
        )}
      </AnimatePresence>

      {/* 青蛙主体 */}
      <motion.div
        ref={frogRef}
        className="frog-body-wrapper"
        onClick={handleFrogClick}
        animate={isClicked ? 'clicked' : 'idle'}
        variants={frogClickVariants}
        whileHover="hover"
        style={{ cursor: 'pointer' }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 100 100"
          className="frog-svg"
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}
        >
          {/* 青蛙身体 */}
          <ellipse
            cx="50"
            cy="55"
            rx="35"
            ry="30"
            fill="#4ade80"
            stroke="#22c55e"
            strokeWidth="2"
          />
          
          {/* 青蛙头部 */}
          <ellipse
            cx="50"
            cy="35"
            rx="25"
            ry="22"
            fill="#4ade80"
            stroke="#22c55e"
            strokeWidth="2"
          />
          
          {/* 眼睛 */}
          <circle cx="38" cy="30" r="8" fill="white" />
          <circle cx="62" cy="30" r="8" fill="white" />
          <circle cx="38" cy="32" r="4" fill="black" />
          <circle cx="62" cy="32" r="4" fill="black" />
          
          {/* 嘴巴 */}
          <path
            d="M 40 42 Q 50 48 60 42"
            stroke="#22c55e"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 腮红 */}
          <ellipse cx="25" cy="38" rx="4" ry="3" fill="#fbbf24" opacity="0.6" />
          <ellipse cx="75" cy="38" rx="4" ry="3" fill="#fbbf24" opacity="0.6" />
          
          {/* 肚子 */}
          <ellipse
            cx="50"
            cy="60"
            rx="20"
            ry="15"
            fill="#86efac"
            opacity="0.5"
          />
        </svg>
        
        {/* 点击提示（首次显示） */}
        {!isChatOpen && (
          <motion.div 
            className="click-hint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.5 }}
            style={{
              position: 'absolute',
              top: '-30px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(74, 222, 128, 0.9)',
              color: '#000',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            <span>点我聊天 💬</span>
            <div
              style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid rgba(74, 222, 128, 0.9)'
              }}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// 青蛙点击动画
const frogClickVariants = {
  idle: {
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  clicked: {
    scale: [1, 0.9, 1.1, 1],
    rotate: [0, -5, 5, 0],
    transition: { duration: 0.3 }
  }
};