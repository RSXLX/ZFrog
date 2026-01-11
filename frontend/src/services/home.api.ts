/**
 * Home API Service - 家园系统统一 API
 * 
 * 合并自 garden.api.ts 和 homestead.api.ts
 * 成就模块复用 api.ts 中的 getBadges()
 */

import { apiService } from './api';
import { 
  GardenState, 
  GardenVisit, 
  GardenMessage, 
  InteractionResponse,
  GardenApiResponse 
} from '../types/garden';

// ============ 类型定义 ============

export interface PlacedItemInput {
  userDecorationId: string;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
}

export interface LayoutPatchItem {
  id?: string;
  action: 'add' | 'update' | 'remove';
  data?: PlacedItemInput;
}

export interface GiftData {
  fromAddress: string;
  giftType: 'ITEM' | 'NFT' | 'TOKEN' | 'DECORATION';
  itemName: string;
  itemImageUrl?: string;
  quantity?: number;
  message?: string;
}

export interface PhotoData {
  imageUrl: string;
  travelId?: number;
  caption?: string;
  location?: string;
}

export interface NftMintData {
  nftContract: string;
  nftTokenId: string;
  mintTxHash: string;
}

// ============ 统一家园 API 服务 ============

class HomeApiService {
  
  // ═══════════════════════════════════════════════
  // 家园状态 & 社交模块 (原 garden.api.ts)
  // ═══════════════════════════════════════════════

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

  // 互动快捷方法
  async like(frogId: number, targetFrogId: number): Promise<InteractionResponse> {
    return this.sendInteraction(frogId, targetFrogId, 'like');
  }

  async feed(frogId: number, targetFrogId: number, foodType: string): Promise<InteractionResponse> {
    return this.sendInteraction(frogId, targetFrogId, 'feed', { foodType });
  }

  async giftInteraction(frogId: number, targetFrogId: number, giftType: string): Promise<InteractionResponse> {
    return this.sendInteraction(frogId, targetFrogId, 'gift', { giftType });
  }

  // ═══════════════════════════════════════════════
  // 布局管理模块 (原 homestead.api.ts)
  // ═══════════════════════════════════════════════

  /**
   * 获取布局
   */
  async getLayout(frogId: number, sceneType: string) {
    return apiService.get(`/homestead/${frogId}/layout/${sceneType}`);
  }

  /**
   * 保存完整布局
   */
  async saveLayout(frogId: number, sceneType: string, items: PlacedItemInput[], createSnapshot = true) {
    return apiService.post(`/homestead/${frogId}/layout/${sceneType}`, {
      items,
      createSnapshot,
    });
  }

  /**
   * 增量更新布局
   */
  async patchLayout(frogId: number, sceneType: string, patches: LayoutPatchItem[], expectedVersion?: number) {
    return apiService.post(`/homestead/${frogId}/layout/${sceneType}/patch`, {
      patches,
      expectedVersion,
    });
  }

  /**
   * 获取布局历史
   */
  async getLayoutHistory(frogId: number, sceneType: string, limit = 5) {
    return apiService.get(`/homestead/${frogId}/layout/${sceneType}/history?limit=${limit}`);
  }

  /**
   * 恢复快照
   */
  async restoreSnapshot(frogId: number, sceneType: string, snapshotId: string) {
    return apiService.post(`/homestead/${frogId}/layout/${sceneType}/restore/${snapshotId}`);
  }

  // ═══════════════════════════════════════════════
  // 装饰品模块
  // ═══════════════════════════════════════════════

  /**
   * 获取装饰品库存
   */
  async getDecorations(frogId: number) {
    return apiService.get(`/homestead/${frogId}/decorations`);
  }

  /**
   * 获取未摆放的装饰品
   */
  async getUnplacedDecorations(frogId: number, sceneType: string) {
    return apiService.get(`/homestead/${frogId}/decorations/unplaced/${sceneType}`);
  }

  // ═══════════════════════════════════════════════
  // 礼物模块
  // ═══════════════════════════════════════════════

  /**
   * 获取礼物列表
   */
  async getGifts(frogId: number, unopenedOnly = false, page = 1, pageSize = 20) {
    const params = new URLSearchParams({
      unopenedOnly: unopenedOnly ? 'true' : 'false',
      page: String(page),
      pageSize: String(pageSize),
    });
    return apiService.get(`/homestead/${frogId}/gifts?${params}`);
  }

  /**
   * 发送礼物到礼物盒
   */
  async sendGift(frogId: number, giftData: GiftData) {
    return apiService.post(`/homestead/${frogId}/gifts`, giftData);
  }

  /**
   * 打开礼物
   */
  async openGift(frogId: number, giftId: string) {
    return apiService.post(`/homestead/${frogId}/gifts/${giftId}/open`);
  }

  // ═══════════════════════════════════════════════
  // 相册模块
  // ═══════════════════════════════════════════════

  /**
   * 获取照片
   */
  async getPhotos(frogId: number, nftOnly = false, page = 1, pageSize = 20) {
    const params = new URLSearchParams({
      nftOnly: nftOnly ? 'true' : 'false',
      page: String(page),
      pageSize: String(pageSize),
    });
    return apiService.get(`/homestead/${frogId}/photos?${params}`);
  }

  /**
   * 上传照片
   */
  async createPhoto(frogId: number, photoData: PhotoData) {
    return apiService.post(`/homestead/${frogId}/photos`, photoData);
  }

  /**
   * 铸造照片为 NFT
   */
  async mintPhotoNft(frogId: number, photoId: string, nftData: NftMintData) {
    return apiService.post(`/homestead/${frogId}/photos/${photoId}/mint`, nftData);
  }

  /**
   * 点赞照片
   */
  async likePhoto(frogId: number, photoId: string) {
    return apiService.post(`/homestead/${frogId}/photos/${photoId}/like`);
  }

  // ═══════════════════════════════════════════════
  // 徽章/成就模块 (复用 api.ts 中的 getBadges)
  // ═══════════════════════════════════════════════

  /**
   * 获取徽章 (复用 apiService.getBadges)
   */
  async getBadges(frogId: number) {
    return apiService.getBadges(frogId);
  }
}

export const homeApi = new HomeApiService();
export default homeApi;

// 保持向后兼容
export { homeApi as gardenApi };
export { homeApi as homesteadApi };
