import { useState, useEffect, useCallback } from 'react';

export interface InventoryItem {
  id: string;
  name: string;
  type: 'food' | 'toy' | 'medicine' | 'decoration' | 'gift';
  icon: string;
  quantity: number;
  description: string;
  effect?: {
    hunger?: number;
    happiness?: number;
    energy?: number;
  };
}

const defaultItems: InventoryItem[] = [
  { id: 'apple', name: '苹果', type: 'food', icon: '🍎', quantity: 5, description: '恢复10点饱食度', effect: { hunger: 10 } },
  { id: 'cake', name: '蛋糕', type: 'food', icon: '🍰', quantity: 3, description: '恢复20点饱食度', effect: { hunger: 20 } },
  { id: 'toy_ball', name: '皮球', type: 'toy', icon: '⚽', quantity: 1, description: '增加10点快乐度', effect: { happiness: 10 } },
  { id: 'medicine', name: '药水', type: 'medicine', icon: '🧪', quantity: 2, description: '恢复30点生命值', effect: { energy: 30 } },
  { id: 'flower', name: '花朵', type: 'decoration', icon: '🌸', quantity: 3, description: '装饰物品' },
  { id: 'gift_box', name: '礼盒', type: 'gift', icon: '🎁', quantity: 2, description: '可送给好友' },
];

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(defaultItems);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_inventory');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load inventory:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_inventory', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save inventory:', e);
    }
  }, [items]);

  const addItem = useCallback((itemId: string, quantity: number = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return prev;
    });
  }, []);

  const removeItem = useCallback((itemId: string, quantity: number = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity >= quantity) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - quantity) } : i);
      }
      return prev;
    });
  }, []);

  const useItem = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.quantity <= 0) return null;
    
    removeItem(itemId, 1);
    return item;
  }, [items, removeItem]);

  const getItemsByType = useCallback((type: InventoryItem['type']) => {
    return items.filter(i => i.type === type);
  }, [items]);

  return { items, addItem, removeItem, useItem, getItemsByType };
}
