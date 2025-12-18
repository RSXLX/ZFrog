import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SpeechBubbleProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  autoHide?: boolean;
  duration?: number;
  onClose?: () => void;
}

export function SpeechBubble({ 
  text, 
  position = 'top',
  autoHide = true,
  duration = 4000,
  onClose 
}: SpeechBubbleProps) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  // 打字机效果
  useEffect(() => {
    setDisplayText('');
    setIsTyping(true);
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [text]);
  
  // 自动隐藏
  useEffect(() => {
    if (!autoHide) return;
    
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [autoHide, duration, onClose]);
  
  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-4',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-4',
    left: 'right-full top-1/2 -translate-y-1/2 mr-4',
    right: 'left-full top-1/2 -translate-y-1/2 ml-4',
  };
  
  const tailStyles = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white',
  };
  
  return (
    <motion.div
      className={`absolute ${positionStyles[position]} z-10`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className="relative bg-white rounded-2xl shadow-lg px-4 py-3 max-w-[200px]">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {displayText}
          {isTyping && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              |
            </motion.span>
          )}
        </p>
        
        {/* 气泡尾巴 */}
        <div className={`absolute w-0 h-0 ${tailStyles[position]}`} />
      </div>
    </motion.div>
  );
}

// 思考气泡
export function ThinkingBubble({ position = 'top' }: { position?: 'top' | 'right' }) {
  return (
    <motion.div
      className={`absolute ${
        position === 'top' 
          ? 'bottom-full left-1/2 -translate-x-1/2 mb-8' 
          : 'left-full top-0 ml-4'
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 小圆点 */}
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-5 left-1/2 -translate-x-1/4 w-3 h-3 bg-white rounded-full shadow"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, delay: 0.2, repeat: Infinity }}
      />
      
      {/* 主气泡 */}
      <div className="bg-white rounded-full shadow-lg px-4 py-2">
        <motion.span
          className="text-gray-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          💭 ...
        </motion.span>
      </div>
    </motion.div>
  );
}

// 情绪气泡
export function EmotionBubble({ 
  emotion, 
  duration = 2000 
}: { 
  emotion: 'love' | 'angry' | 'happy' | 'sad' | 'surprised';
  duration?: number;
}) {
  const emotionConfig = {
    love: { emoji: '❤️', color: 'bg-pink-100 border-pink-300' },
    angry: { emoji: '😠', color: 'bg-red-100 border-red-300' },
    happy: { emoji: '😊', color: 'bg-yellow-100 border-yellow-300' },
    sad: { emoji: '😢', color: 'bg-blue-100 border-blue-300' },
    surprised: { emoji: '😲', color: 'bg-purple-100 border-purple-300' },
  };
  
  const config = emotionConfig[emotion];
  
  return (
    <motion.div
      className="absolute -top-8 left-1/2 -translate-x-1/2"
      initial={{ opacity: 0, y: 10, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.5 }}
      transition={{ type: 'spring', damping: 15 }}
    >
      <div className={`rounded-full border-2 ${config.color} px-3 py-1 shadow-lg`}>
        <motion.span
          className="text-xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          {config.emoji}
        </motion.span>
      </div>
    </motion.div>
  );
}

// 系统消息气泡
export function SystemBubble({ 
  message, 
  type = 'info',
  duration = 5000 
}: { 
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}) {
  const typeConfig = {
    info: { 
      icon: 'ℹ️', 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    },
    success: { 
      icon: '✅', 
      bgColor: 'bg-green-50', 
      borderColor: 'border-green-200',
      textColor: 'text-green-800'
    },
    warning: { 
      icon: '⚠️', 
      bgColor: 'bg-yellow-50', 
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800'
    },
    error: { 
      icon: '❌', 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-200',
      textColor: 'text-red-800'
    },
  };
  
  const config = typeConfig[type];
  
  return (
    <motion.div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px]`}>
        <span className="text-xl">{config.icon}</span>
        <p className={`text-sm font-medium ${config.textColor}`}>
          {message}
        </p>
      </div>
    </motion.div>
  );
}

// 链上事件气泡
export function ChainEventBubble({ 
  event, 
  onClose 
}: { 
  event: any;
  onClose?: () => void;
}) {
  const eventConfig = {
    large_buy: { 
      icon: '🟢', 
      label: '大单买入', 
      color: 'bg-green-100 border-green-300' 
    },
    large_sell: { 
      icon: '🔴', 
      label: '大单卖出', 
      color: 'bg-red-100 border-red-300' 
    },
    whale_transfer: { 
      icon: '🐋', 
      label: '鲸鱼转账', 
      color: 'bg-blue-100 border-blue-300' 
    },
    new_listing: { 
      icon: '🆕', 
      label: '新项目', 
      color: 'bg-purple-100 border-purple-300' 
    },
    price_change: { 
      icon: '📊', 
      label: '价格变动', 
      color: 'bg-yellow-100 border-yellow-300' 
    },
  };
  
  const config = eventConfig[event.type as keyof typeof eventConfig];
  
  return (
    <motion.div
      className="absolute -top-16 left-1/2 -translate-x-1/2 z-20"
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      transition={{ type: 'spring', damping: 15 }}
    >
      <div className={`${config.color} border rounded-xl shadow-lg px-3 py-2 min-w-[180px]`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{config.icon}</span>
          <span className="text-xs font-medium text-gray-700">
            {config.label}
          </span>
        </div>
        <p className="text-xs text-gray-600">
          {event.type === 'price_change' 
            ? `${event.token} ${event.value > 0 ? '📈' : '📉'} ${event.value.toFixed(2)}%`
            : `$${(event.value / 1000).toFixed(1)}K ${event.token}`
          }
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 text-xs"
          >
            ×
          </button>
        )}
      </div>
    </motion.div>
  );
}