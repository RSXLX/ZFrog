/**
 * 🌙 冬眠系统 API
 * 管理青蛙冬眠状态、唤醒、祈福
 */

import { api } from './api';

// 冬眠状态类型
export type HibernationStatus = 'ACTIVE' | 'DROWSY' | 'SLEEPING';

// 冬眠状态响应
export interface HibernationStatusResponse {
  status: HibernationStatus;
  hibernatedAt: string | null;
  blessingsReceived: number;
  revivalCost?: {
    baseCost: number;
    discount: number;
    finalCost: number;
    blessings: number;
  };
}

// 唤醒响应
export interface ReviveResponse {
  success: boolean;
  message: string;
  cost?: number;
}

// 祈福响应
export interface BlessResponse {
  success: boolean;
  message: string;
}

/**
 * 获取青蛙冬眠状态
 */
export async function getHibernationStatus(frogId: number): Promise<HibernationStatusResponse> {
  const response = await api.get(`/api/frog/${frogId}/hibernation`);
  return response.data;
}

/**
 * 获取唤醒费用（含祈福折扣）
 */
export async function getRevivalCost(frogId: number): Promise<{
  baseCost: number;
  discount: number;
  finalCost: number;
  blessings: number;
}> {
  const response = await api.get(`/api/frog/${frogId}/hibernation/revival-cost`);
  return response.data;
}

/**
 * 唤醒青蛙
 */
export async function reviveFrog(frogId: number): Promise<ReviveResponse> {
  const response = await api.post(`/api/frog/${frogId}/hibernation/revive`);
  return response.data;
}

/**
 * 祈福（帮助好友减少唤醒费用）
 */
export async function blessFrog(
  blesserFrogId: number,
  targetFrogId: number
): Promise<BlessResponse> {
  const response = await api.post(`/api/frog/${targetFrogId}/hibernation/bless`, {
    blesserFrogId,
  });
  return response.data;
}

export const hibernationApi = {
  getHibernationStatus,
  getRevivalCost,
  reviveFrog,
  blessFrog,
};

export default hibernationApi;
