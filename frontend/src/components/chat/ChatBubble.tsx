// frontend/src/components/chat/ChatBubble.tsx

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChatPanel } from './ChatPanel';
import { X, Minus } from 'lucide-react';

import { Personality } from '../../types';

interface ChatBubbleProps {
  frogId: number;
  frogName: string;
  personality?: Personality | string;
  onClose: () => void;
  onClickOutside: () => void;
}

export function ChatBubble({
  frogId,
  frogName,
  personality,
  onClose,
  onClickOutside,
}: ChatBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // 点击外部检测
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        // 检查是否点击了青蛙本身
        const frogElement = document.querySelector('.frog-body-wrapper');
        if (frogElement && frogElement.contains(e.target as Node)) {
          return; // 点击青蛙不关闭
        }
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClickOutside]);

  return (
    <motion.div
      ref={bubbleRef}
      className="chat-bubble"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={bubbleVariants}
      style={{
        position: 'absolute',
        bottom: '100%',
        right: 0,
        marginBottom: '20px',
        width: '340px',
        maxHeight: '480px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '16px',
        boxShadow: `
          0 10px 40px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(74, 222, 128, 0.2)
        `,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 气泡尖角（指向青蛙） */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10px',
          right: '30px',
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '12px solid #16213e'
        }}
      />

      {/* 标题栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(74, 222, 128, 0.1)',
          borderBottom: '1px solid rgba(74, 222, 128, 0.2)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '20px' }}>🐸</span>
          <span
            style={{
              fontWeight: '600',
              color: '#4ade80',
              fontSize: '14px'
            }}
          >
            {frogName}
          </span>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#4ade80',
              animation: 'pulse 2s infinite'
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            gap: '4px'
          }}
        >
          <button
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              color: '#888',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onClick={onClose}
            title="最小化"
          >
            <Minus size={14} />
          </button>
          <button
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              color: '#888',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onClick={onClose}
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 聊天面板 */}
      <ChatPanel
        frogId={frogId}
        frogName={frogName}
        personality={personality}
      />
    </motion.div>
  );
}

// 气泡弹出动画
const bubbleVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    originX: 1,
    originY: 1,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};