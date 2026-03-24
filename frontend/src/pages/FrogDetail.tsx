import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FrogPet } from '../components/frog/FrogPet';
import { FrogScene } from '../components/frog/FrogScene';
import { TravelForm } from '../components/travel/TravelForm';
import { CrossChainTravelForm } from '../components/travel/CrossChainTravelForm';
import { TravelModeSelector } from '../components/travel/TravelModeSelector';
import { TravelStatus } from '../components/travel/TravelStatus';
import { TravelJournal } from '../components/travel/TravelJournal';
import { Loading } from '../components/common/Loading';
import { TravelPending } from '../components/travel/TravelPending';
import { InteractionFeed } from '../components/travel/InteractionFeed';
import { GroupTravelModal } from '../components/travel/GroupTravelModal';
import { useWebSocket, useTravelEvents } from '../hooks/useWebSocket';
import { useEffect, useState, useRef } from 'react';
import type { Frog } from '../types';
import { frogFeatureApi } from '../features/frog/api';
import { travelFeatureApi } from '../features/travel/api';
import { web3FeatureApi } from '../features/web3/api';
import { lifeFeatureApi } from '../features/life/api';
import { memoryPalaceApi, type MemoryPalaceLite } from '../features/memory-palace/api';
import { buildMemoryPalacePath } from '../features/memory-palace/routes';
import type { FrogWalletReadModel, OnchainMilestoneReadModel, LifeReadModel } from '../lib/api/contracts';
import { useAccount } from 'wagmi';
import FriendInteractionModal from '../components/frog/FriendInteraction';
import { useFrogStore } from '../stores/frogStore';
import { NurturePanel } from '../components/frog/NurturePanel';
import { TravelCheck } from '../components/frog/TravelCheck';
import { useToast } from '../components/common/ToastProvider';
import { AnimatedTabs } from '../components/common/AnimatedTabs';
import { LevelUpCelebration } from '../components/common/MicroInteractions';
import { RefreshCw, Home, Trophy, Gift, Users, Heart, Plane } from 'lucide-react';
import { HibernationBadge } from '../components/frog/HibernationBadge';
import { ReviveModal } from '../components/frog/ReviveModal';
import { useHibernation } from '../hooks/useHibernation';
import { PetStatePanel } from '../features/life/components/PetStatePanel';
import { CareActionPanel } from '../features/life/components/CareActionPanel';
import { TravelSummaryCard } from '../features/travel/components/TravelSummaryCard';
import { MemoryPalaceView } from '../features/memory-palace/components/MemoryPalaceView';


interface TravelDetail {
    id: number;
    tokenId: number;
    frogId: number;
    startTime: string;
    endTime: string;
    targetWallet: string;
    chainId: number;
    status: 'Active' | 'Processing' | 'Completed' | 'Cancelled' | 'Failed';
    journalHash?: string;
    journalContent?: string | null;
    journal?: {
        title: string;
        content: string;
        mood: string;
        highlights: string[];
    } | null;
    souvenir?: {
        id: number;
        tokenId: number;
        name: string;
        rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
    } | null;
    completedAt?: string | null;
    completed: boolean;
    isCrossChain?: boolean;
    crossChainStatus?: 'LOCKED' | 'CROSSING_OUT' | 'ON_TARGET_CHAIN' | 'CROSSING_BACK' | 'UNLOCKED' | 'FAILED';
}

