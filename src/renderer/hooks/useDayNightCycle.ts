import { useState, useEffect, useCallback } from 'react';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export interface DayNightState {
  timeOfDay: TimeOfDay;
  isNight: boolean;
  lightLevel: number; // 0.0 to 1.0, affects screen brightness
}

export function useDayNightCycle() {
  const [state, setState] = useState<DayNightState>({
    timeOfDay: 'day',
    isNight: false,
    lightLevel: 1.0,
  });

  const updateTime = useCallback(() => {
    const hour = new Date().getHours();
    
    let timeOfDay: TimeOfDay = 'day';
    let isNight = false;
    let lightLevel = 1.0;

    if (hour >= 6 && hour < 9) {
      timeOfDay = 'morning';
      lightLevel = 0.6 + ((hour - 6) / 3) * 0.4; // 0.6 -> 1.0
    } else if (hour >= 9 && hour < 17) {
      timeOfDay = 'day';
      lightLevel = 1.0;
    } else if (hour >= 17 && hour < 20) {
      timeOfDay = 'evening';
      lightLevel = 1.0 - ((hour - 17) / 3) * 0.5; // 1.0 -> 0.5
    } else {
      timeOfDay = 'night';
      isNight = true;
      lightLevel = 0.3; // dark but visible
    }

    setState({ timeOfDay, isNight, lightLevel });
  }, []);

  useEffect(() => {
    // Initial update
    updateTime();

    // Check every minute
    const interval = setInterval(updateTime, 60 * 1000);
    return () => clearInterval(interval);
  }, [updateTime]);

  return state;
}
