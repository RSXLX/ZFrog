import { apiClient } from '../../lib/api/client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

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

class MessageFeatureApi {
  async getInbox(
    address: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<InboxResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.unreadOnly) params.set('unreadOnly', 'true');

    const query = params.toString();
    const endpoint = query ? `/messages/inbox/${address}?${query}` : `/messages/inbox/${address}`;
    const response = await apiClient.get<Envelope<InboxResponse>>(endpoint);

    if (!response?.success || !response.data) {
      return { messages: [], total: 0, unreadCount: 0, hasMore: false };
    }

    return response.data;
  }

  async leaveMessage(payload: {
    fromFrogId: number;
    toAddress: string;
    message: string;
    emoji?: string;
    travelId?: number;
  }): Promise<VisitorMessage | null> {
    const response = await apiClient.post<Envelope<VisitorMessage>>('/messages/leave', payload);
    if (!response?.success) return null;
    return response.data || null;
  }

  async markAsRead(messageId: number | string): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(`/messages/read/${messageId}`);
    return Boolean(response?.success);
  }

  async markAllAsRead(address: string): Promise<{ markedCount: number }> {
    const response = await apiClient.post<Envelope<{ markedCount: number }>>(
      `/messages/read-all/${address}`
    );
    if (!response?.success || !response.data) return { markedCount: 0 };
    return response.data;
  }

  async getSentMessages(
    frogId: number,
    options?: { limit?: number; offset?: number }
  ): Promise<{ messages: VisitorMessage[]; total: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    const endpoint = query ? `/messages/sent/${frogId}?${query}` : `/messages/sent/${frogId}`;
    const response = await apiClient.get<
      Envelope<{ messages: VisitorMessage[]; total: number; hasMore: boolean }>
    >(endpoint);

    if (!response?.success || !response.data) {
      return { messages: [], total: 0, hasMore: false };
    }

    return response.data;
  }
}

export const messageFeatureApi = new MessageFeatureApi();
