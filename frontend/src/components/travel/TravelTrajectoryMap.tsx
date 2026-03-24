// frontend/src/components/travel/TravelTrajectoryMap.tsx
// 旅行轨迹地图组件 - 显示青蛙探索路径的时间轴可视化

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './TravelTrajectoryMap.css';
import { travelFeatureApi } from '../../features/travel/api';

interface TrajectoryPoint {
  id?: number;
  chainId: number;
  address: string;
  message: string;
  timestamp: string;
  type: 'start' | 'explore' | 'end';
  isContract?: boolean;
}

interface TravelTrajectoryMapProps {
  travelId: number;
  isCompleted?: boolean;
}

// 链名称和颜色映射
const CHAIN_CONFIG: Record<number, { name: string; color: string; icon: string }> = {
  7001: { name: 'ZetaChain', color: '#00d395', icon: '⚡' },
  97: { name: 'BSC Testnet', color: '#f0b90b', icon: '🔶' },
  11155111: { name: 'Sepolia', color: '#627eea', icon: '💎' },
};

export function TravelTrajectoryMap({ travelId, isCompleted }: TravelTrajectoryMapProps) {
  const [points, setPoints] = useState<TrajectoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);
  
  // 获取轨迹数据
  useEffect(() => {
    const fetchTrajectory = async () => {
      try {
        const data = await travelFeatureApi.getTrajectory(travelId);
        setPoints(data);
      } catch (error) {
        console.error('[TravelTrajectoryMap] Failed to fetch trajectory:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrajectory();
    
    // 如果未完成，每30秒刷新一次
    if (!isCompleted) {
      const interval = setInterval(fetchTrajectory, 30000);
      return () => clearInterval(interval);
    }
  }, [travelId, isCompleted]);
  
  // 格式化地址
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  };
  
  // 获取点类型的图标
  const getPointIcon = (point: TrajectoryPoint) => {
    if (point.type === 'start') return '🚀';
    if (point.type === 'end') return '🏠';
    if (point.isContract) return '📜';
    return '📍';
  };
  
  if (isLoading) {
    return (
      <div className="trajectory-map loading">
        <div className="loading-icon">🗺️</div>
        <span>加载轨迹地图...</span>
      </div>
    );
  }
  
  return (
    <div className="trajectory-map">
      {/* 头部 */}
      <div className="map-header">
        <h4>🗺️ 旅行轨迹地图</h4>
        <span className="point-count">{points.length} 个足迹点</span>
      </div>
      
      {/* 时间轴 */}
      <div className="trajectory-timeline">
        {points.length === 0 ? (
          <div className="empty-trajectory">
            <span className="empty-icon">🔍</span>
            <p>暂无探索记录</p>
          </div>
        ) : (
          points.map((point, index) => {
            const chainConfig = CHAIN_CONFIG[point.chainId] || CHAIN_CONFIG[7001];
            const isExpanded = expandedPoint === index;
            const isLast = index === points.length - 1;
            
            return (
              <motion.div
                key={point.id || `${point.timestamp}-${index}`}
                className={`trajectory-point ${point.type} ${isExpanded ? 'expanded' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setExpandedPoint(isExpanded ? null : index)}
              >
                {/* 连接线 */}
                {!isLast && (
                  <div className="connector-line" style={{ 
                    background: `linear-gradient(to bottom, ${chainConfig.color}, ${
                      CHAIN_CONFIG[points[index + 1]?.chainId]?.color || chainConfig.color
                    })`
                  }} />
                )}
                
                {/* 节点圆点 */}
                <div 
                  className="point-marker"
                  style={{ 
                    borderColor: chainConfig.color,
                    background: point.type === 'start' || point.type === 'end' 
                      ? chainConfig.color 
                      : 'transparent'
                  }}
                >
                  <span>{getPointIcon(point)}</span>
                </div>
                
                {/* 内容 */}
                <div className="point-content">
                  <div className="point-header">
                    <span className="point-time">{formatTime(point.timestamp)}</span>
                    <span 
                      className="chain-badge"
                      style={{ background: chainConfig.color }}
                    >
                      {chainConfig.icon} {chainConfig.name}
                    </span>
                  </div>
                  
                  <div className="point-address" title={point.address}>
                    {shortenAddress(point.address)}
                    {point.isContract && <span className="contract-tag">合约</span>}
                  </div>
                  
                  {/* 展开的详情 */}
                  {isExpanded && (
                    <motion.div 
                      className="point-details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <p className="point-message">{point.message}</p>
                      <div className="point-full-address">
                        📋 {point.address}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
      
      {/* 统计信息 */}
      {points.length > 0 && (
        <div className="trajectory-stats">
          <div className="stat">
            <span className="stat-value">{points.filter(p => p.type === 'explore').length}</span>
            <span className="stat-label">探索</span>
          </div>
          <div className="stat">
            <span className="stat-value">{points.filter(p => p.isContract).length}</span>
            <span className="stat-label">合约</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {new Set(points.map(p => p.chainId)).size}
            </span>
            <span className="stat-label">链</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TravelTrajectoryMap;
