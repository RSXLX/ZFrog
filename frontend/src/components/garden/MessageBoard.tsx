/**
 * MessageBoard - 留言板组件
 * 
 * 功能:
 * - 显示访客留言
 * - 点赞留言
 * - 打赏功能 (Web3)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gardenFeatureApi } from '../../features/garden/api';

export interface Message {
  id: number;
  fromFrogId: number;
  fromFrog?: {
    name: string;
    tokenId: number;
  };
  message: string;
  emoji?: string;
  likesCount: number;
  tipAmount?: string;
  createdAt: string;
  isRead: boolean;
}

interface MessageBoardProps {
  frogId: number;
  currentFrogId: number; // 当前操作的青蛙ID (留言者)
  isOwner: boolean;
  onClose: () => void;
}

export const MessageBoard: React.FC<MessageBoardProps> = ({
  frogId,
  currentFrogId,
  isOwner,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');

  const EMOJIS = ['💬', '❤️', '🎉', '👋', '🌟', '🐸'];

  // 加载留言
  useEffect(() => {
    loadMessages();
  }, [frogId]);

  const loadMessages = async () => {
    try {
      const list = await gardenFeatureApi.getMessages(frogId);
      setMessages(list || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // 发送留言
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await gardenFeatureApi.postMessage(frogId, {
        fromFrogId: currentFrogId,
        message: newMessage,
        emoji: selectedEmoji,
      });
      
      if (response.success) {
        setMessages([response.data, ...messages]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // 点赞
  const handleLike = async (messageId: number) => {
    try {
      await gardenFeatureApi.likeMessage(frogId, messageId);
      setMessages(msgs =>
        msgs.map(m =>
          m.id === messageId ? { ...m, likesCount: m.likesCount + 1 } : m
        )
      );
    } catch (error) {
      console.error('Failed to like message:', error);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md 
                   max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b 
                        dark:border-gray-700 bg-gradient-to-r from-amber-400 to-orange-400">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📝 留言板
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* 留言列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              加载中...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">📭</div>
              <p>还没有留言</p>
              <p className="text-sm mt-1">成为第一个留言的人吧！</p>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gray-50 dark:bg-gray-700 rounded-xl p-3 ${
                  !msg.isRead && isOwner ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                {/* 头部 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{msg.emoji || '💬'}</span>
                    <span className="font-semibold text-sm">
                      {msg.fromFrog?.name || `青蛙 #${msg.fromFrogId}`}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                
                {/* 内容 */}
                <p className="text-gray-700 dark:text-gray-200 text-sm mb-2">
                  {msg.message}
                </p>
                
                {/* 操作栏 */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleLike(msg.id)}
                    className="flex items-center gap-1 text-gray-400 hover:text-pink-500 
                               transition-colors text-sm"
                  >
                    <span>❤️</span>
                    <span>{msg.likesCount || 0}</span>
                  </button>
                  
                  {msg.tipAmount && (
                    <span className="text-xs text-amber-500 flex items-center gap-1">
                      💰 已打赏
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {/* 表情选择 */}
          <div className="flex gap-2 mb-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className={`w-8 h-8 rounded-full flex items-center justify-center 
                           transition-all ${
                             selectedEmoji === emoji
                               ? 'bg-amber-100 dark:bg-amber-900 scale-110'
                               : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                           }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          {/* 输入框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="写下你的留言..."
              className="flex-1 px-4 py-2 rounded-full border dark:border-gray-600 
                         bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 
                         focus:ring-amber-400"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 
                         text-white rounded-full font-medium transition-colors"
            >
              发送
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MessageBoard;
