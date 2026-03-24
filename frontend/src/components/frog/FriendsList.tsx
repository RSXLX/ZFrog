import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Frog, FriendInteraction } from '../../types';
import { useFriendWebSocket } from '../../hooks/useFriendWebSocket';
import { socialFeatureApi } from '../../features/social/api';
import { buildMemoryPalacePath } from '../../features/memory-palace/routes';
import { FriendCardSkeleton } from '../common/Skeleton';
import { EmptyFriends } from '../common/EmptyState';
import { PulseIndicator } from '../common/MicroInteractions';

interface FriendsListProps {
  frogId: number;
  onInteractionClick?: (friend: Frog, friendshipId: number) => void;
  onAddFriendClick?: () => void;
  onSearchClick?: () => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ 
  frogId, 
  onInteractionClick,
  onAddFriendClick,
  onSearchClick
}) => {
  const navigate = useNavigate();
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
      const list = await socialFeatureApi.listFriends(frogId);
      setFriends(list as any);
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
      await socialFeatureApi.removeFriend(friendshipId);
      setFriends(friends.filter(f => f.friendshipId !== friendshipId));
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('删除好友失败');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Idle': return 'idle';
      case 'Traveling': return 'traveling';
      case 'Returning': return 'returning';
      default: return '';
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

  if (loading) {
    return <FriendCardSkeleton count={3} />;
  }

  if (error) {
    return (
      <div className="friend-empty-state">
        <div className="empty-illustration">😵</div>
        <p className="empty-text">{error}</p>
        <button onClick={fetchFriends} className="friend-btn friend-btn-primary">
          重试
        </button>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <EmptyFriends onAddFriend={onAddFriendClick} />
    );
  }

  return (
    <>
      {/* 添加好友按钮区域 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className="action-btn primary" onClick={onAddFriendClick}>
          🔗 链上地址添加
        </button>
        <button className="action-btn" onClick={onSearchClick}>
          🔍 搜索添加
        </button>
      </div>

      {/* 好友卡片网格 */}
      <div className="friend-grid">
        {friends.map((friend) => (
          <div key={friend.id} className="friend-card">
            <div className="friend-avatar">
              🐸
            </div>
            <div className="friend-name">{friend.name}</div>
            <div className={`friend-status ${getStatusClass(friend.status)}`}>
              {friend.isOnline !== undefined && (
                <PulseIndicator 
                  active={friend.isOnline} 
                  color={friend.isOnline ? 'green' : undefined}
                  size="sm"
                />
              )}
              {getStatusText(friend.status)}
            </div>
            <div className="friend-level">
              Lv.{friend.level} • 旅行 {friend.totalTravels} 次
            </div>
            <div className="friend-actions">
              <button
                className="action-btn"
                onClick={() => onInteractionClick?.(friend, friend.friendshipId)}
                title="互动"
              >
                💬
              </button>
              <button
                className="action-btn"
                onClick={() => navigate(buildMemoryPalacePath(friend.id))}
                title="空间"
              >
                🏠
              </button>
              <button
                className="action-btn"
                onClick={() => navigate(`/frog/${friend.tokenId}`)}
                title="详情"
              >
                👁️
              </button>
              <button
                className="action-btn danger"
                onClick={() => removeFriend(friend.friendshipId)}
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default FriendsList;
