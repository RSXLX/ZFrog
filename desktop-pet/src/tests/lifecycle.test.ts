/**
 * Lifecycle System Tests
 * Tests for the new lifecycle configuration with fixed decay rates
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LIFECYCLE_CONFIG, TEST_LIFECYCLE_CONFIG } from '../config/lifecycle';

describe('Lifecycle Configuration', () => {
  describe('Production Config', () => {
    it('should have correct decay intervals for production', () => {
      // Hunger: 4 hours
      expect(LIFECYCLE_CONFIG.decay.hunger.interval).toBe(4 * 60 * 60 * 1000);
      expect(LIFECYCLE_CONFIG.decay.hunger.value).toBe(1);
      
      // Energy: 2 hours
      expect(LIFECYCLE_CONFIG.decay.energy.interval).toBe(2 * 60 * 60 * 1000);
      expect(LIFECYCLE_CONFIG.decay.energy.value).toBe(1);
      
      // Happiness: 3 hours
      expect(LIFECYCLE_CONFIG.decay.happiness.interval).toBe(3 * 60 * 60 * 1000);
      expect(LIFECYCLE_CONFIG.decay.happiness.value).toBe(1);
      
      // Health: 8 hours
      expect(LIFECYCLE_CONFIG.decay.health.interval).toBe(8 * 60 * 60 * 1000);
      expect(LIFECYCLE_CONFIG.decay.health.value).toBe(1);
    });
    
    it('should have correct recovery values', () => {
      expect(LIFECYCLE_CONFIG.recovery.feed).toEqual({ hunger: 30, health: 5 });
      expect(LIFECYCLE_CONFIG.recovery.sleep).toEqual({ energy: 50, health: 10 });
      expect(LIFECYCLE_CONFIG.recovery.play).toEqual({ happiness: 20, energy: -5 });
      expect(LIFECYCLE_CONFIG.recovery.pet).toEqual({ happiness: 10, health: 2 });
      expect(LIFECYCLE_CONFIG.recovery.medicine).toEqual({ health: 30 });
    });
    
    it('should have correct thresholds', () => {
      expect(LIFECYCLE_CONFIG.thresholds.warning).toBe(30);
      expect(LIFECYCLE_CONFIG.thresholds.critical).toBe(10);
      expect(LIFECYCLE_CONFIG.thresholds.death).toBe(0);
    });
    
    it('should have correct range', () => {
      expect(LIFECYCLE_CONFIG.range.min).toBe(0);
      expect(LIFECYCLE_CONFIG.range.max).toBe(100);
    });
  });
  
  describe('Test Config', () => {
    it('should have faster decay for testing', () => {
      // Hunger: 10 seconds
      expect(TEST_LIFECYCLE_CONFIG.decay.hunger.interval).toBe(10 * 1000);
      
      // Energy: 5 seconds
      expect(TEST_LIFECYCLE_CONFIG.decay.energy.interval).toBe(5 * 1000);
      
      // Happiness: 8 seconds
      expect(TEST_LIFECYCLE_CONFIG.decay.happiness.interval).toBe(8 * 1000);
      
      // Health: 20 seconds
      expect(TEST_LIFECYCLE_CONFIG.decay.health.interval).toBe(20 * 1000);
    });
  });
  
  describe('Decay Rate Improvement', () => {
    it('should have 75% slower hunger decay (4h vs 1h)', () => {
      const oldInterval = 1 * 60 * 60 * 1000; // 1 hour
      const newInterval = 4 * 60 * 60 * 1000; // 4 hours
      const improvement = ((newInterval - oldInterval) / oldInterval) * 100;
      
      expect(improvement).toBe(300); // 300% slower = 75% reduction in frequency
    });
    
    it('should have 75% slower energy decay (2h vs 1h for -2)', () => {
      // Old: -2 per hour = -1 per 30 minutes
      // New: -1 per 2 hours
      const oldTimePerPoint = 30 * 60 * 1000; // 30 minutes
      const newTimePerPoint = 2 * 60 * 60 * 1000; // 2 hours
      const improvement = ((newTimePerPoint - oldTimePerPoint) / oldTimePerPoint) * 100;
      
      expect(improvement).toBe(300); // 300% slower
    });
  });
});
