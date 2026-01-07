// frontend/src/components/travel/InteractionFeed.tsx
// 跨链探索互动消息流组件

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './InteractionFeed.css';

interface Interaction {
  id?: number;
  travelId: number;
  message: string;
  exploredAddress: string;
  blockNumber: string;
  timestamp: string;
  isContract?: boolean;
}

interface InteractionFeedProps {
  travelId: number;
  tokenId: number;
  chainId: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function InteractionFeed({ travelId, tokenId, chainId }: InteractionFeedProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  
  // 链名称映射
  const chainNames: Record<number, string> = {
    97: 'BSC Testnet',
    11155111: 'Sepolia',
    7001: 'ZetaChain',
  };
  
  // 获取历史互动记录
  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/travels/${travelId}/interactions`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setInteractions(data.data.reverse());
          }
        }
      } catch (error) {
        console.error('[InteractionFeed] Failed to fetch interactions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInteractions();
  }, [travelId]);
  
  // WebSocket 连接
  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      auth: { walletAddress: '' },
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      socket.emit('subscribe:frog', tokenId);
    });
    
    socket.on('travel:interaction', (data: Interaction) => {
      console.log('[InteractionFeed] Received interaction:', data);
      setInteractions(prev => [data, ...prev].slice(0, 30)); // 最多保留30条
      
      // 自动滚动到顶部
      if (feedRef.current) {
        feedRef.current.scrollTop = 0;
      }
    });
    
    return () => {
      socket.emit('unsubscribe:frog', tokenId);
      socket.disconnect();
    };
  }, [tokenId]);
  
  // 格式化时间
  const formatTime = (timestamp: string | number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };
  
  // 格式化地址
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  if (isLoading) {
    return (
      <div className="interaction-feed loading">
        <div className="loading-spinner">🐸</div>
        <span>正在加载探索足迹...</span>
      </div>
    );
  }
  
  return (
    <div className="interaction-feed" ref={feedRef}>
      <div className="feed-header">
        <h4>🐾 探索足迹 <span className="chain-badge">{chainNames[chainId] || `Chain ${chainId}`}</span></h4>
        <span className="feed-count">{interactions.length} 条记录</span>
      </div>
      
      {interactions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>青蛙正在探索中...</p>
          <p className="empty-hint">新的探索记录将实时显示在这里</p>
        </div>
      ) : (
        <div className="interaction-list">
          {interactions.map((interaction, index) => (
            <div 
              key={interaction.id || `${interaction.timestamp}-${index}`} 
              className={`interaction-item ${interaction.isContract ? 'contract' : 'address'} ${index === 0 ? 'new' : ''}`}
            >
              <div className="interaction-indicator">
                {interaction.isContract ? '📜' : '👤'}
              </div>
              <div className="interaction-content">
                <div className="interaction-message">{interaction.message}</div>
                <div className="interaction-meta">
                  <span className="meta-address" title={interaction.exploredAddress}>
                    {shortenAddress(interaction.exploredAddress)}
                  </span>
                  <span className="meta-block">Block #{interaction.blockNumber}</span>
                  <span className="meta-time">{formatTime(interaction.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InteractionFeed;
