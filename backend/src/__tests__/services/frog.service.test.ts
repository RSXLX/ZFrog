import { FrogService } from '@/services/frog.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    frog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    travel: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('FrogService', () => {
  let frogService: FrogService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    frogService = new FrogService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getFrogById', () => {
    it('should return a frog by id', async () => {
      const mockFrog = {
        id: 1,
        name: 'Ribbit',
        owner: '0x123...',
        level: 5,
        experience: 450,
        strength: 12,
        agility: 15,
        intelligence: 10,
        currentChain: 'ethereum',
        isTraveling: false,
        travelCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);

      const result = await frogService.getFrogById(1);

      expect(mockPrisma.frog.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          travels: { orderBy: { createdAt: 'desc' }, take: 10 },
          owner: true,
        },
      });
      expect(result).toEqual(mockFrog);
    });

    it('should return null if frog not found', async () => {
      mockPrisma.frog.findUnique.mockResolvedValue(null);

      const result = await frogService.getFrogById(999);

      expect(result).toBeNull();
    });
  });

  describe('createFrog', () => {
    it('should create a new frog with correct initial values', async () => {
      const createData = {
        name: 'NewFrog',
        owner: '0x1234567890abcdef1234567890abcdef12345678',
        currentChain: 'ethereum',
      };

      const mockCreatedFrog = {
        id: 1,
        ...createData,
        level: 1,
        experience: 0,
        strength: 10,
        agility: 10,
        intelligence: 10,
        isTraveling: false,
        travelCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.frog.create.mockResolvedValue(mockCreatedFrog);

      const result = await frogService.createFrog(createData);

      expect(mockPrisma.frog.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          level: 1,
          experience: 0,
          strength: 10,
          agility: 10,
          intelligence: 10,
          isTraveling: false,
          travelCount: 0,
        },
      });
      expect(result).toEqual(mockCreatedFrog);
    });
  });

  describe('startTravel', () => {
    it('should successfully start travel for a frog', async () => {
      const mockFrog = {
        id: 1,
        owner: '0x123...',
        currentChain: 'ethereum',
        isTraveling: false,
        level: 5,
        travelCount: 3,
        lastTravelTime: new Date(Date.now() - 86400000), // 1 day ago
      };

      const mockTravel = {
        id: 1,
        frogId: 1,
        fromChain: 'ethereum',
        toChain: 'binance',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000), // 1 hour
        status: 'traveling',
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.frog.update.mockResolvedValue({ ...mockFrog, isTraveling: true });
      mockPrisma.travel.create.mockResolvedValue(mockTravel);

      const result = await frogService.startTravel({
        frogId: 1,
        fromChain: 'ethereum',
        toChain: 'binance',
        owner: '0x123...',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.frog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          isTraveling: true,
          currentChain: 'binance',
          travelCount: { increment: 1 },
          lastTravelTime: expect.any(Date),
        },
      });
    });

    it('should throw error if frog is already traveling', async () => {
      const mockFrog = {
        id: 1,
        isTraveling: true,
        owner: '0x123...',
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);

      await expect(
        frogService.startTravel({
          frogId: 1,
          fromChain: 'ethereum',
          toChain: 'binance',
          owner: '0x123...',
        })
      ).rejects.toThrow('Frog is already traveling');
    });

    it('should throw error if cooldown period has not passed', async () => {
      const mockFrog = {
        id: 1,
        isTraveling: false,
        owner: '0x123...',
        lastTravelTime: new Date(Date.now() - 10000), // 10 seconds ago
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);

      await expect(
        frogService.startTravel({
          frogId: 1,
          fromChain: 'ethereum',
          toChain: 'binance',
          owner: '0x123...',
        })
      ).rejects.toThrow('Travel cooldown period has not passed');
    });
  });

  describe('getFrogsByOwner', () => {
    it('should return all frogs owned by an address', async () => {
      const mockFrogs = [
        { id: 1, name: 'Frog1', owner: '0x123...' },
        { id: 2, name: 'Frog2', owner: '0x123...' },
        { id: 3, name: 'Frog3', owner: '0x123...' },
      ];

      mockPrisma.frog.findMany.mockResolvedValue(mockFrogs);

      const result = await frogService.getFrogsByOwner('0x123...');

      expect(mockPrisma.frog.findMany).toHaveBeenCalledWith({
        where: { owner: '0x123...' },
        orderBy: { createdAt: 'desc' },
        include: {
          travels: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
      expect(result).toEqual(mockFrogs);
      expect(result).toHaveLength(3);
    });

    it('should return empty array if owner has no frogs', async () => {
      mockPrisma.frog.findMany.mockResolvedValue([]);

      const result = await frogService.getFrogsByOwner('0x999...');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('levelUp', () => {
    it('should level up frog when experience threshold is reached', async () => {
      const mockFrog = {
        id: 1,
        level: 1,
        experience: 100, // Threshold for level 2
        owner: '0x123...',
      };

      const updatedFrog = {
        ...mockFrog,
        level: 2,
        experience: 0,
        strength: 11,
        agility: 11,
        intelligence: 11,
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);
      mockPrisma.frog.update.mockResolvedValue(updatedFrog);

      const result = await frogService.levelUp(1, '0x123...');

      expect(mockPrisma.frog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          level: { increment: 1 },
          experience: 0,
          strength: { increment: 1 },
          agility: { increment: 1 },
          intelligence: { increment: 1 },
        },
      });
      expect(result.level).toBe(2);
    });

    it('should throw error if frog does not belong to owner', async () => {
      const mockFrog = {
        id: 1,
        owner: '0x123...',
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);

      await expect(
        frogService.levelUp(1, '0x999...')
      ).rejects.toThrow('Not the frog owner');
    });
  });

  describe('feedFrog', () => {
    it('should increase frog experience when fed', async () => {
      const mockFrog = {
        id: 1,
        owner: '0x123...',
        experience: 50,
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);
      mockPrisma.frog.update.mockResolvedValue({
        ...mockFrog,
        experience: 70, // +20 from feeding
      });

      const result = await frogService.feedFrog(1, '0x123...');

      expect(mockPrisma.frog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          experience: { increment: 20 },
        },
      });
      expect(result.experience).toBe(70);
    });

    it('should throw error if frog is not found', async () => {
      mockPrisma.frog.findUnique.mockResolvedValue(null);

      await expect(
        frogService.feedFrog(999, '0x123...')
      ).rejects.toThrow('Frog not found');
    });
  });

  describe('trainFrog', () => {
    it('should increase frog stats based on training type', async () => {
      const mockFrog = {
        id: 1,
        owner: '0x123...',
        strength: 10,
        agility: 10,
        intelligence: 10,
        experience: 100,
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);
      mockPrisma.frog.update.mockResolvedValue({
        ...mockFrog,
        strength: 12, // +2 from strength training
        experience: 110, // +10 from training
      });

      const result = await frogService.trainFrog(1, '0x123...', 'strength');

      expect(mockPrisma.frog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          strength: { increment: 2 },
          experience: { increment: 10 },
        },
      });
      expect(result.strength).toBe(12);
    });

    it('should support different training types', async () => {
      const trainingTypes = ['strength', 'agility', 'intelligence'];
      
      for (const type of trainingTypes) {
        const mockFrog = {
          id: 1,
          owner: '0x123...',
          strength: 10,
          agility: 10,
          intelligence: 10,
        };

        mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);
        
        const expectedUpdate: any = {
          experience: { increment: 10 },
        };
        expectedUpdate[type] = { increment: 2 };

        mockPrisma.frog.update.mockResolvedValue({
          ...mockFrog,
          [type]: 12,
        });

        await frogService.trainFrog(1, '0x123...', type);

        expect(mockPrisma.frog.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: expectedUpdate,
        });
      }
    });

    it('should throw error for invalid training type', async () => {
      const mockFrog = {
        id: 1,
        owner: '0x123...',
      };

      mockPrisma.frog.findUnique.mockResolvedValue(mockFrog);

      await expect(
        frogService.trainFrog(1, '0x123...', 'invalid-type')
      ).rejects.toThrow('Invalid training type');
    });
  });

  describe('getTravelHistory', () => {
    it('should return travel history for a frog', async () => {
      const mockTravels = [
        {
          id: 1,
          frogId: 1,
          fromChain: 'ethereum',
          toChain: 'binance',
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-01T01:00:00'),
          status: 'completed',
          transactionHash: '0x123...',
        },
        {
          id: 2,
          frogId: 1,
          fromChain: 'binance',
          toChain: 'bitcoin',
          startTime: new Date('2024-01-02'),
          endTime: null,
          status: 'traveling',
          transactionHash: '0x456...',
        },
      ];

      mockPrisma.travel.findMany.mockResolvedValue(mockTravels);

      const result = await frogService.getTravelHistory(1);

      expect(mockPrisma.travel.findMany).toHaveBeenCalledWith({
        where: { frogId: 1 },
        orderBy: { startTime: 'desc' },
        include: {
          fromChain: true,
          toChain: true,
        },
      });
      expect(result).toEqual(mockTravels);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no travel history', async () => {
      mockPrisma.travel.findMany.mockResolvedValue([]);

      const result = await frogService.getTravelHistory(999);

      expect(result).toEqual([]);
    });

    it('should calculate total travel time for completed travels', async () => {
      const mockTravels = [
        {
          id: 1,
          frogId: 1,
          fromChain: 'ethereum',
          toChain: 'binance',
          startTime: new Date('2024-01-01T10:00:00'),
          endTime: new Date('2024-01-01T11:00:00'), // 1 hour
          status: 'completed',
        },
        {
          id: 2,
          frogId: 1,
          fromChain: 'binance',
          toChain: 'bitcoin',
          startTime: new Date('2024-01-02T10:00:00'),
          endTime: new Date('2024-01-02T12:00:00'), // 2 hours
          status: 'completed',
        },
      ];

      mockPrisma.travel.findMany.mockResolvedValue(mockTravels);

      const result = await frogService.getTravelHistory(1);
      
      // Calculate total travel time in hours
      const totalTravelTime = result.reduce((total: number, travel: any) => {
        if (travel.status === 'completed' && travel.endTime) {
          return total + (new Date(travel.endTime).getTime() - new Date(travel.startTime).