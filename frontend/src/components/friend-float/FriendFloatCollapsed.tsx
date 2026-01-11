import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendFloatStore } from '../../stores/friendFloatStore';
import { useCommunityStore } from '../../stores/communityStore';
import '../../styles/friend-float.css';

interface FriendFloatCollapsedProps {
  onClick: () => void;
}

// 预览面板精简内容
const PreviewContent: React.FC = () => {
  const { pendingRequestCount } = useFriendFloatStore();
  const { activeCommunity } = useCommunityStore();
  
  return (
    <div className="collapsed-preview-content">
      <div className="collapsed-preview-header">
        <span className="preview-icon">{activeCommunity?.icon || '🏠'}</span>
        <span className="preview-title">{activeCommunity?.name || 'ZetaFrog Official'}</span>
      </div>
      <div className="collapsed-preview-stats">
        {pendingRequestCount > 0 && (
          <div className="preview-stat">
            <span className="stat-count">{pendingRequestCount}</span>
            <span className="stat-label">待处理请求</span>
          </div>
        )}
        <div className="preview-hint">
          点击展开 • <kbd>Alt+F</kbd>
        </div>
      </div>
    </div>
  );
};

export const FriendFloatCollapsed: React.FC<FriendFloatCollapsedProps> = ({ onClick }) => {
  const { dockPosition, offset, unreadCount, pendingRequestCount } = useFriendFloatStore();
  const { activeCommunity } = useCommunityStore();
  
  // 悬停预览状态
  const [isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimerRef = useRef<number>();
  const leaveTimerRef = useRef<number>();
  
  const totalBadge = unreadCount + pendingRequestCount;
  
  // 悬停预览逻辑
  useEffect(() => {
    if (isHovering) {
      // 清除离开计时器
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
      // 500ms 后显示预览
      hoverTimerRef.current = window.setTimeout(() => {
        setShowPreview(true);
      }, 500);
    } else {
      // 清除悬停计时器
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      // 200ms 后隐藏预览
      leaveTimerRef.current = window.setTimeout(() => {
        setShowPreview(false);
      }, 200);
    }
    
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, [isHovering]);
  
  // 计算位置样式
  const getPositionStyle = (): React.CSSProperties => {
    const baseOffset = `${offset}%`;
    
    switch (dockPosition) {
      case 'right':
        return { top: baseOffset, transform: 'translateY(-50%)' };
      case 'left':
        return { top: baseOffset, transform: 'translateY(-50%)' };
      case 'top':
        return { left: baseOffset, transform: 'translateX(-50%)' };
      case 'bottom':
        return { left: baseOffset, transform: 'translateX(-50%)' };
      default:
        return {};
    }
  };
  
  // 计算预览面板位置
  const getPreviewPositionStyle = (): React.CSSProperties => {
    switch (dockPosition) {
      case 'right':
        return { right: '60px', top: '50%', transform: 'translateY(-50%)' };
      case 'left':
        return { left: '60px', top: '50%', transform: 'translateY(-50%)' };
      case 'top':
        return { top: '60px', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { bottom: '60px', left: '50%', transform: 'translateX(-50%)' };
      default:
        return {};
    }
  };
  
  return (
    <div
      className={`friend-float-collapsed dock-${dockPosition}`}
      style={getPositionStyle()}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      title="打开好友面板 (Alt+F)"
    >
      <span className="collapsed-avatar">🐸</span>
      
      {/* 未读角标 */}
      {totalBadge > 0 && (
        <span className="collapsed-badge">
          {totalBadge > 99 ? '99+' : totalBadge}
        </span>
      )}
      
      {/* 社区色条 */}
      {activeCommunity && (
        <span 
          className="collapsed-community-bar"
          style={{ backgroundColor: activeCommunity.themeColor }}
        />
      )}
      
      {/* 悬停预览面板 */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            className="collapsed-preview"
            style={getPreviewPositionStyle()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PreviewContent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
