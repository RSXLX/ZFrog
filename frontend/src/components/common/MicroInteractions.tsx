/**
 * 微交互动画组件集合
 * 包含数值动画、按钮反馈、庆祝动画等
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


// ======== AnimatedNumber - 数值变化动画 ========

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  duration = 500,
  className = '',
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isIncreasing, setIsIncreasing] = useState<boolean | null>(null);

  useEffect(() => {
    if (value === displayValue) return;

    setIsIncreasing(value > displayValue);
    const startValue = displayValue;
    const diff = value - startValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * eased);
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsIncreasing(null);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <motion.span
      className={`${className} ${isIncreasing === true ? 'text-green-500' : isIncreasing === false ? 'text-red-500' : ''}`}
      animate={isIncreasing !== null ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {prefix}{displayValue}{suffix}
    </motion.span>
  );
}

// ======== PressableButton - 按压反馈按钮 ========

interface PressableButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export function PressableButton({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'primary',
}: PressableButtonProps) {
  const variantStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        px-4 py-2 rounded-xl font-medium transition-colors
        ${variantStyles[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}

// ======== LevelUpCelebration - 升级庆祝动画 ========

interface LevelUpCelebrationProps {
  show: boolean;
  level: number;
  onComplete?: () => void;
}

export function LevelUpCelebration({ show, level, onComplete }: LevelUpCelebrationProps) {
  useEffect(() => {
    if (show) {
      // 3秒后自动关闭
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={onComplete}
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-2xl text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">恭喜升级！</h2>
            <p className="text-4xl font-bold text-green-500">Lv.{level}</p>
            <p className="text-sm text-gray-500 mt-4">点击任意位置关闭</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ======== PulseIndicator - 脉冲指示器 ========

interface PulseIndicatorProps {
  active?: boolean;
  color?: 'green' | 'red' | 'yellow' | 'blue';
  size?: 'sm' | 'md' | 'lg';
}

export function PulseIndicator({
  active = true,
  color = 'green',
  size = 'md',
}: PulseIndicatorProps) {
  const colors = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  if (!active) {
    return <div className={`${sizes[size]} rounded-full bg-gray-300`} />;
  }

  return (
    <span className="relative flex">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[color]}`}
      />
      <span className={`relative inline-flex rounded-full ${sizes[size]} ${colors[color]}`} />
    </span>
  );
}

export default {
  AnimatedNumber,
  PressableButton,
  LevelUpCelebration,
  PulseIndicator,
};
