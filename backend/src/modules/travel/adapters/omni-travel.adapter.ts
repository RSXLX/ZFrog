import { ChainType } from '@prisma/client';
import { omniTravelService } from '../../../services/omni-travel.service';

export interface CrossChainEligibility {
  canStart: boolean;
  reason?: string;
  [key: string]: unknown;
}

export type CrossChainOnChainStatus = Awaited<
  ReturnType<typeof omniTravelService.getCrossChainTravelStatus>
>;

export type CrossChainVisitingStatus = Awaited<
  ReturnType<typeof omniTravelService.checkVisitingFrogOnChain>
>;

export type ActiveCrossChainTravelRecord = Awaited<
  ReturnType<typeof omniTravelService.getActiveCrossChainTravels>
>[number];

export class OmniTravelCommandAdapter {
  async onCrossChainTravelStarted(travelId: number, messageId: string, txHash: string): Promise<void> {
    await omniTravelService.onCrossChainTravelStarted(travelId, messageId, txHash);
  }

  async onFrogArrivedAtTarget(tokenId: number, messageId: string, arrivalTime: Date): Promise<void> {
    await omniTravelService.onFrogArrivedAtTarget(tokenId, messageId, arrivalTime);
  }

  async onCrossChainTravelCompleted(
    tokenId: number,
    returnMessageId: string,
    xpEarned: number,
    txHash: string
  ): Promise<void> {
    await omniTravelService.onCrossChainTravelCompleted(tokenId, returnMessageId, xpEarned, txHash);
  }

  async syncCrossChainTravelState(tokenId: number): Promise<void> {
    await omniTravelService.syncCrossChainTravelState(tokenId);
  }
}

export class OmniTravelQueryAdapter {
  getSupportedChains(): { chainId: number; name: string; chainType: ChainType }[] {
    return omniTravelService.getSupportedChains();
  }

  async canStartCrossChainTravel(tokenId: number, targetChainId: number): Promise<CrossChainEligibility> {
    return omniTravelService.canStartCrossChainTravel(tokenId, targetChainId);
  }

  async getCrossChainTravelStatus(tokenId: number): Promise<CrossChainOnChainStatus> {
    return omniTravelService.getCrossChainTravelStatus(tokenId);
  }

  async checkVisitingFrogOnChain(tokenId: number, targetChainId: number): Promise<CrossChainVisitingStatus> {
    return omniTravelService.checkVisitingFrogOnChain(tokenId, targetChainId);
  }

  async getActiveCrossChainTravels(): Promise<ActiveCrossChainTravelRecord[]> {
    return omniTravelService.getActiveCrossChainTravels();
  }
}

export const omniTravelCommandAdapter = new OmniTravelCommandAdapter();
export const omniTravelQueryAdapter = new OmniTravelQueryAdapter();
