import { apiService } from './api';
import { 
  GardenState, 
  GardenVisit, 
  GardenMessage, 
  InteractionResponse,
  GardenApiResponse 
} from '../types/garden';

/**
 * 家园系统 API 服务
 */
class GardenApiService {
  
  /**
   * 获取家园状态
   */
  async getGardenState(frogId: number): Promise<GardenState> {
    const res = await apiService.get<GardenApiResponse<GardenState>>(`/api/garden/${frogId}`);
    return res.data;
  }

  /**
   * 发送访问请求（派青蛙去做客）
   */
  async sendVisit(hostFrogId: number, guestFrogId: number, giftType?: string): Promise<{ visitId: number; status: string }> {
    const res = await apiService.post<GardenApiResponse<{ visitId: number; status: string }>>(
      `/api/garden/${hostFrogId}/visit`,
      { guestFrogId, giftType }
    );
    return res.data;
  }

  /**
   * 获取当前访客列表
   */
  async getVisitors(frogId: number): Promise<GardenVisit[]> {
    const res = await apiService.get<GardenApiResponse<GardenVisit[]>>(`/api/garden/${frogId}/visitors`);
    return res.data;
  }

  /**
   * 发送互动（点赞/喂食/送礼）
   */
  async sendInteraction(
    frogId: number, 
    targetFrogId: number, 
    type: 'like' | 'feed' | 'gift' | 'photo' | 'message',
    data?: any
  ): Promise<InteractionResponse> {
    const res = await apiService.post<GardenApiResponse<InteractionResponse>>(
      `/api/garden/${frogId}/interact`,
      { targetFrogId, type, data }
    );
    return res.data;
  }

  /**
   * 通知访客离开
   */
  async leaveGarden(hostFrogId: number, guestFrogId: number): Promise<void> {
    await apiService.post(`/api/garden/${hostFrogId}/leave`, { guestFrogId });
  }

  /**
   * 获取留言板消息
   */
  async getMessages(frogId: number, limit = 20, offset = 0): Promise<GardenMessage[]> {
    const res = await apiService.get<GardenApiResponse<GardenMessage[]>>(
      `/api/garden/${frogId}/messages`,
      { params: { limit, offset } }
    );
    return res.data;
  }

  /**
   * 发送留言
   */
  async sendMessage(
    frogId: number, 
    authorFrogId: number, 
    content: string, 
    isQuick = false
  ): Promise<GardenMessage> {
    const res = await apiService.post<GardenApiResponse<GardenMessage>>(
      `/api/garden/${frogId}/messages`,
      { authorFrogId, content, isQuick }
    );
    return res.data;
  }

  /**
   * 点赞快捷方法
   */
  async like(frogId: number, targetFrogId: number): Promise<InteractionResponse> {
    return this.sendInteraction(frogId, targetFrogId, 'like');
  }

  /**
   * 喂食快捷方法
   */
  async feed(frogId: number, targetFrogId: number, foodType: string): Promise<InteractionResponse> {
    return this.sendInteraction(frogId, targetFrogId, 'feed', { foodType });
  }

  /**
   * 送礼快捷方法
   */
  async gift(frogId: number, targetFrogId: number, giftType: string): Promise<InteractionResponse> {
    return this.sendInteraction(frogId, targetFrogId, 'gift', { giftType });
  }
}

export const gardenApi = new GardenApiService();
