// frontend/src/hooks/useChat.ts

import { useState, useCallback } from 'react';
import { chatApi } from '../services/chat.api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  data?: any;
}

export function useChat(frogId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(frogId, text, sessionId);
      
      // 更新 sessionId
      if (!sessionId) {
        setSessionId(response.sessionId);
      }

      // 添加青蛙回复
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.reply.content,
        intent: response.reply.intent,
        data: response.reply.data,
      }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // 错误处理
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '呱...出了点问题，等会再试试？',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [frogId, sessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}