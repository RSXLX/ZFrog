import { apiClient } from '../../lib/api/client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class NotificationFeatureApi {
  async getUnreadCount(frogTokenId: number | string): Promise<number> {
    const response = await apiClient.get<Envelope<{ count?: number }>>(
      `/notifications/${frogTokenId}/unread-count`
    );
    if (!response?.success) return 0;
    return Number(response.data?.count || 0);
  }

  async list(frogTokenId: number | string): Promise<{ notifications: any[]; unreadCount: number }> {
    const response = await apiClient.get<Envelope<{ notifications?: any[]; unreadCount?: number }>>(
      `/notifications/${frogTokenId}`
    );
    if (!response?.success || !response.data) {
      return { notifications: [], unreadCount: 0 };
    }
    return {
      notifications: Array.isArray(response.data.notifications) ? response.data.notifications : [],
      unreadCount: Number(response.data.unreadCount || 0),
    };
  }

  async markAsRead(notificationId: number | string): Promise<boolean> {
    const response = await apiClient.put<Envelope<any>>(`/notifications/${notificationId}/read`);
    return Boolean(response?.success);
  }

  async markAllAsRead(frogTokenId: number | string): Promise<boolean> {
    const response = await apiClient.put<Envelope<any>>(`/notifications/${frogTokenId}/read-all`);
    return Boolean(response?.success);
  }

  async remove(notificationId: number | string): Promise<boolean> {
    const response = await apiClient.delete<Envelope<any>>(`/notifications/${notificationId}`);
    return Boolean(response?.success);
  }
}

export const notificationFeatureApi = new NotificationFeatureApi();
