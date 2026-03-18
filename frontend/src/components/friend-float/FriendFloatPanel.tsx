import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendFloatStore } from '../../stores/friendFloatStore';
import { useCommunityStore } from '../../stores/communityStore';
import { useNavigate } from 'react-router-dom';
import { Frog } from '../../types';
import { useDragAndDock } from './hooks/useDragAndDock';
import { useResizable } from './hooks/useResizable';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getNewDockPosition } from './hooks/usePanelPosition';

import { FriendFloatCollapsed } from './FriendFloatCollapsed';
import { FriendFloatHeader } from './FriendFloatHeader';
import { FriendFloatTabs } from './FriendFloatTabs';
import { FriendFloatList } from './FriendFloatList';
import { JoinCommunityModal } from './JoinCommunityModal';
import FriendRequests from '../frog/FriendRequests';
import FriendInteractionModal from '../frog/FriendInteraction';
import { useMyFrog } from '../../hooks/useMyFrog';
import '../../styles/friend-float.css';

// 动画配置
const springConfig: Record<string, any> = { type: 'spring', stiffness: 400, damping: 30 };
const panelVariants: Record<string, any> = {
  collapsed: {
    opacity: 0,
    scale: 0.8,
    transition: springConfig,
  },
  expanded: {
    opacity: 1,
    scale: 1,
    transition: springConfig,
  },
};

const maximizedOverlayVariants: Record<string, any> = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

const maximizedPanelVariants: Record<string, any> = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1, 
    transition: { type: 'spring', stiffness: 300, damping: 25 } 
  },
};

export const FriendFloatPanel: React.FC = () => {
  const navigate = useNavigate();
  const { frog } = useMyFrog();
  
  // 浮窗状态
  const {
    isExpanded,
    isMaximized,
    dockPosition,
    offset,
    size,
    setExpanded,
    setMaximized,
    setDockPosition,
    setOffset,
    setSize,
  } = useFriendFloatStore();
  
  const { activeCommunity } = useCommunityStore();
  
  // 使用抽离的 Hook
  const {
    isDragging,
    previewPosition,
    handleDragStart,
  } = useDragAndDock({
    initialPosition: dockPosition,
    initialOffset: offset,
    threshold: 50,
    onDockChange: (pos, off) => {
      setDockPosition(pos);
      setOffset(off);
    },
    enabled: !isMaximized,
  });

  const {
    isResizing,
    currentSize,
    handleResizeStart,
  } = useResizable({
    initialSize: size,
    minSize: { width: 280, height: 300 },
    maxSize: { width: 450, height: 600 },
    dockPosition,
    onResize: setSize,
    enabled: !isMaximized,
  });
  
  // 键盘快捷键
  useKeyboardShortcuts({
    isExpanded,
    isMaximized,
    onToggleExpand: () => setExpanded(!isExpanded),
    onToggleMaximize: () => setMaximized(!isMaximized),
    onClose: () => setExpanded(false),
    onChangeDock: (direction) => {
      const newPos = getNewDockPosition(dockPosition, direction);
      setDockPosition(newPos);
    },
    enabled: true,
  });
  
  // 本地状态

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'online'>('friends');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Frog | null>(null);
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<number | null>(null);

  // 处理好友互动
  const handleFriendClick = (friend: Frog, friendshipId: number) => {
    setSelectedFriend(friend);
    setSelectedFriendshipId(friendshipId);
  };

  const handleVisitClick = (friend: Frog) => {
    navigate(`/visit/${friend.ownerAddress}`);
    setExpanded(false);
  };

  const handleCloseInteraction = () => {
    setSelectedFriend(null);
    setSelectedFriendshipId(null);
  };

  // 计算面板位置样式
  const getPanelPositionStyle = (): React.CSSProperties => {
    const baseOffset = `${offset}%`;
    const panelSize = isResizing ? currentSize : size;
    
    if (dockPosition === 'left' || dockPosition === 'right') {
      return {
        [dockPosition]: 0,
        top: baseOffset,
        transform: 'translateY(-50%)',
        width: panelSize.width,
        height: panelSize.height,
      };
    } else {
      return {
        [dockPosition]: 0,
        left: baseOffset,
        transform: 'translateX(-50%)',
        width: panelSize.width,
        height: panelSize.height,
      };
    }
  };

  // 面板内容（复用）
  const renderPanelContent = (isMax: boolean) => (
    <>
      <FriendFloatHeader
        onClose={() => setExpanded(false)}
        onMaximize={() => setMaximized(!isMax)}
        onJoinCommunity={() => setShowJoinModal(true)}
        onDragStart={isMax ? () => {} : handleDragStart}
      />
      
      <FriendFloatTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {activeTab === 'friends' && (
        <FriendFloatList
          onFriendClick={handleFriendClick}
          onVisitClick={handleVisitClick}
        />
      )}
      
      {activeTab === 'requests' && frog && (
        <div className="float-content">
          <FriendRequests
            frogId={frog.tokenId}
            onRequestProcessed={() => {}}
          />
        </div>
      )}
      
      {activeTab === 'online' && (
        <FriendFloatList
          onFriendClick={handleFriendClick}
          onVisitClick={handleVisitClick}
        />
      )}
      
      <div className="float-footer">
        <button 
          className="float-footer-btn primary"
          onClick={() => {
            navigate('/friends');
            if (!isMax) setExpanded(false);
          }}
        >
          ⊕ 添加好友
        </button>
        <button 
          className="float-footer-btn"
          onClick={() => setShowJoinModal(true)}
        >
          🏘️ 加入社区
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 吸附预览指示器 */}
      <AnimatePresence>
        {isDragging && previewPosition && (
          <motion.div
            className={`dock-preview-indicator dock-${previewPosition}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* 收起态 */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={springConfig}
          >
            <FriendFloatCollapsed onClick={() => setExpanded(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 展开态 - 贴边浮窗 */}
      <AnimatePresence>
        {isExpanded && !isMaximized && (
          <motion.div
            className={`friend-float-panel friend-float-motion dock-${dockPosition} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
            style={{
              ...getPanelPositionStyle(),
              '--community-color': activeCommunity?.themeColor,
            } as React.CSSProperties}
            data-community-color={activeCommunity?.themeColor}
            variants={panelVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
          >
            {/* 拉伸手柄 */}
            {(dockPosition === 'left' || dockPosition === 'right') && (
              <div
                className={`float-resize-handle horizontal dock-${dockPosition}`}
                onPointerDown={handleResizeStart}
              />
            )}
            {(dockPosition === 'top' || dockPosition === 'bottom') && (
              <div
                className={`float-resize-handle vertical dock-${dockPosition}`}
                onPointerDown={handleResizeStart}
              />
            )}
            
            {renderPanelContent(false)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 最大化态 */}
      <AnimatePresence>
        {isMaximized && (
          <motion.div
            className="friend-float-maximized-overlay"
            variants={maximizedOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={() => setMaximized(false)}
          >
            <motion.div
              className="friend-float-maximized"
              variants={maximizedPanelVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                '--community-color': activeCommunity?.themeColor,
              } as React.CSSProperties}
              data-community-color={activeCommunity?.themeColor}
            >
              {renderPanelContent(true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <JoinCommunityModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
      
      {selectedFriend && selectedFriendshipId && frog && (
        <FriendInteractionModal
          friend={selectedFriend}
          friendshipId={selectedFriendshipId}
          currentFrogId={frog.tokenId}
          onClose={handleCloseInteraction}
        />
      )}
    </>
  );
};
