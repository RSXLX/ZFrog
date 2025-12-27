/**
 * 邮箱组件 - 查看日记和明信片
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MailboxProps {
  /** 未读邮件数量 */
  unreadCount?: number;
  /** 点击回调 */
  onClick?: () => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { width: 40, height: 50, fontSize: 'text-xs' },
  md: { width: 60, height: 75, fontSize: 'text-sm' },
  lg: { width: 80, height: 100, fontSize: 'text-base' },
};

export function Mailbox({ unreadCount = 0, onClick, size = 'md' }: MailboxProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = SIZE_CONFIG[size];
  const hasUnread = unreadCount > 0;

  return (
    <motion.div
      className="relative cursor-pointer select-none"
      style={{ width: config.width, height: config.height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* 邮箱主体 */}
      <div className="absolute inset-0 flex flex-col items-center justify-end">
        {/* 邮箱盒子 */}
        <div 
          className="relative bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-lg shadow-lg"
          style={{ width: '80%', height: '60%' }}
        >
          {/* 邮箱口 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-amber-900 rounded" />
          
          {/* 信件露出 */}
          <AnimatePresence>
            {hasUnread && (
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: -10 }}
                exit={{ y: 0 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 bg-white rounded shadow-sm"
                style={{ width: '60%', height: '40%' }}
              >
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gray-300" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* 邮箱支柱 */}
        <div 
          className="bg-gradient-to-b from-amber-900 to-amber-950 rounded-b"
          style={{ width: '20%', height: '40%' }}
        />
      </div>

      {/* 邮箱旗帜 */}
      <motion.div
        className="absolute right-0 bg-red-500 rounded-sm shadow"
        style={{ 
          width: config.width * 0.15, 
          height: config.height * 0.2,
          top: config.height * 0.3,
        }}
        animate={{ 
          rotate: hasUnread ? [0, 30, 0] : 0,
        }}
        transition={{ duration: 0.5, repeat: hasUnread ? Infinity : 0, repeatDelay: 2 }}
      />

      {/* 未读数量徽章 */}
      <AnimatePresence>
        {hasUnread && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={`absolute -top-1 -right-1 bg-red-500 text-white rounded-full 
                       flex items-center justify-center font-bold shadow-lg ${config.fontSize}`}
            style={{ 
              width: config.width * 0.4, 
              height: config.width * 0.4,
              minWidth: 16,
              minHeight: 16,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 悬停提示 */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap
                       bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg"
          >
            {hasUnread ? `${unreadCount} 封新邮件` : '邮箱'}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Mailbox;
