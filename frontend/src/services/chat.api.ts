// frontend/src/services/chat.api.ts

import { api } from './api';
import { useAccount } from 'wagmi';

export interface SendMessageRequest {
  frogId: number;
  message: string;
  sessionId?: number;
  ownerAddress?: string;
}

export interface SendMessageResponse {
  sessionId: number;
  reply: {
    content: string;
    intent: string;
    data?: any;
  };
  frogMood: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface ChatSession {
  id: number;
  frogId: number;
  frogName: string;
  lastMessage: string;
  updatedAt: string;
}

export interface SessionsResponse {
  sessions: ChatSession[];
}

export const chatApi = {
  /**
   * 发送消息给青蛙
   */
  async sendMessage(
    frogId: number, 
    message: string, 
    sessionId?: number
  ): Promise<SendMessageResponse> {
    // 获取当前连接的钱包地址，如果没有则使用默认地址
    let ownerAddress = '0x0000000000000000000000000000000000000000';
    
    // 尝试从全局状态获取钱包地址
    try {
      // 检查是否有全局的wagmi实例
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          ownerAddress = accounts[0];
        }
      }
    } catch (error) {
      // 如果获取失败，使用默认地址
      console.warn('Failed to get wallet address:', error);
    }
    
    // 确保所有必需参数都存在
    if (!frogId || !message) {
      throw new Error('Missing required parameters: frogId or message');
    }
    
    console.log('Sending chat message:', { frogId, message, sessionId, ownerAddress });
    
    const response = await api.post<SendMessageResponse>('/chat/message', {
      frogId,
      message,
      sessionId,
      ownerAddress
    });
    return response.data;
  },

  /**
   * 获取聊天历史
   */
  async getChatHistory(sessionId: number): Promise<ChatHistoryResponse> {
    const response = await api.get<ChatHistoryResponse>(`/chat/history/${sessionId}`);
    return response.data;
  },

  /**
   * 获取用户所有会话
   */
  async getUserSessions(): Promise<SessionsResponse> {
    const response = await api.get<SessionsResponse>('/chat/sessions');
    return response.data;
  },

  /**
   * 创建新的聊天会话
   */
  async createSession(frogId: number): Promise<{ sessionId: number; frogId: number; createdAt: string }> {
    const response = await api.post('/chat/session', { frogId });
    return response.data;
  }
};