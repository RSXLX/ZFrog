import { lifeFeatureApi } from '@/features/life/api';

const mockGetData = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    getData: (...args: unknown[]) => mockGetData(...args),
  },
}));

describe('lifeFeatureApi legacy hibernation adapters', () => {
  beforeEach(() => {
    mockGetData.mockReset();
  });

  it('normalizes legacy hibernation payloads to status field', async () => {
    mockGetData.mockResolvedValue({
      hibernationStatus: 'sleeping',
      isDormant: true,
      mood: 'quiet',
      blessingsReceived: 2,
    });

    const result = await lifeFeatureApi.getLegacyHibernationStatus(4);

    expect(mockGetData).toHaveBeenCalledWith('/frog/4/hibernation');
    expect(result).toEqual({
      status: 'SLEEPING',
      isDormant: true,
      mood: 'quiet',
      hibernatedAt: null,
      blessingsReceived: 2,
      revivalCost: undefined,
    });
  });

  it('falls back to ACTIVE when legacy status is missing or invalid', async () => {
    mockGetData.mockResolvedValue({
      status: 'unknown',
      isDormant: false,
      mood: 'ok',
    });

    const result = await lifeFeatureApi.getLegacyHibernationStatus(8);

    expect(result.status).toBe('ACTIVE');
  });

  it('uses getData for legacy revival cost', async () => {
    mockGetData.mockResolvedValue({
      baseCost: 100,
      discount: 20,
      finalCost: 80,
      blessings: 2,
    });

    const result = await lifeFeatureApi.getLegacyRevivalCost(4);

    expect(mockGetData).toHaveBeenCalledWith('/frog/4/hibernation/revival-cost');
    expect(result.finalCost).toBe(80);
  });
});
