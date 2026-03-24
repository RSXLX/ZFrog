import { journeyFeatureApi } from '@/features/journey/api';

describe('journeyFeatureApi', () => {
  it('fails closed when integration api key is missing', async () => {
    await expect(journeyFeatureApi.getViewer('jrn_001')).rejects.toThrow(
      'V3 integration api key is required'
    );
  });
});