const shortAddress = (value?: string | null): string => {
    if (!value) return '--';
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatMilestoneType = (value: string): string =>
    value
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

// @ts-ignore
export function FrogDetail() {
    const { tokenId: tokenIdParam } = useParams<{ tokenId: string }>();
    const navigate = useNavigate();
    const tokenId = parseInt(tokenIdParam || '0');

    const [frog, setFrog] = useState<Frog | null>(null);
    const [activeTravel, setActiveTravel] = useState<TravelDetail | null>(null);
    const [travels, setTravels] = useState<TravelDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);
    const [prevStatus, setPrevStatus] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    
    const { address } = useAccount();
    const { setCurrentFrog } = useFrogStore();
    const { toast } = useToast();
    const [userFrogs, setUserFrogs] = useState<Frog[]>([]);
    const [walletSummary, setWalletSummary] = useState<FrogWalletReadModel | null>(null);
    const [walletMilestones, setWalletMilestones] = useState<OnchainMilestoneReadModel[]>([]);
    const [walletLoading, setWalletLoading] = useState(false);
    const [lifeState, setLifeState] = useState<LifeReadModel | null>(null);
    const [lifeLoading, setLifeLoading] = useState(false);
    const [memoryPalace, setMemoryPalace] = useState<MemoryPalaceLite | null>(null);
    const [memoryLoading, setMemoryLoading] = useState(false);
    
    // 互动相关状态
    const [showInteractionModal, setShowInteractionModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFetching, setIsFetching] = useState(false); // 防止重复获取数据
    const [activeMode, setActiveMode] = useState<'select' | 'local' | 'crosschain'>('select'); // 旅行模式：select (选择), local (本地探索), crosschain (跨链)
    const activeTravelRetryRef = useRef(0); // 重试计数器，限制最多3次
    const lastKnownTravelsRef = useRef<TravelDetail[]>([]);
    const [showGroupTravelModal, setShowGroupTravelModal] = useState(false); // 结伴旅行弹窗
    const [mainTab, setMainTab] = useState<'travel' | 'nurture'>('nurture'); // 主 Tab：旅行或养成
    const [showTravelCheck, setShowTravelCheck] = useState(false); // 旅行前置检查
    const [showReviveModal, setShowReviveModal] = useState(false); // 唤醒弹窗

    const isOwner = frog && address && frog.ownerAddress.toLowerCase() === address.toLowerCase();
    
    // 🌙 冬眠状态管理
    const hibernation = useHibernation(frog?.id || null);

    // 调试日志：帮助诊断 isOwner 判断问题
    useEffect(() => {
        if (frog && address) {
            console.log('[FrogDetail] Owner check:', {
                frogTokenId: frog.tokenId,
                frogOwner: frog.ownerAddress.toLowerCase(),
                walletAddress: address.toLowerCase(),
                isOwner: frog.ownerAddress.toLowerCase() === address.toLowerCase()
            });
        }
    }, [frog, address]);

    useEffect(() => {
        lastKnownTravelsRef.current = [];
    }, [tokenId]);

    // 【改进】如果青蛙正在旅行，自动跳转到旅行详情页
    useEffect(() => {
        if (frog?.status === 'Traveling' && activeTravel?.id && activeTravel.id > 0) {
            console.log('[FrogDetail] Frog is traveling, redirecting to travel page:', activeTravel.id);
            navigate(`/travel/${activeTravel.id}`);
        }
    }, [frog?.status, activeTravel?.id, navigate]);


    const fetchData = async () => {
        // 防止重复调用
        if (isFetching) return;
        const previousTravels = lastKnownTravelsRef.current;
        
        try {
            setIsFetching(true);
            setIsLoading(true);
            // 清除旧数据，防止页面切换时显示残留状态
            setFrog(null);
            setActiveTravel(null);
            setTravels([]);
            setError(null);
            setWalletSummary(null);
            setWalletMilestones([]);
            setLifeState(null);
            setMemoryPalace(null);
            
            const frogData = await frogFeatureApi.getFrogDetail(tokenId, address);
            const currentTravels = frogData?.travels || [];
            if (currentTravels.length > 0) {
                lastKnownTravelsRef.current = currentTravels;
            }

            // Check for status transition: Traveling -> Idle
            if (prevStatus === 'Traveling' && frogData?.status === 'Idle') {
                // 如果是通过 fetchData 轮询发现的状态变化（非 WebSocket触发），也显示庆祝并跳转
                // 但为了避免冲突，我们检查一下是否已经由 WebSocket 处理了
                if (!showCelebration) {
                    setShowCelebration(true);
                    setTimeout(() => {
                        setShowCelebration(false);
                        const travelToOpen = currentTravels[0]?.id || previousTravels[0]?.id;
                        if (travelToOpen) {
                            navigate(`/travel/${travelToOpen}`);
                        }
                    }, 3000);
                }
            }
            // 状态保护逻辑：如果本地刚发起旅行，忽略后端的 Idle 状态
            if (pendingTravelRef.current && frogData?.status === 'Idle') {
                console.log('⏳ 后端尚未同步，维持乐观更新状态 (Traveling)...');
                // 强制修正数据状态，避免 UI 闪烁
                if (frogData) {
                    frogData.status = 'Traveling';
                }
                // 此时不要清除 activeTravel，保留之前的 optimistic state
            } else if (frogData?.status === 'Traveling') {
                // 后端已确认进入 Traveling 状态，清除 pending 标记
                pendingTravelRef.current = false;
            }

            setPrevStatus(frogData?.status || null);
            setFrog(frogData);
            if (frogData) setCurrentFrog(frogData);

            // 直接从青蛙数据中提取已完成的旅行历史（后端已只返回 Completed）
            setTravels(currentTravels);

            // 获取活跃旅行逻辑
            if (frogData?.status === 'Traveling') {
                try {
                    // 如果还在 pending 状态且 API 返回还是 Idle (被我们强制改为 Traveling了)，
                    // 此时去 /active 接口拿可能也是空的，所以如果是 pending 状态，先跳过 active 查询或者容忍失败
                    if (pendingTravelRef.current && !activeTravel) {
                        // 保持当前的乐观 activeTravel，不做任何事
                    } else {
                        const travelData = await travelFeatureApi.getActiveByTokenId(tokenId);
                        if (travelData) {
                            
                            // [DEBUG] Log unexpected state
                            console.log(`[FrogDetail] Active travel check: ${travelData ? 'Found' : 'Null'}, Status: ${travelData?.status}`);
                            
                            setActiveTravel({
                                ...travelData,
                                startTime: new Date(travelData.startTime).toISOString(),
                                endTime: new Date(travelData.endTime).toISOString(),
                                completed: travelData.status === 'Completed'
                            });
                        } else {
                            // [DEBUG] No active travel found from API
                            console.log('[FrogDetail] No active travel data from API yet.');

                            // 如果没有活跃旅行数据，但状态是Traveling
                            // 1. 如果是 pending，说明后端还没生成，保持前端乐观数据
                            if (pendingTravelRef.current) { 
                                console.log('[FrogDetail] Keeping optimistic travel state pending backend sync...');
                            } else {
                                // 2. 否则可能是数据延迟，限制重试次数
                                if (!activeTravel && activeTravelRetryRef.current < 3) {
                                    activeTravelRetryRef.current++;
                                    console.log(`[FrogDetail] Retry fetching active travel (${activeTravelRetryRef.current}/3) in 2s...`);
                                    setTimeout(() => {
                                        if (frog?.status === 'Traveling' && !activeTravel) {
                                            fetchData();
                                        }
                                    }, 2000);
                                } else if (activeTravelRetryRef.current >= 3) {
                                    console.log('[FrogDetail] Max retries reached, frog may have completed travel or status is stale');
                                    // 重置重试计数器
                                    activeTravelRetryRef.current = 0;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('[FrogDetail] 获取活跃旅行失败:', error);
                    if (!activeTravel && !pendingTravelRef.current) {
                        setTimeout(() => {
                            if (frog?.status === 'Traveling' && !activeTravel) {
                                fetchData();
                            }
                        }, 3000);
                    }
                }
            } else {
                // 只有在非 pending 且非 Traveling 时才清除 ActiveTravel
                if (!pendingTravelRef.current) {
                    setActiveTravel(null);
                }
            }

            const shouldLoadWallet = Boolean(
                address && frogData?.ownerAddress.toLowerCase() === address.toLowerCase()
            );
            if (shouldLoadWallet && frogData) {
                setWalletLoading(true);
                try {
                    const [wallet, milestones] = await Promise.all([
                        web3FeatureApi.getFrogWallet(frogData.id),
                        web3FeatureApi.getOnchainMilestones(frogData.id, 5),
                    ]);
                    setWalletSummary(wallet);
                    setWalletMilestones(milestones);
                } catch (walletError) {
                    console.warn('[FrogDetail] Failed to load frog wallet summary:', walletError);
                    setWalletSummary(null);
                    setWalletMilestones([]);
                } finally {
                    setWalletLoading(false);
                }
            } else {
                setWalletSummary(null);
                setWalletMilestones([]);
                setWalletLoading(false);
            }

            if (frogData) {
                setMemoryLoading(true);
                memoryPalaceApi
                    .getByFrogId(frogData.id)
                    .then((memory) => setMemoryPalace(memory))
                    .catch((memoryError) => {
                        console.warn('[FrogDetail] Failed to load memory palace:', memoryError);
                        setMemoryPalace(null);
                    })
                    .finally(() => setMemoryLoading(false));
            } else {
                setMemoryPalace(null);
                setMemoryLoading(false);
            }

            if (shouldLoadWallet && frogData) {
                setLifeLoading(true);
                try {
                    const life = await lifeFeatureApi.getLife(frogData.id);
                    setLifeState(life);
                } catch (lifeError) {
                    console.warn('[FrogDetail] Failed to load life state:', lifeError);
                    setLifeState(null);
                } finally {
                    setLifeLoading(false);
                }
            } else {
                setLifeState(null);
                setLifeLoading(false);
            }

            // 如果不是所有者且用户已登录，获取用户自己的青蛙以支持"加好友"
            if (address && frogData?.ownerAddress.toLowerCase() !== address.toLowerCase()) {
                const myFrog = await frogFeatureApi.getMyFrog(address);
                setUserFrogs(myFrog ? [myFrog] : []);
            } else {
                setUserFrogs([]);
            }
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [tokenId, address]);

    // WebSocket连接和旅行事件监听
    const { subscribeFrog, unsubscribeFrog, on } = useWebSocket();
    const travelEvent = useTravelEvents(tokenId);

    // 监听旅行事件 - 统一处理所有旅行状态变更
    useEffect(() => {
        if (travelEvent) {
            switch (travelEvent.type) {
                case 'started':
                    console.log('旅行开始事件:', travelEvent.data);
                    // 立即创建临时旅行状态，提升响应速度
                    const { targetWallet, duration, chainId } = travelEvent.data as any; // 这里的类型可能需要根据实际 event 调整，或者直接 trust event data
                    // 如果 event data 不包含所有字段，可能需要 fallback
                    
                    // 刷新数据以获取最新状态
                    setTimeout(fetchData, 1000);
                    break;
                    
                case 'progress':
                    console.log('旅行进度事件:', travelEvent.data);
                    // 这里可以添加进度提示，目前 TravelStatus 组件会处理具体的 WebSocket 进度更新
                    break;
                    
                case 'completed':
                    console.log('旅行完成事件:', travelEvent.data);
                    // 1. 设置完成标志，可能触发庆祝动画
                    setShowCelebration(true);
                    
                    // 2. 延迟跳转，让用户看到庆祝动画
                    setTimeout(() => {
                        setShowCelebration(false);
                        // 跳转到旅行详情页面
                        if (travelEvent.data.travelId) {
                            navigate(`/travel/${travelEvent.data.travelId}`);
                        } else {
                            //在这个fallback情况，重新拉取数据看看有没有最新旅行
                            void fetchData().then(() => {
                                const travelToOpen = lastKnownTravelsRef.current[0]?.id;
                                if (travelToOpen) {
                                    navigate(`/travel/${travelToOpen}`);
                                }
                            });
                        }
                    }, 3000); 
                    break;
            }
        }
    }, [travelEvent, navigate]);

    // Ref to track locally initiated travel that might not be synced yet
    const pendingTravelRef = useRef(false);

    // [Feature] Smart Polling for Travel Start Sync
    // 使用指数退避策略轮询，避免频繁请求
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let delay = 1000; // 初始延迟 1s
        let mounted = true;

        const poll = async () => {
            if (!mounted) return;
            // 如果状态已经变了（不再是 Processing），就不再轮询
            // 这里我们需要引用最新的 activeTravel 状态，但由于闭包问题，
            // 最好依赖 effect 的清理和重建机制来停止
            
            try {
                console.log(`[TravelSync] Polling active travel status (delay: ${Math.round(delay)}ms)...`);
                const response = await travelFeatureApi.getActiveByTokenId(tokenId);
                
                if (mounted && response) {
                    console.log('[TravelSync] Travel synced! Switching to Active state.', response);
                    
                    // 后端已同步，清除 pending 标记
                    pendingTravelRef.current = false;
                    
                    // 更新为后端返回的正式数据
                    const travelData = response;
                    setActiveTravel({
                        ...travelData,
                        startTime: new Date(travelData.startTime).toISOString(),
                        endTime: new Date(travelData.endTime).toISOString(),
                        completed: travelData.status === 'Completed'
                    });
                    
                    // 同时也更新一下青蛙状态
                    if (frog && frog.status !== 'Traveling') {
                        setFrog({ ...frog, status: 'Traveling' });
                    }
                    // 成功同步，不再调度下一次轮询
                } else if (mounted) {
                    // [DEBUG] No active travel found
                    // 没拿到数据，继续轮询但增加延迟
                    delay = Math.min(delay * 1.5, 10000); // 每次增加1.5倍，最大10s
                    timeoutId = setTimeout(poll, delay);
                }
            } catch (e) {
                if (mounted) {
                    console.warn('[TravelSync] Poll failed:', e);
                    delay = Math.min(delay * 1.5, 10000);
                    timeoutId = setTimeout(poll, delay);
                }
            }
        };

        if (activeTravel?.status === 'Processing') {
            console.log('[TravelSync] Starting smart polling for travel sync...');
            // 首次轮询快速执行
            timeoutId = setTimeout(poll, 1000);
        }

        return () => {
            mounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [activeTravel?.status, tokenId, frog]);
    
    // 监听 window 自定义事件 (从 TravelForm 发出)
    useEffect(() => {
        const handleTravelStarted = (event: any) => {
            const { frogId, targetWallet, duration, chainId, isRandom } = event.detail;
            if (frogId === tokenId) {
                console.log('收到本地旅行开始事件，创建临时状态:', event.detail);
                
                // 标记为等待同步状态
                pendingTravelRef.current = true;
                // 30秒后自动清除标记，防止死锁
                setTimeout(() => {
                    pendingTravelRef.current = false;
                }, 30000);
                
                // 立即创建临时旅行状态
                const now = new Date();
                const endTime = new Date(now.getTime() + duration * 1000);
                
                const tempTravel: TravelDetail = {
                    id: 0, // 临时ID
                    tokenId: tokenId,
                    frogId: tokenId,
                    startTime: now.toISOString(),
                    endTime: endTime.toISOString(),
                    targetWallet: targetWallet,
                    chainId: chainId,
                    status: 'Processing', // 使用 Processing 状态触发 Pending UI
                    completed: false,
                    isCrossChain: true,
                    crossChainStatus: 'LOCKED',
                    journalHash: undefined,
                    journalContent: undefined,
                    journal: undefined,
                    souvenir: undefined,
                    completedAt: undefined
                };
                
                setActiveTravel(tempTravel);
                // 乐观更新：将青蛙状态设为 Traveling
                if (frog) {
                    setFrog({ ...frog, status: 'Traveling' });
                }
                
                // 稍后刷新以确保后端同步
                setTimeout(fetchData, 2000);
            }
        };

        window.addEventListener('travel:started', handleTravelStarted);
        
        return () => {
            window.removeEventListener('travel:started', handleTravelStarted);
        };
    }, [tokenId, frog]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loading text="加载中..." />
            </div>
        );
    }

    if (error || !frog) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">青蛙未找到</h1>
                    <p className="text-gray-500 mb-4">找不到 ID 为 {tokenId} 的青蛙</p>
                    <button
                        onClick={async () => {
                            setIsSyncing(true);
                            try {
                                await frogFeatureApi.syncFrog(tokenId);
                                await fetchData();
                            } catch (e) {
                                console.error(e);
                                toast.error('同步失败，请确认合约地址配置正确');
                            } finally {
                                setIsSyncing(false);
                            }
                        }}
                        disabled={isSyncing}
                        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                        {isSyncing ? '同步中...' : '尝试从链上同步'}
                    </button>
                </div>
            </div>
        );
    }

    const latestCompletedTravel =
        travels.find((travel) => travel.status === 'Completed' || Boolean(travel.completedAt)) ||
        travels[0] ||
        null;

    return (
        <>
            <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    {/* 庆祝动画 */}
                    {showCelebration && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
                        >
                            <div className="bg-white rounded-2xl p-8 text-center">
                                <h2 className="text-3xl font-bold mb-4">🎉 欢迎回来！</h2>
                                {frog ? (
                                    <p className="text-xl">{frog.name} 旅行归来啦！</p>
                                ) : null}
                            </div>
                        </motion.div>
                    )}

                    {/* 青蛙信息头部 */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-lg p-6 mb-6"
                    >
                        <div className="flex items-center space-x-6">
                            {frog && (
                              <FrogScene
                                frogId={frog.id}
                                frogName={frog.name}
                                isOwner={isOwner}
                                showVisitorControls={isOwner}
                                onGroupTravel={async (companion) => {
                                  try {
                                    const response = await travelFeatureApi.startGroupTravel({
                                      leaderId: frog.tokenId,
                                      companionId: companion.tokenId,
                                      duration: 3600
                                    });
                                    if (response.success) {
                                      toast.success(`${frog.name} 和 ${companion.name} 一起出发啦！`);
                                      fetchData();
                                    }
                                  } catch (error: any) {
                                    toast.error(error?.message || '发起结伴旅行失败');
                                  }
                                }}
                              />
                            )}
                            <div className="flex-1">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-3xl font-bold text-gray-800">{frog.name}</h1>
                                        {/* 🌙 冬眠状态徽章 */}
                                        <HibernationBadge 
                                            status={hibernation.status} 
                                            onClick={() => hibernation.isSleeping && setShowReviveModal(true)}
                                        />

                                    </div>
                                    {isOwner && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => {
                                                    if (!isFetching) {
                                                        setIsSyncing(true);
                                                        fetchData().finally(() => setIsSyncing(false));
                                                    }
                                                }}
                                                disabled={isSyncing}
                                                aria-label="刷新数据"
                                                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                                            >
                                                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                                <span className="hidden sm:inline">刷新</span>
                                            </button>
                                            <button
                                                onClick={() => navigate(buildMemoryPalacePath(frog.id))}
                                                aria-label="进入记忆空间"
                                                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-1 text-sm font-medium whitespace-nowrap"
                                            >
                                                <Home size={16} />
                                                <span className="hidden sm:inline">空间</span>
                                            </button>
                                            <button
                                                onClick={() => navigate('/badges')}
                                                aria-label="兑换徽章"
                                                className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-1 text-sm font-medium whitespace-nowrap"
                                            >
                                                <Trophy size={16} />
                                                <span className="hidden sm:inline">兑换</span>
                                            </button>
                                            <button
                                                onClick={() => navigate('/souvenirs')}
                                                aria-label="查看纪念品"
                                                className="px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex items-center justify-center gap-1 text-sm font-medium whitespace-nowrap"
                                            >
                                                <Gift size={16} />
                                                <span className="hidden sm:inline">纪念品</span>
                                            </button>
                                            <button
                                                onClick={() => navigate('/friends')}
                                                aria-label="好友系统"
                                                className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-1 text-sm font-medium whitespace-nowrap col-span-2 sm:col-span-1"
                                            >
                                                <Users size={16} />
                                                <span className="hidden sm:inline">好友系统</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                    <span>🎂 {new Date(frog.birthday).toLocaleDateString()}</span>
                                    <span>✈️ {travels.length || frog.totalTravels} 次旅行</span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        frog.status === 'Traveling' 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : 'bg-green-100 text-green-800'
                                    }`}>
                                        {frog.status === 'Traveling' ? '旅行中' : '在家'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {isOwner && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-800">🧾 Frog Wallet</h2>
                                {walletSummary ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                        Chain {walletSummary.chainId}
                                    </span>
                                ) : null}
                            </div>

                            {walletLoading ? (
                                <p className="text-sm text-gray-500">加载钱包摘要中...</p>
                            ) : walletSummary ? (
                                <div className="space-y-4">
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="text-xs text-gray-500 mb-1">TBA Address</div>
                                        <div className="font-mono text-sm text-gray-800 break-all">
                                            {walletSummary.tbaAddress}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">
                                            Source: {walletSummary.tbaSource}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                                            <div className="text-xl font-bold text-amber-700">
                                                {walletSummary.assets.souvenirs.length}
                                            </div>
                                            <div className="text-xs text-amber-600">Souvenirs</div>
                                        </div>
                                        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center">
                                            <div className="text-xl font-bold text-indigo-700">
                                                {walletSummary.assets.badges.length}
                                            </div>
                                            <div className="text-xs text-indigo-600">Badges</div>
                                        </div>
                                        <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 text-center">
                                            <div className="text-xl font-bold text-teal-700">
                                                {walletSummary.assets.decorations.length}
                                            </div>
                                            <div className="text-xs text-teal-600">Decorations</div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="flex items-center justify-between text-sm text-gray-700">
                                            <span>Milestones</span>
                                            <span className="font-semibold">{walletSummary.milestones.total}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            最新记录：
                                            {walletSummary.milestones.latestAt
                                                ? new Date(walletSummary.milestones.latestAt).toLocaleString()
                                                : '暂无'}
                                        </div>
                                        {walletMilestones.length > 0 ? (
                                            <div className="mt-3 space-y-2">
                                                {walletMilestones.map((milestone) => (
                                                    <div
                                                        key={milestone.id}
                                                        className="flex items-center justify-between text-xs text-gray-600"
                                                    >
                                                        <span>{formatMilestoneType(milestone.milestoneType)}</span>
                                                        <span>
                                                            {milestone.chainId ? `#${milestone.chainId}` : '-'} ·{' '}
                                                            {shortAddress(milestone.txHash)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">暂无可展示的钱包摘要。</p>
                            )}
                        </motion.div>
                    )}

                    {isOwner && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 grid gap-4 md:grid-cols-2"
                        >
                            <PetStatePanel
                                life={lifeState}
                                loading={lifeLoading}
                                onRefresh={() => {
                                    if (!isFetching) {
                                        fetchData();
                                    }
                                }}
                            />
                            <CareActionPanel
                                frogId={frog.id}
                                onStateChanged={async () => {
                                    await fetchData();
                                }}
                                onSuccess={(message) => toast.success(message)}
                                onError={(message) => toast.error(message)}
                            />
                        </motion.div>
                    )}

                    {/* 🐸 主 Tab 切换器 - 养成 / 旅行 */}
                    {isOwner && frog.status !== 'Traveling' && (
                        <div className="mb-6">
                            <AnimatedTabs
                                tabs={[
                                    { id: 'nurture', label: '养成照顾', icon: <Heart size={16} /> },
                                    { id: 'travel', label: '出门旅行', icon: <Plane size={16} /> },
                                ]}
                                activeTab={mainTab}
                                onTabChange={(id) => setMainTab(id as 'nurture' | 'travel')}
                            />
                        </div>
                    )}

                    {/* 养成面板 */}
                    {isOwner && mainTab === 'nurture' && frog.status !== 'Traveling' && (
                        <div className="mb-6">
                            <NurturePanel 
                                frogId={frog.id} 
                                frogTokenId={frog.tokenId}
                                ownerAddress={frog.ownerAddress}
                                mode="detail"
                            />
                        </div>
                    )}

                    {/* 旅行前置检查弹窗 */}
                    {showTravelCheck && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        >
                            <div className="w-full max-w-md">
                                <TravelCheck
                                    frogId={frog.id}
                                    frogName={frog.name}
                                    onConfirm={() => {
                                        setShowTravelCheck(false);
                                        setMainTab('travel');
                                    }}
                                    onCancel={() => setShowTravelCheck(false)}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* 主要内容区域 */}
                    <div className={`grid md:grid-cols-2 gap-6 ${isOwner && mainTab === 'nurture' && frog.status !== 'Traveling' ? 'hidden' : ''}`}>
                        {/* 左侧: 旅行状态或表单/访客信息 */}
                        <div>
                            {isOwner ? (
                                activeTravel && !activeTravel.completed ? (
                                    <>
                                        {console.log('显示旅行状态，activeTravel:', activeTravel)}
                                        {activeTravel.status === 'Processing' ? (
                                            <TravelPending 
                                                txHash={activeTravel.journalHash || ''}
                                                onReset={() => {
                                                    console.log('用户手动重置旅行状态');
                                                    setIsLoading(true);
                                                    fetchData();
                                                }}
                                            />
                                        ) : (
                                            <TravelStatus travel={activeTravel} frogName={frog.name} />
                                        )}
                                        
                                        {/* 链上探索实时数据 */}
                                        {activeTravel.isCrossChain && activeTravel.chainId && (
                                            <div className="mt-6">
                                                <InteractionFeed
                                                    travelId={activeTravel.id}
                                                    tokenId={tokenId}
                                                    chainId={activeTravel.chainId}
                                                />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {console.log('不显示旅行状态，activeTravel:', activeTravel, 'completed:', activeTravel?.completed)}
                                        <div className="space-y-4">
                                        {/* 统一旅行入口 */}
                                        {activeMode === 'select' && (
                                            <TravelModeSelector
                                                tokenId={tokenId}
                                                frogId={frog.id}
                                                frogName={frog.name}
                                                onSelectLocalExploration={() => setActiveMode('local')}
                                                onSelectCrossChain={() => setActiveMode('crosschain')}
                                                onSelectGroupTravel={() => setShowGroupTravelModal(true)}
                                            />
                                        )}

                                        {/* 本地探索表单 */}
                                        {activeMode === 'local' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-bold text-gray-800">🌿 本地探索</h3>
                                                    <button
                                                        onClick={() => setActiveMode('select')}
                                                        className="text-sm text-gray-500 hover:text-gray-700"
                                                    >
                                                        ← 返回选择
                                                    </button>
                                                </div>
                                                <TravelForm
                                                    frogId={tokenId}
                                                    frogName={frog.name}
                                                    onSuccess={() => {
                                                        fetchData();
                                                    }}
                                                />
                                            </motion.div>
                                        )}
                                        
                                        {/* 跨链旅行表单 */}
                                        {activeMode === 'crosschain' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                                                        🌉 跨链旅行
                                                    </h3>
                                                    <button
                                                        onClick={() => setActiveMode('select')}
                                                        className="text-sm text-gray-500 hover:text-gray-700"
                                                    >
                                                        ← 返回选择
                                                    </button>
                                                </div>
                                                <CrossChainTravelForm
                                                    frogId={frog.id}
                                                    tokenId={tokenId}
                                                    frogName={frog.name}
                                                    onSuccess={fetchData}
                                                />
                                            </motion.div>
                                        )}
                                        </div>
                                    </>
                                )
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-2xl shadow-lg p-6 space-y-6"
                                >
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-bold text-gray-800">👋 你好，旅行者！</h3>
                                        <p className="text-gray-500 text-sm">你正在访问 {frog.name} 的个人主页</p>
                                    </div>
                                    
                                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">拥有者</span>
                                            <span className="font-mono text-blue-600 truncate ml-4">
                                                {frog.ownerAddress.slice(0, 6)}...{frog.ownerAddress.slice(-4)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">当前状态</span>
                                            <span className={`font-medium ${frog.status === 'Traveling' ? 'text-blue-500' : 'text-green-500'}`}>
                                                {frog.status === 'Traveling' ? '正在探索世界' : '正在家中休息'}
                                            </span>
                                        </div>
                                    </div>

                                    {address && userFrogs.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                            {frog.friendshipStatus === 'Accepted' ? (
                                                <div className="space-y-3">
                                                    <div className="w-full py-3 bg-green-50 text-green-600 rounded-xl font-bold flex items-center justify-center gap-2 border border-green-200">
                                                        ✅ 已经是好友
                                                    </div>
                                                    <button
                                                        onClick={() => setShowInteractionModal(true)}
                                                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        👋 拜访/互动
                                                    </button>
                                                </div>
                                            ) : frog.friendshipStatus === 'Pending' ? (
                                                <div className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 border border-blue-200">
                                                    ⏳ 请求发送中...
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-xs text-gray-400 text-center">你可以让你的青蛙和 {frog.name} 交朋友</p>
                                                    <button 
                                                        onClick={() => navigate('/friends')}
                                                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        🤝 发起好友请求
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* 右侧: 旅行与记忆 */}
                        <div className="space-y-4">
                            <TravelSummaryCard
                                activeTravel={activeTravel}
                                lastTravel={latestCompletedTravel}
                                onOpenActive={(travelId) => {
                                    if (travelId > 0) {
                                        navigate(`/travel/${travelId}`);
                                    }
                                }}
                                onOpenHistory={() => navigate('/travel-history')}
                            />

                            <MemoryPalaceView
                                memoryPalace={memoryPalace}
                                loading={memoryLoading}
                                onOpenFull={() => navigate(`/memory-palace/${frog.id}`)}
                            />

                            <h2 className="text-xl font-bold text-gray-800">📖 旅行日记</h2>
                            {travels.length > 0 ? (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                    {travels.map((travel) => (
                                        <TravelJournal key={travel.id} travel={travel} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl p-6 text-center text-gray-500">
                                    <p>还没有旅行记录</p>
                                    <p className="text-sm mt-1">派 {frog.name} 去冒险吧！</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {showInteractionModal && frog && userFrogs.length > 0 && frog.friendshipId && (
                <FriendInteractionModal
                    friend={frog}
                    friendshipId={frog.friendshipId}
                    currentFrogId={userFrogs[0].id}
                    onClose={() => setShowInteractionModal(false)}
                    onInteractionComplete={() => {
                        setShowInteractionModal(false);
                        // 可以添加成功提示
                    }}
                />
            )}

            {/* 结伴旅行弹窗 */}
            {frog && (
                <GroupTravelModal
                    isOpen={showGroupTravelModal}
                    onClose={() => setShowGroupTravelModal(false)}
                    frogId={frog.id}
                    frogName={frog.name}
                    tokenId={tokenId}
                    onSuccess={(travelId) => {
                        setShowGroupTravelModal(false);
                        // 跳转到旅行详情页
                        navigate(`/travel/${travelId}`);
                    }}
                />
            )}
            
            {/* 🌙 唤醒弹窗 */}
            {frog && (
                <ReviveModal
                    isOpen={showReviveModal}
                    onClose={() => setShowReviveModal(false)}
                    frogId={frog.id}
                    frogName={frog.name}
                    ownerAddress={frog.ownerAddress}
                    onSuccess={() => {
                        hibernation.refresh();
                        fetchData();
                    }}
                />
            )}
        </>
    );
}
