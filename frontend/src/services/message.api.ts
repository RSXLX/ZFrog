/**
 * 串门留言 API
 */

import { api } from './api';

export interface VisitorMessage {
  id: number;
  fromFrogId: number;
  toAddress: string;
  message: string;
  emoji?: string;
  travelId?: number;
  isRead: boolean;
  createdAt: string;
  fromFrog?: {
    name: string;
    tokenId: number;
  };
}

export interface InboxResponse {
  messages: VisitorMessage[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

/**
 * 获取收件箱消息
 */
export const getInbox = async (
  address: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean }
): Promise<InboxResponse> => {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  
  const response = await api.get<{ success: boolean; data: InboxResponse }>(
    `/messages/inbox/${address}?${params.toString()}`
  );
  return response.data;
};

/**
 * 留下消息
 */
export const leaveMessage = async (data: {
  fromFrogId: number;
  toAddress: string;
  message: string;
  emoji?: string;
  travelId?: number;
}): Promise<VisitorMessage> => {
  const response = await api.post<{ success: boolean; data: VisitorMessage }>(
    '/messages/leave',
    data
  );
  return response.data;
};

/**
 * 标记消息为已读
 */
export const markAsRead = async (messageId: number): Promise<void> => {
  await api.post(`/messages/read/${messageId}`);
};

/**
 * 标记所有消息为已读
 */
export const markAllAsRead = async (address: string): Promise<{ markedCount: number }> => {
  const response = await api.post<{ success: boolean; data: { markedCount: number } }>(
    `/messages/read-all/${address}`
  );
  return response.data;
};

/**
 * 获取发送的消息
 */
export const getSentMessages = async (
  frogId: number,
  options?: { limit?: number; offset?: number }
): Promise<{ messages: VisitorMessage[]; total: number; hasMore: boolean }> => {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const response = await api.get<{ success: boolean; data: any }>(
    `/messages/sent/${frogId}?${params.toString()}`
  );
  return response.data;
};
