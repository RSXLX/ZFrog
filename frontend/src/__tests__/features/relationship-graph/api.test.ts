import { relationshipGraphFeatureApi } from '@/features/relationship-graph/api';

describe('relationshipGraphFeatureApi', () => {
  it('fails closed when integration api key is missing', async () => {
    await expect(relationshipGraphFeatureApi.getFrogGraph(901, { limit: 10 })).rejects.toThrow(
      'V3 integration api key is required'
    );
  });
});
