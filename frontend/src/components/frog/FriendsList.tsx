import React, { useState, useEffect } from 'react';
import { Frog, Friendship, FriendInteraction } from '../../types';
import { useFrogData } from '../../hooks/useFrogData';
import { useFriendWebSocket } from '../../hooks/useFriendWebSocket';
import { api } from '../../services/api';
import { FriendCardSkeleton } from '../common/Skeleton';

interface FriendsListProps {
  frogId: number;
  onInteractionClick?: (friend: Frog, friendshipId: number) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ frogId, onInteractionClick }) => {
  const [friends, setFriends] = useState<(Frog & { friendshipId: number; lastInteraction: FriendInteraction | null; isOnline?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket实时更新
  useFriendWebSocket(frogId, {
    onFriendInteraction: (data) => {
      // 更新好友的最后互动时间
      setFriends(prevFriends => 
        prevFriends.map(friend => {
          if (friend.friendshipId === data.friendshipId) {
            return {
              ...friend,
              lastInteraction: data
            };
          }
          return friend;
        })
      );
    },
    onFriendRemoved: (data) => {
      // 移除已删除的好友
      if (data.frogId === frogId || data.removedFriendId === frogId) {
        fetchFriends();
      }
    },
    onFriendOnlineStatusChanged: (data) => {
      // 更新好友在线状态
      setFriends(prevFriends => 
        prevFriends.map(friend => {
          if (friend.id === data.frogId) {
            return {
              ...friend,
              isOnline: data.isOnline
            };
          }
          return friend;
        })
      );
    }
  });

  useEffect(() => {
    fetchFriends();
  }, [frogId]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/friends/list/${frogId}`);
      setFriends(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (friendshipId: number) => {
    if (!confirm('确定要删除这个好友吗？')) return;

    try {
      await api.delete(`/api/friends/${friendshipId}`);
      setFriends(friends.filter(f => f.friendshipId !== friendshipId));
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('删除好友失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Idle': return 'text-green-600';
      case 'Traveling': return 'text-blue-600';
      case 'Returning': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Idle': return '空闲';
      case 'Traveling': return '旅行中';
      case 'Returning': return '返回中';
      default: return '未知状态';
    }
  };

  const getInteractionTypeText = (type: string) => {
    switch (type) {
      case 'Visit': return '拜访了';
      case 'Feed': return '喂食了';
      case 'Play': return '和...玩耍';
      case 'Gift': return '送了礼物';
      case 'Message': return '留言';
      case 'Travel': return '一起旅行';
      default: return '互动了';
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}天前`;
    }
  };

  if (loading) {
    return <FriendCardSkeleton count={3} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={fetchFriends}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重试
        </button>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">还没有好友</div>
        <div className="text-sm text-gray-400">去发现其他青蛙并添加好友吧！</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">好友列表</h3>
      
      <div className="grid gap-4">
        {friends.map((friend) => (
          <div key={friend.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="relative">
                    <h4 className="font-semibold text-lg">{friend.name}</h4>
                    {friend.isOnline !== undefined && (
                      <span 
                        className={`absolute -top-1 -right-3 w-3 h-3 rounded-full ${
                          friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        title={friend.isOnline ? '在线' : '离线'}
                      />
                    )}
                  </div>
                  <span className={`ml-2 text-sm ${getStatusColor(friend.status)}`}>
                    {getStatusText(friend.status)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  等级 {friend.level} • 经验值 {friend.xp} • 旅行 {friend.totalTravels} 次
                </div>

                {friend.lastInteraction && (
                  <div className="text-sm text-gray-500 mb-3">
                    <span className="font-medium">最近互动：</span>
                    {getInteractionTypeText(friend.lastInteraction.type)}
                    {friend.lastInteraction.message && ` - "${friend.lastInteraction.message}"`}
                    <span className="ml-2 text-xs text-gray-400">
                      {formatTime(friend.lastInteraction.createdAt)}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onInteractionClick?.(friend, friend.friendshipId)}
                    className="flex-1 sm:flex-none px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    互动
                  </button>
                  
                  <button
                    onClick={() => window.location.href = `/frog/${friend.tokenId}`}
                    className="flex-1 sm:flex-none px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                  >
                    详情
                  </button>
                  
                  <button
                    onClick={() => removeFriend(friend.friendshipId)}
                    className="flex-1 sm:flex-none px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsList;