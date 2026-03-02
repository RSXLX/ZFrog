import { useState, useCallback } from 'react';

export interface ActionRecord {
  id: string;
  type: 'pet' | 'feed' | 'poke' | 'patrol' | 'travel';
  timestamp: number;
  mood: string;
  location?: string;
}

// Action tracking system
export function usePetActions() {
  const [actionHistory, setActionHistory] = useState<ActionRecord[]>([]);

  const recordAction = useCallback((type: ActionRecord['type'], mood: string = 'neutral', location?: string) => {
    const action: ActionRecord = {
      id: `action_${Date.now()}`,
      type,
      timestamp: Date.now(),
      mood,
      location,
    };
    
    setActionHistory(prev => {
      const newHistory = [...prev, action];
      // Keep last 50 actions
      return newHistory.slice(-50);
    });
  }, []);

  const getTodayActions = useCallback(() => {
    const today = new Date().toDateString();
    return actionHistory.filter(a => new Date(a.timestamp).toDateString() === today);
  }, [actionHistory]);

  const getActionCount = useCallback((type: ActionRecord['type']) => {
    return actionHistory.filter(a => a.type === type).length;
  }, [actionHistory]);

  const clearHistory = useCallback(() => {
    setActionHistory([]);
  }, []);

  return { actionHistory, recordAction, getTodayActions, getActionCount, clearHistory };
}
