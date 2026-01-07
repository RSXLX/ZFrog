/**
 * Cross-Chain Travel Tracker Component (Enhanced)
 * 
 * Real-time tracking of frog's cross-chain exploration journey
 * Features:
 * - HTTP polling fallback for reliable state updates
 * - Progress bar and countdown timer
 * - Stage visualization (Lock → Cross → Explore → Return)
 * - WebSocket event integration
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getCrossChainTravelStatus } from '../../services/cross-chain.api';
import { OnChainStats } from './OnChainStats';
import { DiscoveryList } from './DiscoveryList';
import { DiscoveryData } from './DiscoveryCard';
import { InteractionFeed } from './InteractionFeed';
import { CrossChainBridgeAnimation } from './CrossChainBridgeAnimation';
import { TravelCompletionModal, CompletionData } from './TravelCompletionModal';
import { useNavigate } from 'react-router-dom';

interface Discovery {
  id: string;
  type: 'treasure' | 'landmark' | 'encounter' | 'wisdom' | 'rare';
  timestamp: Date;
  title: string;
  description: string;
  location: string;
  rarity?: number;
  metadata?: {
    contract?: string;
    tvl?: string;
    tokenName?: string;
    [key: string]: any;
  };
}

interface TravelEvent {
  id: string;
  type: 'lock' | 'crossing' | 'arrival' | 'discovery' | 'return' | 'completed';
  timestamp: Date;
  message: string;
  subMessage?: string;
  icon: string;
  data?: any;
}

interface CrossChainTravelTrackerProps {
  tokenId: number;
  travelId: number;
  targetChain: string;
  isActive: boolean;
  startTime?: Date | string;
  endTime?: Date | string;
  onCompleted?: () => void;
}

// Stage definitions
const STAGES = [
  { key: 'LOCKING', label: '锁定', icon: '🔒', color: 'from-gray-400 to-gray-500' },
  { key: 'CROSSING_OUT', label: '跨链', icon: '🌉', color: 'from-purple-400 to-purple-500' },
  { key: 'ON_TARGET_CHAIN', label: '探索', icon: '🎯', color: 'from-blue-400 to-blue-500' },
  { key: 'CROSSING_BACK', label: '返程', icon: '🔙', color: 'from-green-400 to-green-500' },
  { key: 'COMPLETED', label: '完成', icon: '✅', color: 'from-emerald-400 to-emerald-500' },
];

const EVENT_ICONS: Record<string, string> = {
  lock: '🔒',
  crossing: '🌉',
  arrival: '🌍',
  discovery: '🎁',
  landmark: '🏛️',
  encounter: '👤',
  wisdom: '📜',
  rare: '🌟',
  return: '🔙',
  completed: '✅',
};

// Chain name to chain ID mapping
const chainNameToId = (chainName: string): number => {
  const mapping: Record<string, number> = {
    'BSC Testnet': 97,
    'Sepolia': 11155111,
    'ZetaChain': 7001,
    'bsc': 97,
    'sepolia': 11155111,
    'zetachain': 7001,
  };
  return mapping[chainName] || 97; // Default to BSC Testnet
};

export function CrossChainTravelTracker({
  tokenId,
  travelId,
  targetChain,
  isActive,
  startTime,
  endTime,
  onCompleted
}: CrossChainTravelTrackerProps) {
  const [events, setEvents] = useState<TravelEvent[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('LOCKING');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [onChainData, setOnChainData] = useState<{
    blockHeight?: number;
    gasUsed?: string;
    exploredAddress?: string;
  }>({});
  const [dbDiscoveries, setDbDiscoveries] = useState<DiscoveryData[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Modal 状态
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const navigate = useNavigate();

  const { on } = useWebSocket();

  // Calculate progress and time remaining
  const updateProgress = useCallback(() => {
    if (!startTime || !endTime) return;
    
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const total = end - start;
    const elapsed = now - start;
    const remaining = end - now;

    if (remaining <= 0) {
      setProgress(100);
      setTimeRemaining('即将返回...');
      return;
    }

    const progressPercent = Math.min((elapsed / total) * 100, 100);
    setProgress(progressPercent);

    // Format remaining time
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    if (hours > 0) {
      setTimeRemaining(`${hours}小时 ${minutes}分钟`);
    } else if (minutes > 0) {
      setTimeRemaining(`${minutes}分钟 ${seconds}秒`);
    } else {
      setTimeRemaining(`${seconds}秒`);
    }
  }, [startTime, endTime]);

  // Timer for progress updates
  useEffect(() => {
    if (!isActive || isCompleted) return;
    
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, [isActive, isCompleted, updateProgress]);

  // HTTP Polling fallback
  useEffect(() => {
    if (!isActive || isCompleted) return;

    const fetchStatus = async () => {
      try {
        const status = await getCrossChainTravelStatus(tokenId);
        
        if (status.database) {
          const dbStatus = status.database.crossChainStatus;
          
          // Update stage if changed
          if (dbStatus && dbStatus !== currentStage) {
            setCurrentStage(dbStatus);
            
            // Add event for stage change
            const stageConfig = STAGES.find(s => s.key === dbStatus);
            if (stageConfig) {
              const newEvent: TravelEvent = {
                id: `stage-${Date.now()}`,
                type: dbStatus === 'COMPLETED' ? 'completed' : 'crossing',
                timestamp: new Date(),
                message: `${stageConfig.icon} ${stageConfig.label}阶段`,
                icon: stageConfig.icon,
              };
              setEvents(prev => {
                // Avoid duplicates
                if (prev.some(e => e.type === newEvent.type && e.message === newEvent.message)) {
                  return prev;
                }
                return [...prev, newEvent];
              });
            }
          }

          // Check if completed
          if (dbStatus === 'COMPLETED' && !isCompleted) {
            setIsCompleted(true);
            setProgress(100);
            
            // 获取完成数据并显示庆祝弹窗
            try {
              const resultRes = await fetch(`/api/travels/journal/${travelId}`);
              const resultData = await resultRes.json();
              if (resultData.success || resultData.data) {
                const travel = resultData.data || resultData;
                setCompletionData({
                  frogName: travel.frog?.name || '小呱',
                  xpEarned: travel.crossChainXpEarned || discoveries.reduce((sum, d) => sum + (d.rarity || 1), 0) * 10,
                  refundAmount: travel.refundAmount,
                  refundFormatted: travel.refundAmount ? `${(Number(travel.refundAmount) / 1e18).toFixed(4)} ZETA` : undefined,
                  souvenir: travel.souvenirData || travel.souvenir,
                  discoveries: dbDiscoveries.map(d => ({ title: d.title, rarity: Number(d.rarity) || 1 })),
                  travelId: travelId,
                  targetChain: targetChain,
                  duration: travel.duration || 3600,
                });
                setShowCompletionModal(true);
              }
            } catch (err) {
              console.error('Failed to fetch completion data:', err);
            }
            
            onCompleted?.();
          }

          // Update progress from DB if available
          if (status.database.progress) {
            setProgress(status.database.progress);
          }
        }

        // Fetch discoveries and on-chain data
        try {
          const discoveriesRes = await fetch(`/api/cross-chain/travel/${travelId}/discoveries`);
          const discoveriesData = await discoveriesRes.json();
          
          if (discoveriesData.success && discoveriesData.data) {
            setDbDiscoveries(discoveriesData.data.discoveries || []);
            
            if (discoveriesData.data.onChainStats) {
              setOnChainData({
                blockHeight: discoveriesData.data.onChainStats.exploredBlock,
                gasUsed: discoveriesData.data.onChainStats.gasUsed,
                exploredAddress: discoveriesData.data.onChainStats.exploredAddress,
              });
            }
          }
        } catch (discErr) {
          console.error('Failed to fetch discoveries:', discErr);
        }
      } catch (error) {
        console.error('Failed to fetch cross-chain status:', error);
      }
    };

    // Initial fetch
    fetchStatus();
    
    // Poll every 5 seconds
    pollIntervalRef.current = setInterval(fetchStatus, 5000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [tokenId, isActive, isCompleted, currentStage, onCompleted]);

  // Scroll to bottom when new event arrives
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Listen for WebSocket events
  useEffect(() => {
    if (!isActive) return;

    const unsubscribe = on('crosschain:event', (data: any) => {
      if (data.tokenId !== tokenId) return;

      const newEvent: TravelEvent = {
        id: `${Date.now()}-${Math.random()}`,
        type: data.eventType,
        timestamp: new Date(data.timestamp),
        message: data.message,
        subMessage: data.subMessage,
        icon: EVENT_ICONS[data.eventType] || '📍',
        data: data.metadata,
      };

      setEvents(prev => [...prev, newEvent]);

      // Update stage based on event
      if (data.stage) {
        setCurrentStage(data.stage);
      }

      // Handle completion
      if (data.eventType === 'completed' || data.eventType === 'return') {
        setIsCompleted(true);
        setCurrentStage('COMPLETED');
        onCompleted?.();
      }

      // If it's a discovery, add to discoveries list
      if (data.eventType === 'discovery') {
        const newDiscovery: Discovery = {
          id: newEvent.id,
          type: data.discoveryType || 'treasure',
          timestamp: newEvent.timestamp,
          title: data.title,
          description: data.description,
          location: data.location,
          rarity: data.rarity,
          metadata: data.metadata,
        };
        setDiscoveries(prev => [...prev, newDiscovery]);
      }
    });

    // 监听实时阶段更新 (P0 修复)
    const unsubscribeStage = on('travel:stageUpdate', (data: any) => {
      if (data.tokenId !== tokenId) return;
      
      console.log('[CrossChainTracker] Stage update:', data);
      setCurrentStage(data.stage);
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }
      
      // 添加阶段变化事件
      const stageConfig = STAGES.find(s => s.key === data.stage);
      if (stageConfig) {
        const stageEvent: TravelEvent = {
          id: `stage-${Date.now()}`,
          type: data.stage === 'UNLOCKED' ? 'completed' : 'crossing',
          timestamp: new Date(),
          message: data.message || `${stageConfig.icon} ${stageConfig.label}`,
          icon: stageConfig.icon,
        };
        setEvents(prev => {
          if (prev.some(e => e.message === stageEvent.message)) return prev;
          return [...prev, stageEvent];
        });
      }
    });
    
    // 监听旅行完成 (P0 修复)
    const unsubscribeCompleted = on('travel:completed', (data: any) => {
      if (data.tokenId !== tokenId) return;
      
      console.log('[CrossChainTracker] Travel completed:', data);
      setIsCompleted(true);
      setCurrentStage('COMPLETED');
      setProgress(100);
      
      // 添加完成事件
      const completedEvent: TravelEvent = {
        id: `completed-${Date.now()}`,
        type: 'completed',
        timestamp: new Date(),
        message: `🎉 旅行完成！获得 ${data.xpEarned || 0} XP`,
        subMessage: data.badges?.length ? `解锁徽章: ${data.badges.join(', ')}` : undefined,
        icon: '✅',
        data: { xpEarned: data.xpEarned, badges: data.badges, discoveries: data.totalDiscoveries }
      };
      setEvents(prev => [...prev, completedEvent]);
      
      onCompleted?.();
    });

    return () => {
      unsubscribe();
      unsubscribeStage();
      unsubscribeCompleted();
    };
  }, [tokenId, isActive, on, onCompleted]);

  // Initial event
  useEffect(() => {
    if (events.length === 0) {
      setEvents([
        {
          id: '1',
          type: 'lock',
          timestamp: new Date(),
          message: 'NFT 已锁定在 ZetaChain',
          subMessage: '准备开始跨链探险',
          icon: EVENT_ICONS.lock,
        }
      ]);
    }
  }, []);

  // Get current stage index for progress
  const currentStageIndex = STAGES.findIndex(s => s.key === currentStage);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">🐸 跨链探险中</h3>
            <p className="text-sm opacity-90">目标链: {targetChain}</p>
          </div>
          {isCompleted && (
            <span className="bg-green-400 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✅ 已完成
            </span>
          )}
        </div>
      </div>

      {/* Bridge Animation - 彩虹桥动画 */}
      <div className="px-4 py-2">
        <CrossChainBridgeAnimation
          stage={currentStage as any}
          sourceChain="ZetaChain"
          targetChain={targetChain}
          progress={progress}
        />
      </div>

      {/* Stage Progress */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex justify-between items-center mb-2">
          {STAGES.map((stage, index) => {
            const isActive = index <= currentStageIndex;
            const isCurrent = stage.key === currentStage;
            return (
              <div 
                key={stage.key} 
                className={`flex flex-col items-center transition-all duration-300 ${
                  isCurrent ? 'scale-110' : ''
                }`}
              >
                <motion.div
                  animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1, repeat: isCurrent ? Infinity : 0 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    isActive 
                      ? `bg-gradient-to-br ${stage.color} text-white shadow-lg`
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {stage.icon}
                </motion.div>
                <span className={`text-xs mt-1 ${isActive ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Progress bar connecting stages */}
        <div className="relative h-1 bg-gray-200 rounded-full mt-2">
          <motion.div
            className="absolute h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Time and Progress */}
      {!isCompleted && (startTime || endTime) && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-600">探索进度</span>
            <span className="font-medium text-purple-600">{timeRemaining || '计算中...'}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-400 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>{Math.round(progress)}%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* On-Chain Stats Section */}
      <OnChainStats
        blockHeight={onChainData.blockHeight}
        gasUsed={onChainData.gasUsed}
        targetChain={targetChain}
        exploredAddress={onChainData.exploredAddress}
      />

      {/* Discoveries Section */}
      <DiscoveryList
        travelId={travelId}
        discoveries={dbDiscoveries}
        isLoading={!isCompleted && dbDiscoveries.length === 0}
      />

      {/* Timeline Container */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="flex gap-3"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center text-lg">
                {event.icon}
              </div>

              {/* Content */}
              <div className="flex-1 bg-gray-50 rounded-lg p-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{event.message}</p>
                    {event.subMessage && (
                      <p className="text-xs text-gray-500 mt-0.5">{event.subMessage}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {event.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={eventsEndRef} />
        
        {/* Waiting indicator */}
        {!isCompleted && events.length < 3 && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-2 text-gray-400 text-sm px-4"
          >
            <span className="text-xl">🐸</span>
            <span>正在探索中，请耐心等待...</span>
          </motion.div>
        )}
      </div>

      {/* Exploration Interactions Feed */}
      {(currentStage === 'ON_TARGET_CHAIN' || currentStage === 'CROSSING_BACK') && (
        <div className="border-t border-gray-200 p-4">
          <InteractionFeed 
            travelId={travelId} 
            tokenId={tokenId} 
            chainId={chainNameToId(targetChain)} 
          />
        </div>
      )}

      {/* Stats Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-purple-600">{discoveries.length}</p>
            <p className="text-xs text-gray-500">发现</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{events.length}</p>
            <p className="text-xs text-gray-500">事件</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {discoveries.reduce((sum, d) => sum + (d.rarity || 1), 0) * 10}
            </p>
            <p className="text-xs text-gray-500">XP</p>
          </div>
        </div>
      </div>
      
      {/* 完成庆祝弹窗 */}
      <TravelCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        data={completionData}
        onViewDetails={() => {
          setShowCompletionModal(false);
          navigate(`/travel-result/${travelId}`);
        }}
        onStartNewTravel={() => {
          setShowCompletionModal(false);
          navigate('/');
        }}
      />
    </div>
  );
}
