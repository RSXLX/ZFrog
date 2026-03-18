import { useState, useEffect, useCallback } from 'react';

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  level: number;
  status: 'online' | 'offline' | 'busy';
  lastActive: number;
  relationship: number;
}

const defaultFriends: Friend[] = [
  { id: '1', name: '小绿', avatar: '🐸', level: 5, status: 'online', lastActive: Date.now(), relationship: 80 },
  { id: '2', name: '小红', avatar: '🐰', level: 3, status: 'offline', lastActive: Date.now() - 3600000, relationship: 60 },
  { id: '3', name: '小明', avatar: '🐱', level: 7, status: 'busy', lastActive: Date.now(), relationship: 45 },
  { id: '4', name: '小蓝', avatar: '🐳', level: 2, status: 'offline', lastActive: Date.now() - 7200000, relationship: 30 },
];

export function useSocial() {
  const [friends, setFriends] = useState<Friend[]>(defaultFriends);
  const [pendingRequests] = useState<number>(0);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_friends');
      if (saved) {
        setFriends(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load friends:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_friends', JSON.stringify(friends));
    } catch (e) {
      console.warn('Failed to save friends:', e);
    }
  }, [friends]);

  const addFriend = useCallback((friend: Friend) => {
    setFriends(prev => [...prev, friend]);
  }, []);

  const removeFriend = useCallback((friendId: string) => {
    setFriends(prev => prev.filter(f => f.id !== friendId));
  }, []);

  const updateRelationship = useCallback((friendId: string, change: number) => {
    setFriends(prev => prev.map(f => 
      f.id === friendId 
        ? { ...f, relationship: Math.min(100, Math.max(0, f.relationship + change)) } 
        : f
    ));
  }, []);

  const getOnlineFriends = useCallback(() => {
    return friends.filter(f => f.status === 'online');
  }, [friends]);

  const getFriendsByRelationship = useCallback((limit: number = 10) => {
    return [...friends].sort((a, b) => b.relationship - a.relationship).slice(0, limit);
  }, [friends]);

  return {
    friends,
    pendingRequests,
    addFriend,
    removeFriend,
    updateRelationship,
    getOnlineFriends,
    getFriendsByRelationship,
  };
}
