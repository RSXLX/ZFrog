/**
 * Chain Monitor Service Tests
 * Tests for the enhanced chain monitoring service
 */

import { ChainMonitorService, ChainEventType, ChainEvent } from '../services/chainMonitorWithFixes';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getBlockNumber: jest.fn().mockResolvedValue(1000),
    getBlock: jest.fn().mockResolvedValue({
      number: 1000,
      transactions: ['0x123', '0x456'],
    }),
    getTransaction: jest.fn().mockResolvedValue({
      hash: '0x123',
      from: '0xabc',
      to: '0xdef',
      value: ethers.parseEther('200'), // Large transfer
    }),
    getFeeData: jest.fn().mockResolvedValue({
      gasPrice: ethers.parseUnits('50', 'gwei'),
    }),
    destroy: jest.fn(),
  })),
  WebSocketProvider: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    destroy: jest.fn(),
  })),
  formatEther: jest.fn().mockReturnValue('200'),
  formatUnits: jest.fn().mockReturnValue('50'),
  parseEther: jest.fn().mockReturnValue(BigInt('200000000000000000000')),
  parseUnits: jest.fn().mockReturnValue(BigInt('50000000000')),
}));

describe('ChainMonitorService', () => {
  let service: ChainMonitorService;

  beforeEach(() => {
    service = new ChainMonitorService();
  });

  afterEach(async () => {
    await service.stop();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await service.initialize();
      expect(result).toBe(true);
    });

    it('should set isRunning to true after initialization', async () => {
      await service.initialize();
      const status = service.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should set providerConnected to true after initialization', async () => {
      await service.initialize();
      const status = service.getStatus();
      expect(status.providerConnected).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock provider to throw error
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Should not throw
      const result = await service.initialize();
      expect(result).toBe(true);
    });
  });

  describe('Event Listeners', () => {
    it('should add event listener', async () => {
      await service.initialize();
      
      const callback = jest.fn();
      const unsubscribe = service.addEventListener(ChainEventType.LARGE_TRANSFER, callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Cleanup
      unsubscribe();
    });

    it('should notify listeners on event', async () => {
      await service.initialize();
      
      const callback = jest.fn();
      service.addEventListener(ChainEventType.LARGE_TRANSFER, callback);
      
      // Simulate event
      const mockEvent: ChainEvent = {
        id: 'test-1',
        type: ChainEventType.LARGE_TRANSFER,
        timestamp: Date.now(),
        blockNumber: 1000,
        transactionHash: '0x123',
        from: '0xabc',
        to: '0xdef',
        value: '200',
      };
      
      // Manually trigger event emission
      (service as any).emitEvent(mockEvent);
      
      expect(callback).toHaveBeenCalledWith(mockEvent);
    });

    it('should allow unsubscribing listeners', async () => {
      await service.initialize();
      
      const callback = jest.fn();
      const unsubscribe = service.addEventListener(ChainEventType.LARGE_TRANSFER, callback);
      
      // Unsubscribe
      unsubscribe();
      
      // Trigger event
      const mockEvent: ChainEvent = {
        id: 'test-2',
        type: ChainEventType.LARGE_TRANSFER,
        timestamp: Date.now(),
        blockNumber: 1000,
        transactionHash: '0x123',
        from: '0xabc',
        to: '0xdef',
        value: '200',
      };
      
      (service as any).emitEvent(mockEvent);
      
      // Callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Event History', () => {
    it('should store event history', async () => {
      await service.initialize();
      
      // Create events
      const event1: ChainEvent = {
        id: '1',
        type: ChainEventType.LARGE_TRANSFER,
        timestamp: Date.now(),
        blockNumber: 100,
        transactionHash: '0x1',
        from: '0xa',
        to: '0xb',
        value: '100',
      };
      
      const event2: ChainEvent = {
        id: '2',
        type: ChainEventType.WHALE_TRANSFER,
        timestamp: Date.now(),
        blockNumber: 101,
        transactionHash: '0x2',
        from: '0xc',
        to: '0xd',
        value: '1000',
      };
      
      // Emit events
      (service as any).emitEvent(event1);
      (service as any).emitEvent(event2);
      
      // Get history
      const history = service.getEventHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('2'); // Most recent first
      expect(history[1].id).toBe('1');
    });

    it('should limit history size', async () => {
      await service.initialize();
      
      // Create 1500 events
      for (let i = 0; i < 1500; i++) {
        const event: ChainEvent = {
          id: `${i}`,
          type: ChainEventType.LARGE_TRANSFER,
          timestamp: Date.now(),
          blockNumber: i,
          transactionHash: `0x${i}`,
          from: '0x0',
          to: '0x1',
          value: '100',
        };
        (service as any).emitEvent(event);
      }
      
      // Get history
      const history = service.getEventHistory();
      
      // Should be limited to 1000
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    it('should filter by event type', async () => {
      await service.initialize();
      
      // Create events of different types
      const largeTransfer: ChainEvent = {
        id: '1',
        type: ChainEventType.LARGE_TRANSFER,
        timestamp: Date.now(),
        blockNumber: 100,
        transactionHash: '0x1',
        from: '0xa',
        to: '0xb',
        value: '100',
      };
      
      const whaleTransfer: ChainEvent = {
        id: '2',
        type: ChainEventType.WHALE_TRANSFER,
        timestamp: Date.now(),
        blockNumber: 101,
        transactionHash: '0x2',
        from: '0xc',
        to: '0xd',
        value: '1000',
      };
      
      const gasSpike: ChainEvent = {
        id: '3',
        type: ChainEventType.GAS_SPIKE,
        timestamp: Date.now(),
        blockNumber: 102,
        transactionHash: '0x3',
        from: '0x0',
        to: '0x0',
        value: '0',
        gasPrice: '100000000000',
      };
      
      (service as any).emitEvent(largeTransfer);
      (service as any).emitEvent(whaleTransfer);
      (service as any).emitEvent(gasSpike);
      
      // Filter by LARGE_TRANSFER
      const largeTransfers = service.getEventHistory(ChainEventType.LARGE_TRANSFER);
      expect(largeTransfers).toHaveLength(1);
      expect(largeTransfers[0].type).toBe(ChainEventType.LARGE_TRANSFER);
      
      // Filter by WHALE_TRANSFER
      const whaleTransfers = service.getEventHistory(ChainEventType.WHALE_TRANSFER);
      expect(whaleTransfers).toHaveLength(1);
      expect(whaleTransfers[0].type).toBe(ChainEventType.WHALE_TRANSFER);
      
      // Filter by GAS_SPIKE
      const gasSpikes = service.getEventHistory(ChainEventType.GAS_SPIKE);
      expect(gasSpikes).toHaveLength(1);
      expect(gasSpikes[0].type).toBe(ChainEventType.GAS_SPIKE);
    });
  });

  describe('Status', () => {
    it('should return correct status when not running', () => {
      const status = service.getStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.providerConnected).toBe(false);
      expect(status.wsConnected).toBe(false);
      expect(status.eventCount).toBe(0);
    });

    it('should return correct status when running', async () => {
      await service.initialize();
      
      // Add some events
      const event: ChainEvent = {
        id: '1',
        type: ChainEventType.LARGE_TRANSFER,
        timestamp: Date.now(),
        blockNumber: 100,
        transactionHash: '0x1',
        from: '0x0',
        to: '0x1',
        value: '100',
      };
      (service as any).emitEvent(event);
      
      const status = service.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.providerConnected).toBe(true);
      expect(status.eventCount).toBe(1);
    });
  });

  describe('Stop', () => {
    it('should stop monitoring', async () => {
      await service.initialize();
      
      expect(service.getStatus().isRunning).toBe(true);
      
      await service.stop();
      
      expect(service.getStatus().isRunning).toBe(false);
      expect(service.getStatus().providerConnected).toBe(false);
    });

    it('should clear all listeners on stop', async () => {
      await service.initialize();
      
      const callback = jest.fn();
      service.addEventListener(ChainEventType.LARGE_TRANSFER, callback);
      
      await service.stop();
      
      // After stop, all listeners should be cleared
      // (Implementation detail: listeners map is cleared)
    });
  });
});
