import { useState, useEffect, useCallback } from 'react';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export interface TimeSystemState {
  timeOfDay: TimeOfDay;
  weather: Weather;
  hour: number;
  minute: number;
}

export function useTimeSystem() {
  const [state, setState] = useState<TimeSystemState>({
    timeOfDay: 'morning',
    weather: 'sunny',
    hour: 12,
    minute: 0,
  });

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      let timeOfDay: TimeOfDay;
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      // Random weather (weighted)
      const rand = Math.random();
      let weather: Weather;
      if (rand < 0.5) weather = 'sunny';
      else if (rand < 0.8) weather = 'cloudy';
      else if (rand < 0.95) weather = 'rainy';
      else weather = 'snowy';
      
      setState({ timeOfDay, weather, hour, minute });
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Get greeting based on time
  const getGreeting = useCallback(() => {
    switch (state.timeOfDay) {
      case 'morning': return '早上好！';
      case 'afternoon': return '下午好！';
      case 'evening': return '晚上好！';
      case 'night': return '夜深了...';
    }
  }, [state.timeOfDay]);

  // Get weather effect description
  const getWeatherEffect = useCallback(() => {
    switch (state.weather) {
      case 'sunny': return null;
      case 'cloudy': return { icon: '☁️', effect: 'cloudy' };
      case 'rainy': return { icon: '🌧️', effect: 'rain' };
      case 'snowy': return { icon: '❄️', effect: 'snow' };
    }
  }, [state.weather]);

  return {
    ...state,
    getGreeting,
    getWeatherEffect,
  };
}
