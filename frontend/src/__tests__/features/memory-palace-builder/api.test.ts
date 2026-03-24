import { memoryWorldFeatureApi } from '@/features/memory-palace-builder/api';

describe('memoryWorldFeatureApi', () => {
  it('fails closed when integration api key is missing', async () => {
    await expect(memoryWorldFeatureApi.getWorldById('mpw_001')).rejects.toThrow(
      'V3 integration api key is required'
    );
  });
});
