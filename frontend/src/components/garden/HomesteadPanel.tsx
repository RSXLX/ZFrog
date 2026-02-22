/**
 * HomesteadPanel - 家园功能入口面板
 * 
 * 功能:
 * - 提供 4 个功能模块入口
 * - 编辑模式切换
 * - 统一管理弹窗状态
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBoard } from './MessageBoard';
import { GiftBox } from './GiftBox';
import { PhotoAlbum } from './PhotoAlbum';
import { AchievementWall } from './AchievementWall';

interface HomesteadPanelProps {
  frogId: number;
  isOwner: boolean;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  unopenedGiftCount?: number;
  unreadMessageCount?: number;
}

type ActivePanel = 'messages' | 'gifts' | 'photos' | 'achievements' | null;

const PANEL_ITEMS = [
  { id: 'messages', icon: '📝', label: '留言板', color: 'from-amber-400 to-orange-400' },
  { id: 'gifts', icon: '🎁', label: '礼物盒', color: 'from-pink-400 to-rose-400' },
  { id: 'photos', icon: '📷', label: '相册', color: 'from-blue-400 to-indigo-400' },
  { id: 'achievements', icon: '🏆', label: '成就', color: 'from-yellow-400 to-amber-400' },
] as const;

export const HomesteadPanel: React.FC<HomesteadPanelProps> = ({
  frogId,
  isOwner,
  isEditMode,
  onToggleEditMode,
  unopenedGiftCount = 0,
  unreadMessageCount = 0,
}) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const handlePanelClick = (panelId: ActivePanel) => {
    setActivePanel(panelId);
  };

  const closePanel = () => {
    setActivePanel(null);
  };

  return (
    <>
      {/* 功能面板 */}
      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {PANEL_ITEMS.map((item, index) => (
          <motion.button
            key={item.id}
            className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} 
                       shadow-lg flex items-center justify-center text-xl
                       hover:scale-110 transition-transform`}
            onClick={() => handlePanelClick(item.id as ActivePanel)}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title={item.label}
          >
            <span>{item.icon}</span>
            
            {/* 未读/未开封徽章 */}
            {item.id === 'messages' && unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white 
                              text-xs rounded-full flex items-center justify-center">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
            {item.id === 'gifts' && unopenedGiftCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white 
                              text-xs rounded-full flex items-center justify-center">
                {unopenedGiftCount > 9 ? '9+' : unopenedGiftCount}
              </span>
            )}
          </motion.button>
        ))}

        {/* 编辑模式按钮 (仅 owner) */}
        {isOwner && (
          <motion.button
            className={`w-12 h-12 rounded-xl shadow-lg flex items-center justify-center text-xl
                       transition-all ${
                         isEditMode
                           ? 'bg-green-500 text-white'
                           : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                       }`}
            onClick={onToggleEditMode}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title={isEditMode ? '保存布局' : '编辑家园'}
          >
            {isEditMode ? '✓' : '✏️'}
          </motion.button>
        )}
      </motion.div>

      {/* 编辑模式提示 */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white 
                       px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-30"
          >
            <span>✏️</span>
            <span className="font-medium">编辑模式</span>
            <span className="text-sm opacity-80">- 拖拽装饰品布置家园</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 弹窗组件 */}
      <AnimatePresence>
        {activePanel === 'messages' && (
          <MessageBoard 
            frogId={frogId} 
            currentFrogId={frogId} 
            isOwner={isOwner} 
            onClose={closePanel} 
          />
        )}
        {activePanel === 'gifts' && (
          <GiftBox frogId={frogId} isOwner={isOwner} onClose={closePanel} />
        )}
        {activePanel === 'photos' && (
          <PhotoAlbum frogId={frogId} isOwner={isOwner} onClose={closePanel} />
        )}
        {activePanel === 'achievements' && (
          <AchievementWall frogId={frogId} isOwner={isOwner} onClose={closePanel} />
        )}
      </AnimatePresence>
    </>
  );
};

export default HomesteadPanel;
