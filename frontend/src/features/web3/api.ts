import { apiClient } from '../../lib/api/client';
import type { FrogWalletReadModel, OnchainMilestoneReadModel } from '../../lib/api/contracts';

class Web3FeatureApi {
  async getFrogWallet(frogId: number | string): Promise<FrogWalletReadModel> {
    return apiClient.getData<FrogWalletReadModel>(`/v1/frogs/${frogId}/wallet`);
  }

  async getOnchainMilestones(
    frogId: number | string,
    limit = 20
  ): Promise<OnchainMilestoneReadModel[]> {
    return apiClient.getData<OnchainMilestoneReadModel[]>(`/v1/frogs/${frogId}/milestones`, {
      params: { limit },
    });
  }
}

export const web3FeatureApi = new Web3FeatureApi();
