import { councilFeatureApi } from '@/features/council/api';

describe('councilFeatureApi', () => {
  it('fails closed when integration api key is missing', async () => {
    await expect(councilFeatureApi.listSuggestions({ status: 'OPEN', limit: 20 })).rejects.toThrow(
      'V3 integration api key is required'
    );
  });
});
