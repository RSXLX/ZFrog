import React, { useState, useEffect } from 'react';
import { Frog } from '../../types';
import { apiService } from '../../services/api';
import { FriendCardSkeleton } from '../common/Skeleton';

interface WorldOnlineListProps {
  currentFrogId: number;
  onFriendAdded?: () => void;
}

const WorldOnlineList: React.FC<WorldOnlineListProps> = ({
  currentFrogId,
  onFriendAdded
}) => {
  const [frogs, setFrogs] = useState<(Frog & { isOnline?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingRequest, setSendingRequest] = useState<number | null>(null);
  const [friendIds, setFriendIds] = useState<number[]>([]);

  useEffect(() => {
    fetchWorldOnlineFrogs();
    fetchFriendsList();
  }, []);

  const fetchWorldOnlineFrogs = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/frogs/world-online', {
        params: {
          limit: 20,
          offset: 0
        }
      });
      
      if (response.success) {
        // 过滤掉自己的青蛙
        const filteredFrogs = response.data.filter((frog: any) => 
          frog.tokenId !== currentFrogId
        );
        setFrogs(filteredFrogs);
      }
    } catch (err: any) {
      console.error('Error fetching world online frogs:', err);
      setError(err.response?.data?.error || '获取世界在线列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendsList = async () => {
    try {
      const response = await apiService.get(`/friends/list/${currentFrogId}`);
      if (response.success) {
        const ids = response.data.map((friend: any) => friend.tokenId);
        setFriendIds(ids);
      }
    } catch (err) {
      console.error('Error fetching friends list:', err);
    }
  };

  const sendFriendRequest = async (targetFrogId: number, walletAddress: string) => {
    setSendingRequest(targetFrogId);
    try {
      await apiService.post('/friends/request', {
        requesterId: currentFrogId,
        walletAddress: walletAddress
      });
      
      // 从列表中移除已发送请求的青蛙
      setFrogs(frogs.filter(frog => frog.tokenId !== targetFrogId));
      onFriendAdded?.();
      alert('好友请求已发送！');
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      alert(err.response?.data?.error || '发送好友请求失败');
    } finally {
      setSendingRequest(null);
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
    return <FriendCardSkeleton count={6} />;
  }

  if (error) {
    return (
      <div className="friend-empty-state">
        <div className="empty-illustration">😵</div>
        <p className="empty-text">{error}</p>
        <button
          onClick={fetchWorldOnlineFrogs}
          className="friend-btn friend-btn-primary"
        >
          重试
        </button>
      </div>
    );
  }

  if (frogs.length === 0) {
    return (
      <div className="friend-empty-state">
        <div className="empty-illustration">🌍</div>
        <h2 className="empty-text">暂无在线青蛙</h2>
        <p className="empty-subtext">世界中的青蛙都去旅行了</p>
      </div>
    );
  }

  return (
    <>
      {/* 刷新按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          onClick={fetchWorldOnlineFrogs}
          className="action-btn"
        >
          🔄 刷新
        </button>
      </div>

      {/* 好友卡片网格 */}
      <div className="friend-grid">
        {frogs.map((frog) => (
          <div key={frog.id} className="friend-card">
            <div className="friend-avatar">
              🐸
            </div>
            <div className="friend-name">{frog.name}</div>
            <div className={`friend-status ${getStatusClass(frog.status)}`}>
              {frog.isOnline !== undefined && (
                <span 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: frog.isOnline ? '#22c55e' : '#9ca3af',
                    display: 'inline-block'
                  }} 
                />
              )}
              {getStatusText(frog.status)}
            </div>
            <div className="friend-level">Lv.{frog.level}</div>
            <div className="friend-actions">
              {friendIds.includes(frog.tokenId) ? (
                <span className="action-btn" style={{ cursor: 'default', opacity: 0.6 }}>
                  ✓ 已是好友
                </span>
              ) : (
                <button
                  onClick={() => sendFriendRequest(frog.tokenId, frog.ownerAddress)}
                  disabled={sendingRequest === frog.tokenId}
                  className="action-btn primary"
                >
                  {sendingRequest === frog.tokenId ? '⏳ 发送中...' : '➕ 添加'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#999' }}>
          💡 显示最近活跃的青蛙，优先显示高等级和经验值高的青蛙
        </p>
      </div>
    </>
  );
};

export default WorldOnlineList;