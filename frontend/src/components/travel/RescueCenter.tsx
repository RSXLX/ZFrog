// frontend/src/components/travel/RescueCenter.tsx
// V2.0 救援中心组件

import React, { useState, useEffect } from 'react';
import { travelApi, RescueRequest } from '../../services/travel.api';
import './RescueCenter.css';

interface RescueCenterProps {
  myFrogId: number;
  onRescueSuccess?: (xpEarned: number) => void;
}

export const RescueCenter: React.FC<RescueCenterProps> = ({ myFrogId, onRescueSuccess }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'public'>('friends');
  const [friendRequests, setFriendRequests] = useState<RescueRequest[]>([]);
  const [publicRequests, setPublicRequests] = useState<RescueRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rescuingId, setRescuingId] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, [myFrogId, activeTab]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'friends') {
        const data = await travelApi.getFriendRescueRequests(myFrogId);
        setFriendRequests(data);
      } else {
        const data = await travelApi.getPublicRescueRequests(20);
        setPublicRequests(data);
      }
    } catch (error) {
      console.error('Failed to load rescue requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescue = async (requestId: number) => {
    setRescuingId(requestId);
    try {
      const result = await travelApi.performRescue(requestId, myFrogId);
      if (result.success) {
        alert(`🎉 ${result.message}\n获得 ${result.xpEarned} XP 和 ${result.reputationEarned} 信誉分！`);
        onRescueSuccess?.(result.xpEarned || 0);
        loadRequests(); // 刷新列表
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error: any) {
      alert(`救援失败: ${error.message}`);
    } finally {
      setRescuingId(null);
    }
  };

  const getChainName = (chainId: number) => {
    const chains: Record<number, string> = {
      1: '以太坊',
      56: 'BNB Chain',
      137: 'Polygon',
      7001: 'ZetaChain',
    };
    return chains[chainId] || `Chain ${chainId}`;
  };

  const requests = activeTab === 'friends' ? friendRequests : publicRequests;

  return (
    <div className="rescue-center">
      <div className="rescue-center-header">
        <h3>🆘 救援中心</h3>
        <p>帮助迷路的青蛙回家，获取 XP 和信誉分！</p>
      </div>

      <div className="rescue-tabs">
        <button
          className={`rescue-tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          👫 好友求救 ({friendRequests.length})
        </button>
        <button
          className={`rescue-tab ${activeTab === 'public' ? 'active' : ''}`}
          onClick={() => setActiveTab('public')}
        >
          📢 公共救援 ({publicRequests.length})
        </button>
      </div>

      <div className="rescue-list">
        {isLoading ? (
          <div className="rescue-loading">加载中...</div>
        ) : requests.length === 0 ? (
          <div className="rescue-empty">
            {activeTab === 'friends' ? '没有好友需要救援 🎉' : '暂无公共救援请求'}
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="rescue-card">
              <div className="rescue-card-header">
                <span className="rescue-frog-name">🐸 {req.strandedFrog.name}</span>
                <span className="rescue-chain">{getChainName(req.travel.chainId)}</span>
              </div>
              <div className="rescue-card-info">
                <span>😱 迷路中...</span>
                <span className="rescue-time">
                  {new Date(req.requestedAt).toLocaleString()}
                </span>
              </div>
              <button
                className="rescue-button"
                onClick={() => handleRescue(req.id)}
                disabled={rescuingId === req.id}
              >
                {rescuingId === req.id ? '救援中...' : '🦸 前往救援'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RescueCenter;
