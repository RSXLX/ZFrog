import { apiClient } from '../../lib/api/client';
import type {
  EggClaimPayload,
  EggClaimResult,
  EggLifecycleReadModel,
  HatchPayload,
  HatchResult,
  SoulImprintPayload,
  SoulImprintResult,
} from '../../lib/api/contracts';

class EggFeatureApi {
  async claimEgg(payload: EggClaimPayload): Promise<EggClaimResult> {
    return apiClient.postData<EggClaimResult>('/v1/frogs/claim-egg', payload);
  }

  async getLifecycle(frogId: number | string): Promise<EggLifecycleReadModel> {
    return apiClient.getData<EggLifecycleReadModel>(`/v1/frogs/${frogId}`);
  }

  async soulImprint(
    frogId: number | string,
    payload: SoulImprintPayload
  ): Promise<SoulImprintResult> {
    return apiClient.postData<SoulImprintResult>(`/v1/frogs/${frogId}/soul-imprint`, payload);
  }

  async hatch(frogId: number | string, payload?: HatchPayload): Promise<HatchResult> {
    return apiClient.postData<HatchResult>(`/v1/frogs/${frogId}/hatch`, payload || {});
  }
}

export const eggFeatureApi = new EggFeatureApi();
