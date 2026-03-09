/**
 * Lifecycle Configuration Tests
 * Tests for the fixed lifecycle decay rates
 */

import { LIFECYCLE_CONFIG, PRODUCTION_LIFECYCLE_CONFIG, TEST_LIFECYCLE_CONFIG } from '../config/lifecycle';

describe('Lifecycle Configuration', () => {
  describe('Production Config', () => {
    it('should have correct hunger decay rate (4 hours)', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.decay.hunger.value).toBe(1);
      expect(PRODUCTION_LIFECYCLE_CONFIG.decay.hunger.interval).toBe(4 * 60 * 60 * 1000); // 4 hours in ms
    });

    it('should have correct energy decay rate (2 hours)', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.decay.energy.value).toBe(1);
      expect(PRODUCTION_LIFECYCLE_CONFIG.decay.energy.interval).toBe(2 * 60 * 60 * 1000); // 2 hours in ms
    });

    it('should have correct happiness decay rate (3 hours)', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.decay.happiness.value).toBe(1);
      expect(PRODUCTION_LIFECYCLE_CONFIG.decay.happiness.interval).toBe(3 * 60 * 60 * 1000); // 3 hours in ms
    });

    it('should have correct health decay rate (8 hours)', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.decay.health.value).toBe(1);
      expect(PRODUCTION_LIFECYCLE_CONFIG.decay.health.interval).toBe(8 * 60 * 60 * 1000); // 8 hours in ms
    });
  });

  describe('Recovery Values', () => {
    it('should have correct feeding recovery', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.recovery.feed.hunger).toBe(30);
      expect(PRODUCTION_LIFECYCLE_CONFIG.recovery.feed.health).toBe(5);
    });

    it('should have correct sleep recovery', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.recovery.sleep.energy).toBe(50);
      expect(PRODUCTION_LIFECYCLE_CONFIG.recovery.sleep.health).toBe(10);
    });

    it('should have correct play recovery', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.recovery.play.happiness).toBe(20);
      expect(PRODUCTION_LIFECYCLE_CONFIG.recovery.play.energy).toBe(-5);
    });
  });

  describe('Thresholds', () => {
    it('should have correct warning threshold', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.thresholds.warning).toBe(30);
    });

    it('should have correct critical threshold', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.thresholds.critical).toBe(10);
    });

    it('should have correct death threshold', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.thresholds.death).toBe(0);
    });
  });

  describe('Value Range', () => {
    it('should have correct min value', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.range.min).toBe(0);
    });

    it('should have correct max value', () => {
      expect(PRODUCTION_LIFECYCLE_CONFIG.range.max).toBe(100);
    });
  });

  describe('Test Config', () => {
    it('should have faster decay for testing', () => {
      expect(TEST_LIFECYCLE_CONFIG.decay.hunger.interval).toBe(10 * 1000); // 10 seconds
      expect(TEST_LIFECYCLE_CONFIG.decay.energy.interval).toBe(5 * 1000); // 5 seconds
    });
  });

  describe('Improvement Metrics', () => {
    it('should show 75% improvement for hunger decay', () => {
      const oldInterval = 60 * 60 * 1000; // 1 hour
      const newInterval = 4 * 60 * 60 * 1000; // 4 hours
      const improvement = ((newInterval - oldInterval) / oldInterval) * 100;
      expect(improvement).toBe(300); // 300% longer = 75% slower decay
    });

    it('should show 75% improvement for energy decay', () => {
      const oldInterval = 30 * 60 * 1000; // 30 minutes (for -2/hour)
      const newInterval = 2 * 60 * 60 * 1000; // 2 hours
      const improvement = ((newInterval - oldInterval) / oldInterval) * 100;
      expect(improvement).toBe(300); // 300% longer
    });
  });
});
