/**
 * Quiet Mode Tests
 * Tests for the quiet mode system
 */

import { quietModeManager, QuietModeType, PREDEFINED_QUIET_MODES } from '../config/quietMode';

describe('Quiet Mode Manager', () => {
  beforeEach(() => {
    // Reset to normal mode before each test
    quietModeManager.setMode(QuietModeType.NORMAL);
  });

  describe('Mode Switching', () => {
    it('should switch to night mode', () => {
      quietModeManager.setMode(QuietModeType.NIGHT);
      const mode = quietModeManager.getCurrentMode();
      
      expect(mode.type).toBe(QuietModeType.NIGHT);
      expect(mode.behavior.showAnimations).toBe(false);
      expect(mode.behavior.playSounds).toBe(false);
      expect(mode.behavior.frogState).toBe('sleeping');
    });

    it('should switch to work hours mode', () => {
      quietModeManager.setMode(QuietModeType.WORK_HOURS);
      const mode = quietModeManager.getCurrentMode();
      
      expect(mode.type).toBe(QuietModeType.WORK_HOURS);
      expect(mode.behavior.showAnimations).toBe(true);
      expect(mode.behavior.animationIntensity).toBe('reduced');
      expect(mode.behavior.playSounds).toBe(false);
    });

    it('should switch to focus mode', () => {
      quietModeManager.setMode(QuietModeType.FOCUS, { duration: 25 });
      const mode = quietModeManager.getCurrentMode();
      
      expect(mode.type).toBe(QuietModeType.FOCUS);
      expect(mode.duration).toBe(25);
      expect(mode.behavior.showAnimations).toBe(false);
      expect(mode.behavior.frogState).toBe('hidden');
    });
  });

  describe('Predefined Modes', () => {
    it('should have all 5 predefined modes', () => {
      expect(PREDEFINED_QUIET_MODES[NORMAL]).toBeDefined();
      expect(PREDEFINED_QUIET_MODES[WORK_HOURS]).toBeDefined();
      expect(PREDEFINED_QUIET_MODES[NIGHT]).toBeDefined();
      expect(PREDEFINED_QUIET_MODES[FOCUS]).toBeDefined();
      expect(PREDEFINED_QUIET_MODES[CUSTOM]).toBeDefined();
    });

    it('should have correct night mode time range', () => {
      const nightMode = PREDEFINED_QUIET_MODES[NIGHT];
      expect(nightMode.timeRange).toEqual({ start: '22:00', end: '08:00' });
    });

    it('should have correct work hours time range', () => {
      const workMode = PREDEFINED_QUIET_MODES[WORK_HOURS];
      expect(workMode.timeRange).toEqual({ start: '09:00', end: '18:00' });
    });
  });

  describe('Behavior Configuration', () => {
    it('should have correct behavior for normal mode', () => {
      const mode = PREDEFINED_QUIET_MODES[NORMAL];
      expect(mode.behavior.showAnimations).toBe(true);
      expect(mode.behavior.playSounds).toBe(true);
      expect(mode.behavior.showNotifications).toBe(true);
      expect(mode.behavior.allowInteraction).toBe(true);
    });

    it('should have correct behavior for night mode', () => {
      const mode = PREDEFINED_QUIET_MODES[NIGHT];
      expect(mode.behavior.showAnimations).toBe(false);
      expect(mode.behavior.playSounds).toBe(false);
      expect(mode.behavior.showNotifications).toBe(false);
      expect(mode.behavior.allowInteraction).toBe(false);
      expect(mode.behavior.frogState).toBe('sleeping');
    });

    it('should have correct behavior for focus mode', () => {
      const mode = PREDEFINED_QUIET_MODES[FOCUS];
      expect(mode.behavior.showAnimations).toBe(false);
      expect(mode.behavior.playSounds).toBe(false);
      expect(mode.behavior.showNotifications).toBe(false);
      expect(mode.behavior.allowInteraction).toBe(false);
      expect(mode.behavior.frogState).toBe('hidden');
    });
  });

  describe('Event Listeners', () => {
    it('should notify listeners on mode change', () => {
      const listener = jest.fn();
      quietModeManager.addListener(listener);
      
      quietModeManager.setMode(QuietModeType.NIGHT);
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].type).toBe(QuietModeType.NIGHT);
    });

    it('should allow unsubscribing listeners', () => {
      const listener = jest.fn();
      const unsubscribe = quietModeManager.addListener(listener);
      
      unsubscribe();
      quietModeManager.setMode(QuietModeType.WORK_HOURS);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
