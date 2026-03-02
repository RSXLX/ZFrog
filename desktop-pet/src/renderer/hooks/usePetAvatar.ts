import { useState, useEffect, useCallback } from 'react';

export interface PetAvatar {
  body: string;
  eyes: string;
  mouth: string;
  accessory: string;
  color: string;
}

const defaultAvatar: PetAvatar = {
  body: 'default',
  eyes: 'normal',
  mouth: 'smile',
  accessory: 'none',
  color: '#4ADE80',
};

const avatars: Record<string, Partial<PetAvatar>> = {
  // Body styles
  body: {
    default: { color: '#4ADE80' },
    pink: { color: '#F9A8D4' },
    blue: { color: '#60A5FA' },
    purple: { color: '#A78BFA' },
    golden: { color: '#FCD34D' },
  },
  // Eye styles
  eyes: {
    normal: {},
    cute: {},
    sleepy: {},
    angry: {},
    happy: {},
  },
  // Mouth styles
  mouth: {
    smile: {},
    open: {},
    small: {},
    tongue: {},
  },
  // Accessories
  accessory: {
    none: {},
    crown: '👑',
    hat: '🎩',
    bow: '🎀',
    glasses: '👓',
    flower: '🌸',
  },
};

export function usePetAvatar() {
  const [avatar, setAvatar] = useState<PetAvatar>(defaultAvatar);
  const [unlockedItems, setUnlockedItems] = useState({
    body: ['default'],
    eyes: ['normal'],
    mouth: ['smile'],
    accessory: ['none'],
  });

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_avatar');
      if (saved) setAvatar(JSON.parse(saved));
      
      const unlocked = localStorage.getItem('zfrog_unlocked_items');
      if (unlocked) setUnlockedItems(JSON.parse(unlocked));
    } catch (e) {
      console.warn('Failed to load avatar:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_avatar', JSON.stringify(avatar));
      localStorage.setItem('zfrog_unlocked_items', JSON.stringify(unlockedItems));
    } catch (e) {
      console.warn('Failed to save avatar:', e);
    }
  }, [avatar, unlockedItems]);

  const updateAvatar = useCallback((part: keyof PetAvatar, value: string) => {
    if (unlockedItems[part as keyof typeof unlockedItems]?.includes(value)) {
      setAvatar(prev => ({ ...prev, [part]: value }));
    }
  }, [unlockedItems]);

  const unlockItem = useCallback((part: keyof typeof unlockedItems, item: string) => {
    setUnlockedItems(prev => ({
      ...prev,
      [part]: [...(prev[part] || []), item],
    }));
  }, []);

  const getAvailableItems = useCallback((part: keyof typeof avatars) => {
    return Object.keys(avatars[part] || {});
  }, []);

  return {
    avatar,
    updateAvatar,
    unlockItem,
    getAvailableItems,
    unlockedItems,
    avatars,
  };
}
