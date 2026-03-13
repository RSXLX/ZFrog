import { useState, useEffect, useCallback } from 'react';

// --- Mock API calls (replace with actual IPC or fetch calls) ---
const mockApi = {
  fetchFriends: async (): Promise<Friend[]> => {
    console.log('[Social API] Fetching friends...');
    await new Promise(res => setTimeout(res, 500));
    return [
      { id: 'friend-1', name: 'BuddyPet', online: true },
      { id: 'friend-2', name: 'PixelPal', online: false },
      { id: 'friend-3', name: 'DigitalDog', online: true },
    ];
  },
  visitFriend: async (friendId: string): Promise<boolean> => {
    console.log(`[Social API] Visiting friend ${friendId}...`);
    await new Promise(res => setTimeout(res, 1000));
    console.log(`[Social API] Visit to ${friendId} complete.`);
    return true;
  },
  sendGift: async (friendId: string, giftId: string): Promise<boolean> => {
    console.log(`[Social API] Sending gift ${giftId} to friend ${friendId}...`);
    await new Promise(res => setTimeout(res, 700));
    console.log(`[Social API] Gift sent.`);
    return true;
  },
};

// --- Type Definitions ---
export interface Friend {
  id: string;
  name: string;
  online: boolean;
}

export interface Gift {
  id: string;
  name: string;
  quantity: number;
}

export type SocialStatus = 'idle' | 'fetching_friends' | 'visiting' | 'sending_gift';

export interface UseSocialResult {
  friends: Friend[];
  gifts: Gift[];
  status: SocialStatus;
  visitFriend: (friendId: string) => Promise<void>;
  sendGift: (friendId: string, giftId: string) => Promise<void>;
  addGift: (gift: Omit<Gift, 'quantity'>) => void;
  refreshFriends: () => void;
}

// --- The Custom Hook ---
export const useSocial = (): UseSocialResult => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([
    { id: 'gift-a', name: 'Shiny Apple', quantity: 3 },
    { id: 'gift-b', name: 'Cool Toy', quantity: 1 },
  ]);
  const [status, setStatus] = useState<SocialStatus>('idle');

  const refreshFriends = useCallback(async () => {
    setStatus('fetching_friends');
    try {
      const friendList = await mockApi.fetchFriends();
      setFriends(friendList);
    } catch (error) {
      console.error("Failed to fetch friends:", error);
      setFriends([]);
    } finally {
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    refreshFriends();
  }, [refreshFriends]);

  const visitFriend = async (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend || !friend.online) {
      console.warn(`Cannot visit friend ${friendId}: they are offline or do not exist.`);
      return;
    }
    setStatus('visiting');
    try {
      await mockApi.visitFriend(friendId);
      // Here you could trigger an animation or update pet's mood
    } catch (error) {
      console.error(`Failed to visit friend ${friendId}:`, error);
    } finally {
      setStatus('idle');
    }
  };

  const sendGift = async (friendId: string, giftId: string) => {
    const giftIndex = gifts.findIndex(g => g.id === giftId);
    if (giftIndex === -1 || gifts[giftIndex].quantity <= 0) {
      console.warn(`Cannot send gift ${giftId}: not enough quantity.`);
      return;
    }
    setStatus('sending_gift');
    try {
      const success = await mockApi.sendGift(friendId, giftId);
      if (success) {
        setGifts(prevGifts => {
          const newGifts = [...prevGifts];
          newGifts[giftIndex] = { ...newGifts[giftIndex], quantity: newGifts[giftIndex].quantity - 1 };
          return newGifts.filter(g => g.quantity > 0);
        });
      }
    } catch (error) {
      console.error(`Failed to send gift to ${friendId}:`, error);
    } finally {
      setStatus('idle');
    }
  };

  const addGift = (newGift: Omit<Gift, 'quantity'>) => {
    setGifts(prevGifts => {
      const existingGiftIndex = prevGifts.findIndex(g => g.id === newGift.id);
      if (existingGiftIndex !== -1) {
        const updatedGifts = [...prevGifts];
        updatedGifts[existingGiftIndex].quantity += 1;
        return updatedGifts;
      } else {
        return [...prevGifts, { ...newGift, quantity: 1 }];
      }
    });
  };

  return {
    friends,
    gifts,
    status,
    visitFriend,
    sendGift,
    addGift,
    refreshFriends
  };
};

export default useSocial;