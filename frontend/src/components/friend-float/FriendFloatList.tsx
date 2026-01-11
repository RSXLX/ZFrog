import React, { useState, useEffect } from 'react';
import { Frog } from '../../types';
import { apiService } from '../../services/api';
import { useMyFrog } from '../../hooks/useMyFrog';

interface FriendFloatListProps {
  onFriendClick?: (friend: Frog, friendshipId: number) => void;
  onVisitClick?: (friend: Frog) => void;
}

export const FriendFloatList: React.FC<FriendFloatListProps> = ({
  onFriendClick,
  onVisitClick,
}) => {
  const { frog } = useMyFrog();
  const [friends, setFriends] = useState<(Frog & { friendshipId: number; isOnline?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (frog?.tokenId) {
      fetchFriends();
    }
  }, [frog?.tokenId]);

  const fetchFriends = async () => {
    if (!frog?.tokenId) return;
    
    try {
      setLoading(true);
      const response = await apiService.get(`/friends/list/${frog.tokenId}`);
      setFriends(response.success ? response.data : []);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Traveling': return '✈️';
      case 'Returning': return '🔄';
      default: return '🏠';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Traveling': return '旅行中';
      case 'Returning': return '返回中';
      default: return '空闲';
    }
  };

  // 过滤好友
  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="float-content">
        <div className="float-empty">
          <div className="float-empty-icon">⏳</div>
          <div className="float-empty-text">加载中...</div>
        </div>
      </div>
    );
  }

  if (!frog) {
    return (
      <div className="float-content">
        <div className="float-empty">
          <div className="float-empty-icon">🐸</div>
          <div className="float-empty-text">请先连接钱包并铸造青蛙</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 搜索框 */}
      <div className="float-search">
        <div className="float-search-wrapper">
          <span className="float-search-icon">🔍</span>
          <input
            type="text"
            className="float-search-input"
            placeholder="搜索好友..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 好友列表 */}
      <div className="float-content">
        {filteredFriends.length === 0 ? (
          <div className="float-empty">
            <div className="float-empty-icon">🐸</div>
            <div className="float-empty-text">
              {searchQuery ? '没有找到匹配的好友' : '还没有好友'}
            </div>
          </div>
        ) : (
          filteredFriends.map((friend) => (
            <div
              key={friend.id}
              className="float-friend-item"
              onClick={() => onFriendClick?.(friend, friend.friendshipId)}
            >
              <div className="float-friend-avatar">
                🐸
                {friend.isOnline && <span className="online-dot" />}
              </div>
              
              <div className="float-friend-info">
                <div className="float-friend-name">{friend.name}</div>
                <div className="float-friend-status">
                  <span>{getStatusIcon(friend.status)}</span>
                  <span>{getStatusText(friend.status)}</span>
                  <span style={{ color: '#9ca3af' }}>• Lv.{friend.level}</span>
                </div>
              </div>
              
              <div className="float-friend-actions">
                <button
                  className="float-friend-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFriendClick?.(friend, friend.friendshipId);
                  }}
                  title="互动"
                >
                  💬
                </button>
                <button
                  className="float-friend-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisitClick?.(friend);
                  }}
                  title="访问家园"
                >
                  🏠
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};
