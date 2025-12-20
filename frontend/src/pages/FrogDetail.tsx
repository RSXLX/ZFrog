import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FrogPet } from '../components/frog/FrogPet';
import { TravelForm } from '../components/travel/TravelForm';
import { TravelStatus } from '../components/travel/TravelStatus';
import { TravelJournal } from '../components/travel/TravelJournal';
import { Loading } from '../components/common/Loading';
import { TravelP0Form } from '../components/travel/TravelP0Form';
import { useWebSocket, useTravelEvents } from '../hooks/useWebSocket';
import { useEffect, useState } from 'react';
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
                setShowCelebration(true);
                setTimeout(() => {
                    setShowCelebration(false);
                    // 跳转到最新的旅行详情页面
                    if (travels.length > 0) {
                        window.location.href = `/travel/${travels[0].id}`;
                    }
                }, 5000); // Hide after 5s and navigate
            }
            setPrevStatus(frogData?.status || null);
            setFrog(frogData);
            if (frogData) setCurrentFrog(frogData);

            // 直接从青蛙数据中提取已完成的旅行历史
            if (frogData?.travels) {
                setTravels(frogData.travels.filter((t: TravelDetail) => t.status === 'Completed'));
            }
            if (frogData?.status === 'Traveling') {
                try {
                    const response = await apiService.get(`/travels/${tokenId}/active`);
                    if (response.success && response.data) {
                        const travelData = response.data;
                        setActiveTravel({
                            ...travelData,
                            startTime: new Date(travelData.startTime).toISOString(),
                            endTime: new Date(travelData.endTime).toISOString(),
                            completed: travelData.status === 'Completed'
                        });
                    } else {
                        // 如果没有活跃旅行数据，但状态是Traveling，可能是数据延迟
                        // 只在没有现有活跃旅行时才重试，避免重复调用
                        if (!activeTravel) {
                            setTimeout(() => {
                                if (frog?.status === 'Traveling' && !activeTravel) {
                                    fetchData();
                                }
                            }, 2000);
                        }
                    }
                } catch (error) {
                    console.error('获取活跃旅行失败:', error);
                    // 只在没有现有活跃旅行时才重试
                    if (!activeTravel) {
                        setTimeout(() => {
                            if (frog?.status === 'Traveling' && !activeTravel) {
                                fetchData();
                            }
                        }, 3000);
                    }
                }
            } else {
                setActiveTravel(null);
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

    // 监听旅行事件
    useEffect(() => {
        if (travelEvent) {
            switch (travelEvent.type) {
                case 'started':
                    console.log('旅行开始事件:', travelEvent.data);
                    // 延迟一点时间再获取数据，确保后端状态已更新
                    setTimeout(fetchData, 1000);
                    break;
                case 'progress':
                    console.log('旅行进度事件:', travelEvent.data);
                    break;
                case 'completed':
                    console.log('旅行完成事件:', travelEvent.data);
                    fetchData().then(() => {
                        // 跳转到旅行详情页面，使用后端返回的旅行ID
                        window.location.href = `/travel/${travelEvent.data.travelId}`;
                    });
                    break;
            }
        }
    }, [travelEvent]);

    useEffect(() => {
        const handleTravelCompleted = () => {
            fetchData().then(() => {
                // 如果有完成的旅行，跳转到详情页面
                if (travels.length > 0) {
                    const latestTravel = travels[0];
                    window.location.href = `/travel/${latestTravel.id}`;
                }
            });
        };

        const handleTravelStarted = (event: any) => {
            const { frogId, targetWallet, duration, chainId } = event.detail;
            if (frogId === tokenId) {
                // 立即创建临时旅行状态
                const now = new Date();
                const endTime = new Date(now.getTime() + duration * 1000);
                
                setActiveTravel({
                    id: 0, // 临时ID，等待后端更新
                    tokenId: tokenId,
                    frogId: 0, // 临时ID，等待后端更新
                    startTime: now.toISOString(),
                    endTime: endTime.toISOString(),
                    targetWallet: targetWallet,
                    chainId: chainId,
                    status: 'Active',
                    completed: false,
                });
                
                // 立即刷新青蛙数据
                fetchData();
            }
        };

        window.addEventListener('travel:completed', handleTravelCompleted);
        window.addEventListener('travel:started', handleTravelStarted);
        
        return () => {
            window.removeEventListener('travel:completed', handleTravelCompleted);
            window.removeEventListener('travel:started', handleTravelStarted);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenId]);

    useEffect(() => {
        if (frog?.status === 'Traveling' && activeTravel && !activeTravel.completed) {
            const checkInterval = setInterval(() => {
                const now = Date.now();
                const endTime = new Date(activeTravel.endTime).getTime();

                // 只有在旅行结束超过5秒后才检查
                if (now >= endTime + 5000) {
                    clearInterval(checkInterval); // 先清除定时器避免重复调用
                    fetchData();
                }
            }, 5000);

            return () => clearInterval(checkInterval);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frog?.status, activeTravel, tokenId]);

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
                                    <TravelStatus travel={activeTravel} frogName={frog.name} />
                                ) : (
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