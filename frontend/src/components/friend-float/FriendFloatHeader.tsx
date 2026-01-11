import React from 'react';
import { CommunitySwitcher } from './CommunitySwitcher';
import { useFriendFloatStore } from '../../stores/friendFloatStore';

interface FriendFloatHeaderProps {
  onClose: () => void;
  onMaximize: () => void;
  onJoinCommunity: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}

export const FriendFloatHeader: React.FC<FriendFloatHeaderProps> = ({
  onClose,
  onMaximize,
  onJoinCommunity,
  onDragStart,
}) => {
  const { isMaximized } = useFriendFloatStore();
  
  return (
    <div 
      className="float-header"
      onPointerDown={onDragStart}
    >
      <div className="float-header-title">
        <CommunitySwitcher onJoinCommunity={onJoinCommunity} />
      </div>
      
      <div className="float-header-controls">
        {/* 最小化按钮 */}
        <button 
          className="float-control-btn"
          onClick={onClose}
          title="收起"
        >
          ─
        </button>
        
        {/* 最大化/还原按钮 */}
        <button 
          className="float-control-btn"
          onClick={onMaximize}
          title={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? '❐' : '□'}
        </button>
        
        {/* 关闭按钮 */}
        <button 
          className="float-control-btn close"
          onClick={onClose}
          title="关闭"
        >
          ×
        </button>
      </div>
    </div>
  );
};
