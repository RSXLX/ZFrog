import { journeyEventsFeatureApi } from '@/features/journey-events/api';

describe('journeyEventsFeatureApi', () => {
  it('fails closed when integration api key is missing', async () => {
    await expect(journeyEventsFeatureApi.listIncidents('jrn_001')).rejects.toThrow(
      'V3 integration api key is required'
    );
  });
});
