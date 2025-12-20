import React, { useState, useEffect } from 'react';
import { Friendship, Frog } from '../../types';
import { useFriendWebSocket } from '../../hooks/useFriendWebSocket';
import { apiService } from '../../services/api';
import { FriendRequestSkeleton } from '../common/Skeleton';

interface FriendRequestsProps {
  frogId: number;
  onRequestProcessed?: () => void;
}

const FriendRequests: React.FC<FriendRequestsProps> = ({ frogId, onRequestProcessed }) => {
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket实时更新
  useFriendWebSocket(frogId, {
    onFriendRequestReceived: (data) => {
      if (data.addresseeId === frogId) {
        setRequests(prev => [data, ...prev]);
      }
    },
    onFriendRequestStatusChanged: (data) => {
      if (data.requesterId === frogId || data.addresseeId === frogId) {
        setRequests(prev => prev.filter(req => req.id !== data.id));
        onRequestProcessed?.();
      }
    }
  });

  useEffect(() => {
    fetchRequests();
  }, [frogId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/friends/requests/${frogId}`);
      setRequests(response.success ? response.data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      setError('Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId: number, status: 'Accepted' | 'Declined', message?: string) => {
    try {
      await apiService.put(`/friends/request/${requestId}/respond`, {
        status,
        message: status === 'Accepted' ? message : undefined
      });
      
      setRequests(requests.filter(req => req.id !== requestId));
      onRequestProcessed?.();
    } catch (err) {
      console.error('Error responding to request:', err);
      alert('操作失败，请重试');
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
    return <FriendRequestSkeleton count={2} />;
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <div className="text-red-500 mb-2">{error}</div>
        <button 
          onClick={fetchRequests}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          重试
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-500 text-sm">暂无好友请求</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-md mb-3">好友请求 ({requests.length})</h4>
      
      {requests.map((request) => (
        <div key={request.id} className="bg-white rounded-lg border p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium">{request.requester?.name}</span>
              <span className="text-gray-500 text-sm ml-2">
                想要添加你为好友
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {formatTime(request.createdAt)}
            </span>
          </div>
          
          {request.requester && (
            <div className="text-sm text-gray-600 mb-3">
              等级 {request.requester.level} • 
              经验值 {request.requester.xp} • 
              旅行 {request.requester.totalTravels} 次
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => respondToRequest(request.id, 'Accepted', '很高兴成为朋友！🐸')}
              className="flex-1 sm:flex-none px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              接受
            </button>
            
            <button
              onClick={() => respondToRequest(request.id, 'Declined')}
              className="flex-1 sm:flex-none px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              拒绝
            </button>
            
            <button
              onClick={() => window.location.href = `/frog/${request.requester?.tokenId}`}
              className="w-full sm:w-auto px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              查看详情
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendRequests;