import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INACTIVITY_THRESHOLD_MS,
  DEFAULT_WAKE_DURATION_MS,
  shouldEnterHibernation,
  calculateDormantHours,
} from '../renderer/hooks/useHibernation';

describe('Hibernation Rules', () => {
  it('should expose stable default thresholds', () => {
    expect(DEFAULT_INACTIVITY_THRESHOLD_MS).toBe(1000 * 60 * 60 * 24 * 2);
    expect(DEFAULT_WAKE_DURATION_MS).toBe(1000 * 12);
  });

  it('should enter hibernation when inactivity reaches threshold', () => {
    const now = 1_000_000;
    const lastInteractionAt = now - DEFAULT_INACTIVITY_THRESHOLD_MS;

    expect(
      shouldEnterHibernation(lastInteractionAt, now, DEFAULT_INACTIVITY_THRESHOLD_MS)
    ).toBe(true);
  });

  it('should not enter hibernation before threshold', () => {
    const now = 1_000_000;
    const lastInteractionAt = now - DEFAULT_INACTIVITY_THRESHOLD_MS + 1;

    expect(
      shouldEnterHibernation(lastInteractionAt, now, DEFAULT_INACTIVITY_THRESHOLD_MS)
    ).toBe(false);
  });

  it('should calculate dormant hours from hibernated timestamp', () => {
    const now = 1000 * 60 * 60 * 10;
    const hibernatedAt = 1000 * 60 * 60 * 3;

    expect(calculateDormantHours(hibernatedAt, now)).toBe(7);
  });

  it('should return zero dormant hours when not hibernated', () => {
    expect(calculateDormantHours(null, Date.now())).toBe(0);
  });

  it('should clamp dormant hours to zero for future timestamps', () => {
    const now = 1000;
    const future = 5000;

    expect(calculateDormantHours(future, now)).toBe(0);
  });
});
