import express from 'express';
import request from 'supertest';
import travelRoutes from '../../api/routes/travel.routes';
import groupTravelRoutes from '../../api/routes/group-travel.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { travelCommandServiceV1 } from '../../modules/travel/travel.command';
import { travelQueryServiceV1 } from '../../modules/travel/travel.query';
import { groupTravelService } from '../../services/group-travel.service';
import { prisma } from '../../database';
import { travelProcessor } from '../../workers/travelProcessor';

jest.mock('../../modules/travel/travel.command', () => ({
  travelCommandServiceV1: {
    startTravel: jest.fn(),
    completeTravel: jest.fn(),
    startGroupTravel: jest.fn(),
    feedTravel: jest.fn(),
    performRescue: jest.fn(),
    confirmGroupTravel: jest.fn(),
    completeGroupTravel: jest.fn(),
  },
}));

jest.mock('../../modules/travel/travel.query', () => ({
  travelQueryServiceV1: {
    getTravel: jest.fn(),
    getLegacyHistory: jest.fn(),
    getLegacyStats: jest.fn(),
    getLegacyActiveTravel: jest.fn(),
    getLegacyTravelsByTokenId: jest.fn(),
    getGroupTravelByTravelId: jest.fn(),
    getPublicRescueRequests: jest.fn(),
    getFriendRescueRequests: jest.fn(),
    getTravelFeeds: jest.fn(),
  },
}));

jest.mock('../../services/group-travel.service', () => ({
  groupTravelService: {
    prepareGroupTravel: jest.fn(),
  },
}));

