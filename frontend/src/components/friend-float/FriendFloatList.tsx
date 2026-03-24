import React, { useState, useEffect } from 'react';
import { Frog } from '../../types';
import { socialFeatureApi } from '../../features/social/api';
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
      const list = await socialFeatureApi.listFriends(frog.tokenId);
      setFriends(list as any);
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

  // 亲密度等级辅助函数
  const getIntimacyColor = (level: number) => {
    switch (level) {
      case 1: return '#9ca3af'; // 灰色 - 陌生人
      case 2: return '#60a5fa'; // 蓝色 - 点头之交
      case 3: return '#34d399'; // 绿色 - 好朋友
      case 4: return '#f472b6'; // 粉色 - 亲密伙伴
      case 5: return '#f59e0b'; // 金色 - 灵魂伴侣
      default: return '#9ca3af';
    }
  };

  const getIntimacyIcon = (level: number) => {
    switch (level) {
      case 1: return '🤝';
      case 2: return '👋';
      case 3: return '💚';
      case 4: return '💖';
      case 5: return '💫';
      default: return '🤝';
    }
  };

  const getIntimacyName = (level: number) => {
    switch (level) {
      case 1: return '陌生人';
      case 2: return '点头之交';
      case 3: return '好朋友';
      case 4: return '亲密伙伴';
      case 5: return '灵魂伴侣';
      default: return '陌生人';
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
                <div className="float-friend-name">
                  {friend.name}
                  {/* 亲密度等级徽章 */}
                  {(friend as any).intimacyLevel && (
                    <span 
                      className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: getIntimacyColor((friend as any).intimacyLevel),
                        color: 'white',
                      }}
                      title={getIntimacyName((friend as any).intimacyLevel)}
                    >
                      {getIntimacyIcon((friend as any).intimacyLevel)}
                    </span>
                  )}
                </div>
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
                  title="访问空间"
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
