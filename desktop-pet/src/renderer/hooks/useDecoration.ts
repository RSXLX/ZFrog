import { useState, useEffect, useCallback } from 'react';

export interface DecorationInstance {
  id: string;      // Unique ID for the placed decoration
  itemId: string;  // ID of the inventory item (e.g. 'flower')
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
}

export function useDecoration() {
  const [decorations, setDecorations] = useState<DecorationInstance[]>(() => {
    try {
      const saved = localStorage.getItem('zfrog_decorations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('zfrog_decorations', JSON.stringify(decorations));
    } catch (e) {
      console.warn('Failed to save decorations:', e);
    }
  }, [decorations]);

  const placeDecoration = useCallback((itemId: string, x: number, y: number, options?: Partial<DecorationInstance>) => {
    const newDecoration: DecorationInstance = {
      id: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId,
      x,
      y,
      scale: 1,
      rotation: 0,
      zIndex: 10,
      ...options
    };
    
    setDecorations(prev => [...prev, newDecoration]);
    return newDecoration.id;
  }, []);

  const updateDecoration = useCallback((id: string, updates: Partial<DecorationInstance>) => {
    setDecorations(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const removeDecoration = useCallback((id: string) => {
    setDecorations(prev => prev.filter(d => d.id !== id));
  }, []);

  const clearDecorations = useCallback(() => {
    setDecorations([]);
  }, []);

  return {
    decorations,
    placeDecoration,
    updateDecoration,
    removeDecoration,
    clearDecorations
  };
}