jest.mock('../../database', () => ({
  prisma: {
    frog: {
      findUnique: jest.fn(),
    },
    travel: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../workers/travelProcessor', () => ({
  travelProcessor: {
    processTravel: jest.fn(),
  },
}));

jest.mock('../../services/travel/exploration.service', () => ({
  explorationService: {
    getRandomTargetAddress: jest.fn(),
  },
}));

jest.mock('../../services/travel/snack-preference.service', () => ({
  snackPreferenceService: {
    getPreference: jest.fn(),
    getAllSnackTypes: jest.fn(),
  },
}));

jest.mock('../../services/travel/exploration-footprint.service', () => ({
  explorationFootprintService: {
    generateShareCard: jest.fn(),
    getFrogDiscoveries: jest.fn(),
    getGoldLabelLeaderboard: jest.fn(),
  },
}));

describe('Legacy Travel Route Delegation E2E', () => {
  const app = express();

  const mockCommand = travelCommandServiceV1 as jest.Mocked<typeof travelCommandServiceV1>;
  const mockQuery = travelQueryServiceV1 as jest.Mocked<typeof travelQueryServiceV1>;
  const mockGroupTravel = groupTravelService as jest.Mocked<typeof groupTravelService>;
  const mockPrisma = prisma as unknown as {
    frog: { findUnique: jest.Mock };
    travel: { findUnique: jest.Mock };
  };
  const mockProcessor = travelProcessor as jest.Mocked<typeof travelProcessor>;

  app.use(express.json());
  app.use('/api/travels', travelRoutes);
  app.use('/api/group-travel', groupTravelRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery.getLegacyHistory.mockResolvedValue({
      travels: [{ id: 101 }],
      total: 1,
      hasMore: false,
    });
    mockQuery.getLegacyStats.mockResolvedValue({
      totalTrips: 1,
      bscTrips: 0,
      ethTrips: 0,
      zetaTrips: 1,
      totalDiscoveries: 2,
      rareFinds: 1,
      totalFrogs: 1,
      recentTravel: { id: 101 },
    });
    mockQuery.getLegacyActiveTravel.mockResolvedValue({
      id: 101,
      frogId: 1,
      status: 'Active',
      startTime: new Date(Date.now() - 5000),
      endTime: new Date(Date.now() + 5000),
      exploredBlock: '123',
      progress: 30,
    } as any);
    mockQuery.getTravelFeeds.mockResolvedValue([{ id: 1, feedType: 'energy' }]);
    mockQuery.getGroupTravelByTravelId.mockResolvedValue({ id: 1, travelId: 101 } as any);
    mockQuery.getPublicRescueRequests.mockResolvedValue([{ id: 10 }] as any);
    mockQuery.getFriendRescueRequests.mockResolvedValue([{ id: 11 }] as any);

    mockCommand.startTravel.mockResolvedValue({
      travelId: 101,
      status: 'PENDING',
      currentStage: 'PREPARING',
      progress: 0,
      targetChain: 'ZETACHAIN_ATHENS',
      chainId: 7001,
      endTime: new Date(Date.now() + 60_000).toISOString(),
    });
    mockCommand.startGroupTravel.mockResolvedValue({
      travelId: 201,
      groupTravelId: 301,
      leader: { id: 1, name: 'Leader' },
      companion: { id: 2, name: 'Companion' },
      targetChain: 'ZETACHAIN_ATHENS',
      chainId: 7001,
    });
    mockCommand.feedTravel.mockResolvedValue({
      success: true,
      timeReduced: 30,
      newEndTime: new Date(Date.now() + 30_000),
      message: 'ok',
    });
    mockCommand.performRescue.mockResolvedValue({
      success: true,
      message: 'rescued',
      xpEarned: 10,
      reputationEarned: 5,
    });
    mockCommand.confirmGroupTravel.mockResolvedValue({
      success: true,
      data: {
        travelId: 201,
        groupTravelId: 301,
      },
    });
    mockCommand.completeGroupTravel.mockResolvedValue({
      success: true,
      unifiedTravel: {
        travelId: 201,
        status: 'COMPLETED',
        currentStage: 'COMPLETED',
        progress: 100,
        souvenirId: null,
        completedAt: new Date().toISOString(),
      },
    });

    mockGroupTravel.prepareGroupTravel.mockResolvedValue({ success: true } as any);

    mockPrisma.frog.findUnique.mockResolvedValue({
      id: 1,
      tokenId: 1,
      ownerAddress: '0xabc0000000000000000000000000000000000001',
      name: 'Leader',
    });
    mockPrisma.travel.findUnique.mockResolvedValue({
      id: 101,
      frog: {
        tokenId: 1,
        name: 'Leader',
      },
    });

    mockProcessor.processTravel.mockResolvedValue(undefined as any);
  });

  it('GET /api/travels/history delegates to travel.query legacy history', async () => {
    const response = await request(app).get('/api/travels/history').query({
      address: '0xabc0000000000000000000000000000000000001',
      frogId: '1',
      limit: '5',
      offset: '0',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockQuery.getLegacyHistory).toHaveBeenCalledWith({
      walletAddress: '0xabc0000000000000000000000000000000000001',
      frogTokenId: 1,
      limit: 5,
      offset: 0,
    });
  });

  it('GET /api/travels/stats delegates to travel.query legacy stats', async () => {
    const response = await request(app).get('/api/travels/stats').query({
      address: '0xabc0000000000000000000000000000000000001',
      frogId: '1',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockQuery.getLegacyStats).toHaveBeenCalledWith({
      walletAddress: '0xabc0000000000000000000000000000000000001',
      frogTokenId: 1,
    });
  });

  it('POST /api/travels/start delegates to travel.command.startTravel', async () => {
    const response = await request(app).post('/api/travels/start').send({
      frogId: 1,
      travelType: 'RANDOM',
      targetChain: 'ZETACHAIN_ATHENS',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockCommand.startTravel).toHaveBeenCalled();
    expect(mockProcessor.processTravel).toHaveBeenCalled();
  });

  it('POST /api/travels/group delegates to travel.command.startGroupTravel', async () => {
    const response = await request(app).post('/api/travels/group').send({
      leaderId: 1,
      companionId: 2,
      targetChain: 'ZETACHAIN_ATHENS',
      duration: 3600,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockCommand.startGroupTravel).toHaveBeenCalledWith(
      expect.objectContaining({
        leaderTokenId: 1,
        companionTokenId: 2,
      })
    );
  });

  it('POST /api/travels/:travelId/feed delegates to travel.command.feedTravel', async () => {
    const response = await request(app).post('/api/travels/101/feed').send({
      feederId: 9,
      feedType: 'energy',
    });

    expect(response.status).toBe(200);
    expect(mockCommand.feedTravel).toHaveBeenCalledWith({
      travelId: 101,
      feederId: 9,
      feedType: 'energy',
    });
  });

  it('GET /api/travels/:travelId/feeds and /:travelId/group delegate to travel.query', async () => {
    const feedsResp = await request(app).get('/api/travels/101/feeds');
    const groupResp = await request(app).get('/api/travels/101/group');

    expect(feedsResp.status).toBe(200);
    expect(groupResp.status).toBe(200);
    expect(mockQuery.getTravelFeeds).toHaveBeenCalledWith(101);
    expect(mockQuery.getGroupTravelByTravelId).toHaveBeenCalledWith(101);
  });

  it('rescue endpoints delegate read/write to travel.query/travel.command', async () => {
    const publicResp = await request(app).get('/api/travels/rescue/public').query({ limit: '10' });
    const friendResp = await request(app).get('/api/travels/rescue/friends/1');
    const rescueResp = await request(app).post('/api/travels/rescue/7').send({ rescuerId: 9 });

    expect(publicResp.status).toBe(200);
    expect(friendResp.status).toBe(200);
    expect(rescueResp.status).toBe(200);

    expect(mockQuery.getPublicRescueRequests).toHaveBeenCalledWith(10);
    expect(mockQuery.getFriendRescueRequests).toHaveBeenCalledWith(1);
    expect(mockCommand.performRescue).toHaveBeenCalledWith({
      requestId: 7,
      rescuerId: 9,
    });
  });

  it('group-travel confirm/complete delegates to travel.command', async () => {
    const confirmResp = await request(app).post('/api/group-travel/confirm').send({
      txHash: '0xabc',
      leaderTokenId: 1,
      companionTokenId: 2,
      targetChainId: 7001,
      duration: 3600,
      crossChainMessageId: 'msg-1',
      provisionsUsed: '0',
    });

    const completeResp = await request(app).post('/api/group-travel/complete').send({
      crossChainMessageId: 'msg-1',
      xpReward: 50,
    });

    expect(confirmResp.status).toBe(200);
    expect(completeResp.status).toBe(200);

    expect(mockCommand.confirmGroupTravel).toHaveBeenCalled();
    expect(mockCommand.completeGroupTravel).toHaveBeenCalledWith({
      crossChainMessageId: 'msg-1',
      xpReward: 50,
    });
  });
});
