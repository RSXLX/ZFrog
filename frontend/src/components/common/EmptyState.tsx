/**
 * EmptyState - 空状态组件
 * 用于显示无数据时的友好提示
 */

import { motion } from 'framer-motion';
import { LucideIcon, Inbox, Users, MapPin, Gift, Trophy } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      {/* 图标或 Emoji */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        {emoji ? (
          <span className="text-6xl">{emoji}</span>
        ) : Icon ? (
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon size={32} className="text-gray-400" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Inbox size={32} className="text-gray-400" />
          </div>
        )}
      </motion.div>

      {/* 标题 */}
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>

      {/* 描述 */}
      {description && (
        <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>
      )}

      {/* 操作按钮 */}
      {action && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition-colors"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

// 预设空状态
export function EmptyTravels({ onStartTravel }: { onStartTravel?: () => void }) {
  return (
    <EmptyState
      emoji="🗺️"
      title="还没有旅行记录"
      description="让你的青蛙去探索世界吧！每次旅行都会带来惊喜。"
      action={onStartTravel ? { label: '开始旅行', onClick: onStartTravel } : undefined}
    />
  );
}

export function EmptyFriends({ onAddFriend }: { onAddFriend?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="还没有好友"
      description="添加好友一起玩耍，还能结伴旅行获得更多奖励！"
      action={onAddFriend ? { label: '添加好友', onClick: onAddFriend } : undefined}
    />
  );
}

export function EmptySouvenirs() {
  return (
    <EmptyState
      icon={Gift}
      title="还没有纪念品"
      description="旅行时有机会获得稀有纪念品，快去探险吧！"
    />
  );
}

export function EmptyBadges() {
  return (
    <EmptyState
      icon={Trophy}
      title="还没有徽章"
      description="完成任务和成就可以获得徽章奖励。"
    />
  );
}

export function EmptyExplorations() {
  return (
    <EmptyState
      icon={MapPin}
      title="暂无探索记录"
      description="这次旅行还没有探索发现，耐心等待吧！"
    />
  );
}

export default EmptyState;
