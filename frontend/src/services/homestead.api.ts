/**
 * @deprecated 已弃用 - 请使用 home.api.ts 中的 homeApi
 * 
 * 此文件已合并到 home.api.ts
 * import { homeApi } from './home.api';
 * 
 * Homestead API Service - 家园系统前端 API
 */

import { apiService } from './api';

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

// ============ 装饰布局 API ============

export const homesteadApi = {
  // 获取布局
  async getLayout(frogId: number, sceneType: string) {
    return apiService.get(`/homestead/${frogId}/layout/${sceneType}`);
  },

  // 保存完整布局
  async saveLayout(frogId: number, sceneType: string, items: PlacedItemInput[], createSnapshot = true) {
    return apiService.post(`/homestead/${frogId}/layout/${sceneType}`, {
      items,
      createSnapshot,
    });
  },

  // 增量更新布局 (使用 POST 模拟 PATCH)
  async patchLayout(frogId: number, sceneType: string, patches: LayoutPatchItem[], expectedVersion?: number) {
    return apiService.post(`/homestead/${frogId}/layout/${sceneType}/patch`, {
      patches,
      expectedVersion,
    });
  },

  // 获取布局历史
  async getLayoutHistory(frogId: number, sceneType: string, limit = 5) {
    return apiService.get(`/homestead/${frogId}/layout/${sceneType}/history?limit=${limit}`);
  },

  // 恢复快照
  async restoreSnapshot(frogId: number, sceneType: string, snapshotId: string) {
    return apiService.post(`/homestead/${frogId}/layout/${sceneType}/restore/${snapshotId}`);
  },

  // ============ 装饰品库存 API ============

  // 获取装饰品库存
  async getDecorations(frogId: number) {
    return apiService.get(`/homestead/${frogId}/decorations`);
  },

  // 获取未摆放的装饰品
  async getUnplacedDecorations(frogId: number, sceneType: string) {
    return apiService.get(`/homestead/${frogId}/decorations/unplaced/${sceneType}`);
  },

  // ============ 礼物 API ============

  // 获取礼物
  async getGifts(frogId: number, unopenedOnly = false, page = 1, pageSize = 20) {
    const params = new URLSearchParams({
      unopenedOnly: unopenedOnly ? 'true' : 'false',
      page: String(page),
      pageSize: String(pageSize),
    });
    return apiService.get(`/homestead/${frogId}/gifts?${params}`);
  },

  // 发送礼物
  async sendGift(frogId: number, giftData: {
    fromAddress: string;
    giftType: 'ITEM' | 'NFT' | 'TOKEN' | 'DECORATION';
    itemName: string;
    itemImageUrl?: string;
    quantity?: number;
    message?: string;
  }) {
    return apiService.post(`/homestead/${frogId}/gifts`, giftData);
  },

  // 打开礼物
  async openGift(frogId: number, giftId: string) {
    return apiService.post(`/homestead/${frogId}/gifts/${giftId}/open`);
  },

  // ============ 相册 API ============

  // 获取照片
  async getPhotos(frogId: number, nftOnly = false, page = 1, pageSize = 20) {
    const params = new URLSearchParams({
      nftOnly: nftOnly ? 'true' : 'false',
      page: String(page),
      pageSize: String(pageSize),
    });
    return apiService.get(`/homestead/${frogId}/photos?${params}`);
  },

  // 上传照片
  async createPhoto(frogId: number, photoData: {
    imageUrl: string;
    travelId?: number;
    caption?: string;
    location?: string;
  }) {
    return apiService.post(`/homestead/${frogId}/photos`, photoData);
  },

  // 铸造照片为 NFT
  async mintPhotoNft(frogId: number, photoId: string, nftData: {
    nftContract: string;
    nftTokenId: string;
    mintTxHash: string;
  }) {
    return apiService.post(`/homestead/${frogId}/photos/${photoId}/mint`, nftData);
  },

  // 点赞照片
  async likePhoto(frogId: number, photoId: string) {
    return apiService.post(`/homestead/${frogId}/photos/${photoId}/like`);
  },

  // ============ 成就 API ============

  // 获取所有成就定义
  async getAllAchievements() {
    return apiService.get('/homestead/achievements');
  },

  // 获取青蛙的成就
  async getFrogAchievements(frogId: number) {
    return apiService.get(`/homestead/${frogId}/achievements`);
  },

  // 检查并解锁成就
  async checkAchievements(frogId: number) {
    return apiService.post(`/homestead/${frogId}/achievements/check`);
  },

  // 记录 SBT 铸造
  async recordSbtMint(frogId: number, achievementId: string, sbtData: {
    sbtTokenId: string;
    sbtTxHash: string;
  }) {
    return apiService.post(`/homestead/${frogId}/achievements/${achievementId}/mint-sbt`, sbtData);
  },
};

export default homesteadApi;
