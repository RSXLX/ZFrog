/**
 * 未读消息角标组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getInbox } from '../../services/message.api';
import './MessageBadge.css';

interface MessageBadgeProps {
  onClick?: () => void;
  refreshInterval?: number;
}

export const MessageBadge: React.FC<MessageBadgeProps> = ({ 
  onClick, 
  refreshInterval = 30000 
}) => {
  const { address } = useAccount();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!address) return;
    
    try {
      const data = await getInbox(address, { limit: 1 });
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [address]);

  useEffect(() => {
    fetchUnreadCount();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchUnreadCount, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchUnreadCount, refreshInterval]);

  if (!address) return null;

  return (
    <button className="message-badge-btn" onClick={onClick}>
      <span className="badge-icon">📬</span>
      {unreadCount > 0 && (
        <span className="badge-count">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default MessageBadge;
