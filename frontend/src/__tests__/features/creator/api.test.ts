import { creatorFeatureApi } from '@/features/creator/api';

describe('creatorFeatureApi', () => {
  it('fails closed when integration api key is missing', async () => {
    await expect(creatorFeatureApi.listAssets({ limit: 10 })).rejects.toThrow(
      'V3 integration api key is required'
    );
  });
});
