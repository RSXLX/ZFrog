/**
 * 串门留言收件箱组件
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { messageFeatureApi, VisitorMessage } from '../../features/message/api';
import './MessageInbox.css';

interface MessageInboxProps {
  onClose?: () => void;
}

export const MessageInbox: React.FC<MessageInboxProps> = ({ onClose }) => {
  const { address } = useAccount();
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (address) {
      loadMessages();
    }
  }, [address]);

  const loadMessages = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const data = await messageFeatureApi.getInbox(address);
      setMessages(data.messages);
      setUnreadCount(data.unreadCount);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await messageFeatureApi.markAsRead(messageId);
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, isRead: true } : m)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!address) return;
    
    try {
      await messageFeatureApi.markAllAsRead(address);
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="message-inbox">
        <div className="inbox-loading">
          <span className="spinner">🐸</span>
          <p>加载留言中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-inbox">
      <div className="inbox-header">
        <h3>📬 串门留言簿</h3>
        <div className="inbox-actions">
          {unreadCount > 0 && (
            <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
              全部已读
            </button>
          )}
          {onClose && (
            <button className="close-btn" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      <div className="inbox-stats">
        <span>共 {total} 条留言</span>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount} 条未读</span>
        )}
      </div>

      <div className="message-list">
        {messages.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>还没有收到留言</p>
            <p className="hint">邀请朋友的青蛙来串门吧~</p>
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id} 
              className={`message-item ${!msg.isRead ? 'unread' : ''}`}
              onClick={() => !msg.isRead && handleMarkAsRead(msg.id)}
            >
              <div className="message-avatar">
                {msg.emoji || '🐸'}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="sender-name">
                    {msg.fromFrog?.name || `青蛙 #${msg.fromFrogId}`}
                  </span>
                  <span className="message-time">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="message-text">{msg.message}</p>
              </div>
              {!msg.isRead && <span className="unread-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessageInbox;
