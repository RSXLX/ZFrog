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
          frog.id !== currentFrogId
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
        const ids = response.data.map((friend: any) => friend.id);
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
      setFrogs(frogs.filter(frog => frog.id !== targetFrogId));
      onFriendAdded?.();
      alert('好友请求已发送！');
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      alert(err.response?.data?.error || '发送好友请求失败');
    } finally {
      setSendingRequest(null);
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

  if (loading) {
    return <FriendCardSkeleton count={5} />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchWorldOnlineFrogs}
          className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (frogs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-4">🌍</div>
        <p>暂无在线青蛙</p>
        <p className="text-sm text-gray-400 mt-2">世界中的青蛙都去旅行了</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🌍 世界在线列表
          <span className="text-sm text-gray-500">({frogs.length})</span>
        </h3>
        <button
          onClick={fetchWorldOnlineFrogs}
          className="text-blue-500 hover:text-blue-600 text-sm"
        >
          刷新
        </button>
      </div>

      <div className="grid gap-3">
        {frogs.map((frog) => (
          <div key={frog.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{frog.name}</h4>
                  {frog.isOnline !== undefined && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        frog.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      title={frog.isOnline ? '在线' : '离线'}
                    />
                  )}
                  <span className={`text-sm ${getStatusColor(frog.status)}`}>
                    {getStatusText(frog.status)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  等级 {frog.level} • 经验值 {frog.xp} • 旅行 {frog.totalTravels} 次
                </div>
                
                <div className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded mb-2">
                  钱包: {frog.ownerAddress}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {friendIds.includes(frog.id) ? (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                  已是好友
                </span>
              ) : (
                <button
                  onClick={() => sendFriendRequest(frog.id, frog.ownerAddress)}
                  disabled={sendingRequest === frog.id}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  {sendingRequest === frog.id ? '发送中...' : '添加好友'}
                </button>
              )}
              
              <button
                onClick={() => window.location.href = `/frog/${frog.tokenId}`}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                查看详情
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-4">
        <p className="text-xs text-gray-500">
          💡 显示最近活跃的青蛙，优先显示高等级和经验值高的青蛙
        </p>
      </div>
    </div>
  );
};

export default WorldOnlineList;