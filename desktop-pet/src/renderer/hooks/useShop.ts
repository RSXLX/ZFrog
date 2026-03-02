import { useState, useEffect, useCallback } from 'react';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'food' | 'toy' | 'decoration' | 'accessory' | 'theme';
  icon: string;
  effect?: {
    hunger?: number;
    happiness?: number;
    energy?: number;
  };
  owned?: boolean;
}

const shopItems: ShopItem[] = [
  // Food
  { id: 'apple', name: '苹果', description: '恢复15饱食度', price: 10, type: 'food', icon: '🍎', effect: { hunger: 15 } },
  { id: 'banana', name: '香蕉', description: '恢复25饱食度', price: 20, type: 'food', icon: '🍌', effect: { hunger: 25 } },
  { id: 'cake', name: '蛋糕', description: '恢复50饱食度', price: 50, type: 'food', icon: '🍰', effect: { hunger: 50 } },
  
  // Toys
  { id: 'ball', name: '皮球', description: '增加20快乐度', price: 30, type: 'toy', icon: '⚽', effect: { happiness: 20 } },
  { id: 'teddy', name: '泰迪熊', description: '增加35快乐度', price: 60, type: 'toy', icon: '🧸', effect: { happiness: 35 } },
  
  // Accessories
  { id: 'crown', name: '皇冠', description: '稀有配饰', price: 500, type: 'accessory', icon: '👑' },
  { id: 'hat', name: '礼帽', description: '绅士配饰', price: 200, type: 'accessory', icon: '🎩' },
  { id: 'glasses', name: '眼镜', description: '斯文配饰', price: 150, type: 'accessory', icon: '👓' },
  { id: 'bow', name: '蝴蝶结', description: '可爱配饰', price: 100, type: 'accessory', icon: '🎀' },
  
  // Themes
  { id: 'theme_pink', name: '粉色主题', description: '粉色梦幻风格', price: 300, type: 'theme', icon: '🌸' },
  { id: 'theme_blue', name: '蓝色主题', description: '清爽海洋风格', price: 300, type: 'theme', icon: '🌊' },
  { id: 'theme_purple', name: '紫色主题', description: '神秘紫色风格', price: 300, type: 'theme', icon: '💜' },
  { id: 'theme_gold', name: '金色主题', description: '奢华金色风格', price: 1000, type: 'theme', icon: '✨' },
];

export function useShop() {
  const [coins, setCoins] = useState(500);
  const [ownedItems, setOwnedItems] = useState<string[]>(['apple']);
  const [items, setItems] = useState<ShopItem[]>(
    shopItems.map(item => ({ ...item, owned: item.id === 'apple' }))
  );

  // Load from storage
  useEffect(() => {
    try {
      const savedCoins = localStorage.getItem('zfrog_coins');
      const savedOwned = localStorage.getItem('zfrog_owned_items');
      if (savedCoins) setCoins(parseInt(savedCoins));
      if (savedOwned) setOwnedItems(JSON.parse(savedOwned));
    } catch (e) {
      console.warn('Failed to load shop data:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_coins', coins.toString());
      localStorage.setItem('zfrog_owned_items', JSON.stringify(ownedItems));
    } catch (e) {
      console.warn('Failed to save shop data:', e);
    }
  }, [coins, ownedItems]);

  const purchase = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.owned || coins < item.price) return false;
    
    setCoins(prev => prev - item.price);
    setOwnedItems(prev => [...prev, itemId]);
    setItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, owned: true } : i
    ));
    return true;
  }, [items, coins]);

  const addCoins = useCallback((amount: number) => {
    setCoins(prev => prev + amount);
  }, []);

  const getItemsByType = useCallback((type: ShopItem['type']) => {
    return items.filter(i => i.type === type);
  }, [items]);

  const getOwnedItems = useCallback(() => {
    return items.filter(i => i.owned);
  }, [items]);

  return {
    coins,
    items,
    purchase,
    addCoins,
    getItemsByType,
    getOwnedItems,
    ownedItems,
  };
}
