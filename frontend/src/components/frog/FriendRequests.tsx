import React, { useState, useEffect } from 'react';
import { Friendship } from '../../types';
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
      <div className="empty-requests">
        <span style={{ color: '#dc2626' }}>❌</span>
        <p style={{ fontSize: '0.9rem' }}>{error}</p>
        <button 
          onClick={fetchRequests}
          className="action-btn primary"
          style={{ marginTop: '0.5rem' }}
        >
          重试
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="empty-requests">
        <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#ccc' }}>✉️</span>
        <p style={{ fontSize: '0.9rem' }}>暂无好友请求</p>
      </div>
    );
  }

  return (
    <div>
      {requests.map((request) => (
        <div key={request.id} className="request-card">
          <div className="request-header">
            <div className="request-info">
              <div className="request-avatar">🐸</div>
              <div>
                <div className="request-name">{request.requester?.name}</div>
                <div className="request-meta">
                  Lv.{request.requester?.level} • 旅行 {request.requester?.totalTravels} 次
                </div>
              </div>
            </div>
            <span className="request-time">
              {formatTime(request.createdAt)}
            </span>
          </div>
          
          <div className="request-actions">
            <button
              onClick={() => respondToRequest(request.id, 'Accepted', '很高兴成为朋友！🐸')}
              className="action-btn primary"
              style={{ flex: 1 }}
            >
              ✓ 接受
            </button>
            
            <button
              onClick={() => respondToRequest(request.id, 'Declined')}
              className="action-btn danger"
              style={{ flex: 1 }}
            >
              ✗ 拒绝
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendRequests;