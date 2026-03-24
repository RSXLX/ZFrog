/**
 * 🌙 HibernationBadge - 冬眠状态徽章组件
 * 
 * 功能:
 * - 显示冬眠状态（活跃/瞌睡/沉睡）
 * - 瞌睡状态显示警告动画
 * - 沉睡状态显示唤醒按钮
 */

import { motion } from 'framer-motion';
import type { LifeHibernationStatus as HibernationStatus } from '../../lib/api/contracts';

interface HibernationBadgeProps {
  status?: HibernationStatus | string | null;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

// 状态配置
const STATUS_CONFIG: Record<HibernationStatus, {
  icon: string;
  label: string;
  bgColor: string;
  textColor: string;
  pulse: boolean;
}> = {
  ACTIVE: {
    icon: '🌟',
    label: '活跃',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    pulse: false,
  },
  DROWSY: {
    icon: '😴',
    label: '瞌睡',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    pulse: true,
  },
  SLEEPING: {
    icon: '💤',
    label: '沉睡',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    pulse: true,
  },
};

// 尺寸配置
const SIZE_CONFIG = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
  lg: 'px-4 py-1.5 text-base gap-2',
};

const normalizeStatus = (status?: HibernationStatus | string | null): HibernationStatus => {
  switch ((status || '').toString().toUpperCase()) {
    case 'DROWSY':
      return 'DROWSY';
    case 'SLEEPING':
      return 'SLEEPING';
    case 'ACTIVE':
    default:
      return 'ACTIVE';
  }
};

export const HibernationBadge: React.FC<HibernationBadgeProps> = ({
  status,
  onClick,
  size = 'md',
}) => {
  const resolvedStatus = normalizeStatus(status);
  const config = STATUS_CONFIG[resolvedStatus];
  const sizeClass = SIZE_CONFIG[size];
  
  // 不显示活跃状态徽章
  if (resolvedStatus === 'ACTIVE') return null;
  
  return (
    <motion.button
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.textColor} ${sizeClass}
        ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        transition-all duration-200
      `}
      onClick={onClick}
      animate={config.pulse ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          '0 0 0 0 rgba(251, 146, 60, 0)',
          '0 0 0 4px rgba(251, 146, 60, 0.3)',
          '0 0 0 0 rgba(251, 146, 60, 0)',
        ],
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span className="text-base">{config.icon}</span>
      <span>{config.label}</span>
      {resolvedStatus === 'SLEEPING' && (
        <span className="ml-1 text-xs opacity-75">点击唤醒</span>
      )}
    </motion.button>
  );
};

export default HibernationBadge;
