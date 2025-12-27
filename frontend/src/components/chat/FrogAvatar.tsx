// frontend/src/components/chat/FrogAvatar.tsx

import React from 'react';

interface FrogAvatarProps {
  name: string;
  mood: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FrogAvatar({ name, mood, size = 'md', className = '' }: FrogAvatarProps) {
  // 根据心情选择表情
  const getMoodEmoji = (mood: string) => {
    const moodEmojis: Record<string, string> = {
      idle: '🐸',
      thinking: '🤔',
      counting: '💰',
      happy: '😊',
      adventurous: '🗺️',
      relaxed: '😌',
      helpful: '🤝',
      confused: '😕',
      neutral: '🐸'
    };
    return moodEmojis[mood] || '🐸';
  };

  // 根据心情选择背景色
  const getMoodColor = (mood: string) => {
    const moodColors: Record<string, string> = {
      idle: 'bg-green-500',
      thinking: 'bg-purple-500',
      counting: 'bg-yellow-500',
      happy: 'bg-pink-500',
      adventurous: 'bg-blue-500',
      relaxed: 'bg-teal-500',
      helpful: 'bg-indigo-500',
      confused: 'bg-orange-500',
      neutral: 'bg-green-500'
    };
    return moodColors[mood] || 'bg-green-500';
  };

  // 根据尺寸设置大小
  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    const sizeClasses = {
      sm: 'w-10 h-10 text-lg',
      md: 'w-12 h-12 text-xl',
      lg: 'w-16 h-16 text-2xl'
    };
    return sizeClasses[size];
  };

  // 动画类
  const getAnimationClass = (mood: string) => {
    const animationClasses: Record<string, string> = {
      thinking: 'animate-pulse',
      counting: 'animate-bounce',
      happy: 'animate-pulse',
      confused: 'animate-pulse'
    };
    return animationClasses[mood] || '';
  };

  return (
    <div className={`relative ${className}`}>
      {/* 头像容器 */}
      <div
        className={`
          ${getSizeClasses(size)}
          ${getMoodColor(mood)}
          ${getAnimationClass(mood)}
          rounded-full 
          flex 
          items-center 
          justify-center 
          text-white 
          font-bold
          shadow-lg
          transition-all
          duration-300
          hover:scale-105
        `}
      >
        {getMoodEmoji(mood)}
      </div>

      {/* 状态指示器 */}
      {mood !== 'idle' && mood !== 'neutral' && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-ping" />
      )}

      {/* 名称标签（仅在较大尺寸时显示） */}
      {size !== 'sm' && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <p className="text-xs font-medium text-gray-600">{name}</p>
        </div>
      )}
    </div>
  );
}