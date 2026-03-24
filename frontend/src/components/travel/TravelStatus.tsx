// frontend/src/components/travel/TravelStatus.tsx
import { useState, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LANDMARKS } from '../../config/landmarks';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CrossChainTravelTracker } from './CrossChainTravelTracker';
import { OnChainStats } from './OnChainStats';
import { DiscoveryList } from './DiscoveryList';
import { FeedButton } from './FeedButton';
import { AddressTag, AddressType } from './AddressTag';
import type { DiscoveryData } from './DiscoveryCard';
import type { Travel } from '../../types';
import { travelFeatureApi } from '../../features/travel/api';

export interface TravelStatusProps {
    travel: Travel;
    frogName: string;
}

export const TravelStatus = memo(function TravelStatus({ travel, frogName }: TravelStatusProps) {
    // 添加调试信息
    // console.log('TravelStatus组件渲染，travel数据:', travel);
    
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState<string>('ACTIVE');
    const [message, setMessage] = useState('');
    const [targetAddress, setTargetAddress] = useState<string>('');
    const [isDiscovering, setIsDiscovering] = useState(false);
    
    // Visualization Data
    const [discoveries, setDiscoveries] = useState<DiscoveryData[]>([]);
    const [onChainData, setOnChainData] = useState<{
        blockHeight?: number;
        gasUsed?: string;
        exploredAddress?: string;
    }>({});

    // V2.0: 地址类型和投喂状态
    const [addressType, setAddressType] = useState<AddressType>('normal');
    const [addressBonus, setAddressBonus] = useState<number>(1.0);
    const [feedCount, setFeedCount] = useState<number>(0);

    const { socket } = useWebSocket();

    // Check if this is a cross-chain travel
    const isCrossChain = travel.isCrossChain || travel.crossChainStatus;

    // Fetch visualization data
    const fetchVisualizationData = useCallback(async () => {
        try {
            const data = await travelFeatureApi.getCrossChainDiscoveries(travel.id);

            if (data) {
                if (data.discoveries) {
                    setDiscoveries(data.discoveries as DiscoveryData[]);
                }
                if (data.onChainStats) {
                    setOnChainData({
                        blockHeight: data.onChainStats.exploredBlock,
                        gasUsed: data.onChainStats.gasUsed,
                        exploredAddress: data.onChainStats.exploredAddress,
                    });
                    if (data.onChainStats.exploredAddress) {
                        setTargetAddress(data.onChainStats.exploredAddress);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch visualization data:', error);
        }
    }, [travel.id]);

    // V2.0: 获取地址类型信息
    const fetchAddressType = useCallback(async (address: string, chainId: number) => {
        try {
            const result = await travelFeatureApi.analyzeAddress(address, chainId);
            setAddressType(result.type);
            setAddressBonus(result.bonus);
        } catch (error) {
            console.error('Failed to analyze address:', error);
        }
    }, []);

    // V2.0: 获取投喂历史
    const fetchFeedHistory = useCallback(async () => {
        try {
            const feeds = await travelFeatureApi.getFeedHistory(travel.id);
            setFeedCount(feeds.length);
        } catch (error) {
            console.error('Failed to fetch feed history:', error);
        }
    }, [travel.id]);

    // Initial fetch and polling
    useEffect(() => {
        if (!isCrossChain && (travel.status === 'Active' || travel.status === 'Processing')) {
             fetchVisualizationData();
             fetchFeedHistory();
        }
    }, [isCrossChain, travel.status, fetchVisualizationData, fetchFeedHistory]);

    // V2.0: 地址变化时分析类型
    useEffect(() => {
        const addr = onChainData.exploredAddress || targetAddress;
        if (addr && travel.chainId) {
            fetchAddressType(addr, travel.chainId);
        }
    }, [onChainData.exploredAddress, targetAddress, travel.chainId, fetchAddressType]);

    useEffect(() => {
        const updateTime = () => {
            const now = Date.now();
            const start = new Date(travel.startTime).getTime();
            const end = new Date(travel.endTime).getTime();
            const total = end - start;
            const elapsed = now - start;
            const remaining = end - now;

            if (remaining <= 0) {
                setTimeRemaining('即将返回...');
                setProgress(100);
                return;
            }

            // 计算进度
            const progressPercent = Math.min((elapsed / total) * 100, 100);
            setProgress(progressPercent);

            // 格式化剩余时间
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
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [travel.startTime, travel.endTime]);

    // WebSocket 事件监听
    useEffect(() => {
        if (!socket) return;

        // 监听旅行更新
        socket.on('travel:update', (data) => {
            if (data.travelId !== travel.id) return;

            setStage(data.stage);
            setMessage(data.message?.text || '');

            // 如果有新的发现类型消息，刷新数据
            if (data.message?.type === 'DISCOVERY' || data.stage === 'DISCOVERING') {
                fetchVisualizationData();
            }

            // 处理地址发现阶段
            if (data.stage === 'DISCOVERING') {
                setIsDiscovering(true);
                
                const addressMatch = data.message?.text.match(/0x[a-fA-F0-9]{40}/);
                if (addressMatch) {
                    setTargetAddress(addressMatch[0]);
                    setIsDiscovering(false); // Found
                }
                
                if (data.message?.address) {
                    setTargetAddress(data.message.address);
                    setIsDiscovering(false);
                }
            }
        });

        // 监听旅行错误
        socket.on('travel:error', (data) => {
            if (data.travelId !== travel.id) return;
            setMessage(data.error || '发生错误');
            setIsDiscovering(false);
        });

        // 监听旅行完成进度
        socket.on('travel:progress', (data: { frogId: number; phase: string; message: string; percentage?: number }) => {
            if (travel.frog && data.frogId !== travel.frog.tokenId) return;
            setStage(data.phase.toUpperCase());
            setMessage(data.message);
            if (data.percentage) {
                setProgress(data.percentage);
            }
        });

        return () => {
            socket.off('travel:update');
            socket.off('travel:error');
            socket.off('travel:progress');
        };
    }, [socket, travel.id, fetchVisualizationData]);

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // If this is a cross-chain travel, render the specialized tracker
    if (isCrossChain && travel.frog) {
        return (
            <CrossChainTravelTracker
                tokenId={travel.frog.tokenId}
                travelId={travel.id}
                targetChain={travel.targetChain || 'Unknown Chain'}
                isActive={travel.status === 'Active' || travel.status === 'Processing'}
                startTime={travel.startTime}
                endTime={travel.endTime}
                onCompleted={() => {
                    console.log('Cross-chain travel completed, triggering refresh');
                }}
            />
        );
    }

    // Otherwise, render the standard travel status (Now Enhanced!)
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-lg p-6 space-y-4"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">
                        🌍 {frogName} 正在旅行中...
                    </h3>
                    <p className="text-sm text-gray-500">
                        {isDiscovering ? '🔎 正在寻找目标...' : `📍 ${onChainData.exploredAddress ? '已锁定目标' : '随机探索'}`}
                    </p>
                </div>
                <span className="text-2xl animate-bounce">✈️</span>
            </div>

            {/* V2.0: 地址类型标签 + 投喂按钮 */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {(targetAddress || onChainData.exploredAddress) && (
                        <AddressTag type={addressType} bonus={addressBonus} size="medium" />
                    )}
                    {feedCount > 0 && (
                        <span className="text-xs text-gray-500">🍭 {feedCount} 次投喂</span>
                    )}
                </div>
                {travel.frog && (
                    <FeedButton
                        travelId={travel.id}
                        feederId={travel.frog.id}
                        targetFrogName={frogName}
                        onFeedSuccess={() => fetchFeedHistory()}
                        disabled={travel.status !== 'Active'}
                    />
                )}
            </div>

            {/* 进度条 */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                    <span>旅行进度</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                     <span>剩余: {timeRemaining}</span>
                </div>
            </div>

            {/* 实时消息 */}
            {message && (
                <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3 animate-pulse">
                    <span className="text-lg">📡</span>
                    <p className="text-sm text-blue-800 font-medium">{message}</p>
                </div>
            )}

            {/* 链上数据统计 (New) */}
            {(targetAddress || onChainData.exploredAddress) && (
                <OnChainStats
                    blockHeight={onChainData.blockHeight}
                    gasUsed={onChainData.gasUsed}
                    targetChain="ZetaChain"
                    exploredAddress={onChainData.exploredAddress || targetAddress}
                />
            )}

            {/* 链上发现列表 (New) */}
            <DiscoveryList
                travelId={travel.id}
                discoveries={discoveries}
                isLoading={false}
                showCategories={false}
            />

            {/* 动画提示 */}
            <div className="text-center text-gray-500 text-sm mt-4">
                <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {isDiscovering ? 
                        `🎲 ${frogName} 正在寻找探索目标...` : 
                        `🐸 ${frogName} 正在收集链上数据...`
                    }
                </motion.span>
            </div>
        </motion.div>
    );
});
