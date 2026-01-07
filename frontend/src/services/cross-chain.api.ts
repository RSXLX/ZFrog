/**
 * Cross-Chain Travel API Service
 * 
 * Handles API calls for cross-chain frog travel
 */

import { api } from './api';

export interface SupportedChain {
  chainId: number;
  name: string;
  chainType: string;
}

export interface CrossChainEligibility {
  canStart: boolean;
  reason?: string;
}

export interface CrossChainTravelStatus {
  onChain: {
    owner: string;
    targetChainId: number;
    messageId: string;
    startTime: Date;
    maxDuration: number;
    status: string;
  } | null;
  database: {
    id: number;
    status: string;
    crossChainStatus: string;
    progress: number;
    targetChain: string;
  } | null;
}

export interface VisitingFrogInfo {
  isVisiting: boolean;
  owner?: string;
  name?: string;
  arrivalTime?: Date;
  actionsExecuted?: number;
  xpEarned?: number;
}

/**
 * Get list of supported chains for cross-chain travel
 */
export async function getSupportedChains(): Promise<SupportedChain[]> {
  const response = await api.get<{ data: SupportedChain[] }>('/cross-chain/supported-chains');
  return response.data;
}

/**
 * Check if a frog can start cross-chain travel
 */
export async function canStartCrossChainTravel(
  tokenId: number,
  targetChainId: number
): Promise<CrossChainEligibility> {
  const response = await api.get<{ data: CrossChainEligibility }>(
    `/cross-chain/can-travel/${tokenId}?targetChainId=${targetChainId}`
  );
  return response.data;
}

/**
 * Create a cross-chain travel record
 */
export async function createCrossChainTravel(data: {
  frogId: number;
  tokenId: number;
  targetChainId: number;
  duration: number;
  ownerAddress: string;
}): Promise<{ travelId: number }> {
  const response = await api.post<{ data: { travelId: number } }>('/cross-chain/travel', data);
  return response.data;
}

/**
 * Update travel record when blockchain transaction is confirmed
 */
export async function notifyCrossChainTravelStarted(
  travelId: number,
  messageId: string,
  txHash: string
): Promise<void> {
  await api.post(`/cross-chain/travel/${travelId}/started`, { messageId, txHash });
}

/**
 * Get cross-chain travel status
 */
export async function getCrossChainTravelStatus(tokenId: number): Promise<CrossChainTravelStatus> {
  const response = await api.get<{ data: CrossChainTravelStatus }>(
    `/cross-chain/travel/${tokenId}/status`
  );
  return response.data;
}

/**
 * Check if frog is visiting target chain
 */
export async function checkVisitingFrog(
  tokenId: number,
  targetChainId: number
): Promise<VisitingFrogInfo> {
  const response = await api.get<{ data: VisitingFrogInfo }>(
    `/cross-chain/travel/${tokenId}/visiting?targetChainId=${targetChainId}`
  );
  return response.data;
}

/**
 * Get all active cross-chain travels
 */
export async function getActiveCrossChainTravels(): Promise<any[]> {
  const response = await api.get<{ data: any[] }>('/cross-chain/active');
  return response.data;
}

/**
 * Sync database with on-chain state
 */
export async function syncCrossChainState(tokenId: number): Promise<void> {
  await api.post(`/cross-chain/sync/${tokenId}`);
}
