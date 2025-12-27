import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FrogPet } from '../components/frog/FrogPet';
import { TravelForm } from '../components/travel/TravelForm';
import { TravelStatus } from '../components/travel/TravelStatus';
import { TravelJournal } from '../components/travel/TravelJournal';
import { Loading } from '../components/common/Loading';
import { TravelPending } from '../components/travel/TravelPending';
import { TravelP0Form } from '../components/travel/TravelP0Form';
import { useWebSocket, useTravelEvents } from '../hooks/useWebSocket';
import { useEffect, useState, useRef } from 'react';
import { apiService, type Frog } from '../services/api';
import { useAccount } from 'wagmi';
import FriendInteractionModal from '../components/frog/FriendInteraction';
import { useFrogStore } from '../stores/frogStore';


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
}

// @ts-ignore
export function FrogDetail() {
    const { id } = useParams<{ id: string }>();
    const tokenId = parseInt(id || '0');

    const [frog, setFrog] = useState<Frog | null>(null);
    const [activeTravel, setActiveTravel] = useState<TravelDetail | null>(null);
    const [travels, setTravels] = useState<TravelDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);
    const [prevStatus, setPrevStatus] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    
    const { address } = useAccount();
    const { setCurrentFrog } = useFrogStore();
    const [userFrogs, setUserFrogs] = useState<Frog[]>([]);
    
    // 互动相关状态
    const [showInteractionModal, setShowInteractionModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFetching, setIsFetching] = useState(false); // 防止重复获取数据
    const [activeMode, setActiveMode] = useState<'p0' | 'contract'>('p0'); // 旅行模式：p0 (随机) 或 contract (链上)

    const isOwner = frog && address && frog.ownerAddress.toLowerCase() === address.toLowerCase();

    const fetchData = async () => {
        // 防止重复调用
        if (isFetching) return;
        
        try {
            setIsFetching(true);
            setIsLoading(true);
            const frogData = await apiService.getFrogDetail(tokenId, address);

            // Check for status transition: Traveling -> Idle
            if (prevStatus === 'Traveling' && frogData?.status === 'Idle') {
                // 如果是通过 fetchData 轮询发现的状态变化（非 WebSocket触发），也显示庆祝并跳转
                // 但为了避免冲突，我们检查一下是否已经由 WebSocket 处理了
                if (!showCelebration) {
                    setShowCelebration(true);
                    setTimeout(() => {
                        setShowCelebration(false);
                        if (travels.length > 0) {
                            window.location.href = `/travel/${travels[0].id}`;
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

            // 直接从青蛙数据中提取已完成的旅行历史
            if (frogData?.travels) {
                setTravels(frogData.travels.filter((t: TravelDetail) => t.status === 'Completed'));
            }

            // 获取活跃旅行逻辑
            if (frogData?.status === 'Traveling') {
                try {
                    // 如果还在 pending 状态且 API 返回还是 Idle (被我们强制改为 Traveling了)，
                    // 此时去 /active 接口拿可能也是空的，所以如果是 pending 状态，先跳过 active 查询或者容忍失败
                    if (pendingTravelRef.current && !activeTravel) {
                        // 保持当前的乐观 activeTravel，不做任何事
                    } else {
                        const response = await apiService.get(`/travels/${tokenId}/active`);
                        if (response.success && response.data) {
                            const travelData = response.data;
                            
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
                                // 2. 否则可能是数据延迟，重试
                                if (!activeTravel) {
                                    console.log('[FrogDetail] Retry fetching active travel in 2s...');
                                    setTimeout(() => {
                                        if (frog?.status === 'Traveling' && !activeTravel) {
                                            fetchData();
                                        }
                                    }, 2000);
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

            // 如果不是所有者且用户已登录，获取用户自己的青蛙列表以支持“加好友”
            if (address && frogData?.ownerAddress.toLowerCase() !== address.toLowerCase()) {
                const myFrogs = await apiService.getFrogsByOwner(address);
                setUserFrogs(myFrogs);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                            window.location.href = `/travel/${travelEvent.data.travelId}`;
                        } else {
                            //在这个fallback情况，重新拉取数据看看有没有最新旅行
                            fetchData().then(() => {
                                if (travels.length > 0) {
                                    window.location.href = `/travel/${travels[0].id}`;
                                }
                            });
                        }
                    }, 3000); 
                    break;
            }
        }
    }, [travelEvent]);

    // Ref to track locally initiated travel that might not be synced yet
    const pendingTravelRef = useRef(false);

    // [Feature] Aggressive Polling for Travel Start Sync
    // 当处于 Processing 状态时，每 2 秒轮询一次后端，检查是否已同步
    useEffect(() => {
        let pollTimer: NodeJS.Timeout;

        if (activeTravel?.status === 'Processing') {
            console.log('[TravelSync] Starting aggressive polling for travel sync...');
            
            pollTimer = setInterval(async () => {
                try {
                    console.log('[TravelSync] Polling active travel status...');
                    const response = await apiService.get(`/travels/${tokenId}/active`);
                    
                    if (response.success && response.data) {
                        console.log('[TravelSync] Travel synced! Switching to Active state.', response.data);
                        
                        // 后端已同步，清除 pending 标记
                        pendingTravelRef.current = false;
                        
                        // 更新为后端返回的正式数据
                        const travelData = response.data;
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
                    } else {
                        console.log('[TravelSync] Still waiting for backend sync...');
                    }
                } catch (e) {
                    console.warn('[TravelSync] Poll failed:', e);
                }
            }, 2000);
        }

        return () => {
            if (pollTimer) clearInterval(pollTimer);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                                await apiService.post('/api/frogs/sync', { tokenId });
                                await fetchData();
                            } catch (e) {
                                console.error(e);
                                alert('同步失败，请确合约地址配置正确');
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
                            {frog && <FrogPet frogId={frog.tokenId} name={frog.name} />}
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h1 className="text-3xl font-bold text-gray-800">{frog.name}</h1>
                                    <div className="flex items-center gap-2">
                                        {isOwner && (
                                            <button
                                                onClick={() => {
                                                    if (!isFetching) {
                                                        setIsSyncing(true);
                                                        fetchData().finally(() => setIsSyncing(false));
                                                    }
                                                }}
                                                disabled={isSyncing}
                                                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isSyncing ? '🔄' : '🔄'} 刷新
                                            </button>
                                        )}
                                        {isOwner && (
                                            <>
                                                <button
                                                    onClick={() => window.location.href = `/badges/${frog.id}`}
                                                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                                                >
                                                    🏆 徽章
                                                </button>
                                                <button
                                                    onClick={() => window.location.href = `/souvenirs/${frog.tokenId}`}
                                                    className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex items-center gap-2"
                                                >
                                                    🎁 纪念品
                                                </button>
                                                <button
                                                    onClick={() => window.location.href = `/friends/${frog.tokenId}`}
                                                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
                                                >
                                                    👥 好友系统
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                    <span>🎂 {new Date(frog.birthday).toLocaleDateString()}</span>
                                    <span>✈️ {frog.totalTravels} 次旅行</span>
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

                    {/* 主要内容区域 */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* 左侧: 旅行状态或表单/访客信息 */}
                        <div>
                            {isOwner ? (
                                activeTravel && !activeTravel.completed ? (
                                    <>
                                        {console.log('显示旅行状态，activeTravel:', activeTravel)}
                                        {activeTravel.status === 'Processing' ? (
                                            <TravelPending />
                                        ) : (
                                            <TravelStatus travel={activeTravel} frogName={frog.name} />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {console.log('不显示旅行状态，activeTravel:', activeTravel, 'completed:', activeTravel?.completed)}
                                        <div className="space-y-4">
                                        {/* 模式切换选项卡 */}
                                        <div className="flex bg-white/50 backdrop-blur p-1 rounded-xl border border-gray-200">
                                            <button
                                                onClick={() => setActiveMode('p0')}
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                                                    activeMode === 'p0'
                                                        ? 'bg-white text-green-600 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                🎲 快速探索
                                            </button>
                                            <button
                                                onClick={() => setActiveMode('contract')}
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                                                    activeMode === 'contract'
                                                        ? 'bg-white text-blue-600 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                ⛓️ 高级设置
                                            </button>
                                        </div>

                                        {activeMode === 'p0' ? (
                                            <TravelP0Form
                                                frogId={tokenId}
                                                frogName={frog.name}
                                                onSuccess={() => {
                                                    fetchData();
                                                }}
                                            />
                                        ) : (
                                            <TravelForm
                                                frogId={tokenId}
                                                frogName={frog.name}
                                                onSuccess={fetchData}
                                            />
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
                                                        onClick={() => window.location.href = `/friends/${userFrogs[0].tokenId}`}
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

                        {/* 右侧: 旅行历史 */}
                        <div className="space-y-4">
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
        </>
    );
}