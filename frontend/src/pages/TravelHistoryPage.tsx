// frontend/src/pages/TravelHistoryPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { TravelResult } from '../components/travel/TravelResult';
import { apiService } from '../services/api';
import { useAccount } from 'wagmi';

interface Travel {
    id: number;
    frogId: number;
    targetChain: string;
    targetWallet: string;
    chainId: number;
    status: string;
    exploredBlock?: string;
    exploredTimestamp?: string;
    diary?: string;
    diaryMood?: string;
    journalContent?: string | null;
    journal?: {
        title: string;
        content: string;
        mood: string;
        highlights: string[];
    } | null;
    souvenir?: {
        name: string;
        rarity: string;
        tokenId?: number;
    } | null;
    completedAt?: string;
    frog?: {
        name: string;
        tokenId: number;
    };
    discoveries?: any[];
}

interface TravelStats {
    totalTrips: number;
    bscTrips: number;
    ethTrips: number;
    zetaTrips: number;
    totalDiscoveries: number;
    rareFinds: number;
}

const chainConfig = {
    BSC_TESTNET: { name: 'BSC 测试网', icon: '🟡', color: 'from-yellow-400 to-orange-500' },
    ETH_SEPOLIA: { name: '以太坊 Sepolia', icon: '💎', color: 'from-blue-400 to-purple-500' },
    ZETACHAIN_ATHENS: { name: 'ZetaChain Athens', icon: '⚡', color: 'from-green-400 to-emerald-500' },
};

const moodEmojis: Record<string, string> = {
    happy: '😊',
    excited: '🤩',
    thoughtful: '🤔',
    adventurous: '🧗',
    tired: '😴',
    HAPPY: '😊',
    CURIOUS: '🤔',
    SURPRISED: '😲',
    PEACEFUL: '😌',
    EXCITED: '🤗',
    SLEEPY: '😴',
};

interface Frog {
    id: number;
    tokenId: number;
    name: string;
}

export function TravelHistoryPage() {
    const navigate = useNavigate();
    const { address } = useAccount();
    const [travels, setTravels] = useState<Travel[]>([]);
    const [stats, setStats] = useState<TravelStats | null>(null);
    const [frogs, setFrogs] = useState<Frog[]>([]);
    const [selectedFrogId, setSelectedFrogId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
    const [souvenirImages, setSouvenirImages] = useState<Record<string, string>>({});
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const fId = params.get('frogId') || 'all';
        setSelectedFrogId(fId);
        if (address) {
            fetchFrogs();
            fetchData(fId === 'all' ? null : fId);
        }
    }, [page, address, selectedFrogId]);

    const fetchFrogs = async () => {
        if (!address) return;
        try {
            const frog = await apiService.getMyFrog(address);
            setFrogs(frog ? [frog] : []);
        } catch (error) {
            console.error('Failed to fetch frogs:', error);
        }
    };

    const fetchData = async (fId?: string | null) => {
        if (!address) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            
            // 获取旅行历史
            const params: any = { 
                address,
                limit: pageSize, 
                offset: (page - 1) * pageSize 
            };
            // 只有当选择了特定青蛙时才添加frogId参数
            if (fId) {
                params.frogId = fId;
            }
            
            const travelsResponse = await apiService.get('/travels/history', {
                params
            });
            
            // 获取统计数据
            const statsParams: any = { address };
            if (fId && fId !== 'all') {
                statsParams.frogId = fId;
            }
            const statsResponse = await apiService.get('/travels/stats', {
                params: statsParams
            });
            
            if (travelsResponse.success && travelsResponse.data) {
                const fetchedTravels = travelsResponse.data.travels || [];
                setTravels(fetchedTravels);
                setTotal(travelsResponse.data.total || 0);

                // 异步获取纪念品图片
                fetchedTravels.forEach(async (t: any) => {
                    const sId = t.souvenir?.tokenId || (t.souvenirData ? `p0-${t.id}` : null);
                    if (sId) {
                        try {
                            const res = await apiService.getSouvenirImageStatus(sId.toString());
                            if (res.success && res.record) {
                                const url = res.record.gatewayUrl || res.record.imageUrl;
                                if (url) {
                                    setSouvenirImages(prev => ({ ...prev, [sId]: url }));
                                }
                            }
                        } catch (e) {}
                    }
                });
            } else {
                setTravels([]);
                setTotal(0);
            }
            
            if (statsResponse.success && statsResponse.data) {
                setStats(statsResponse.data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            // 确保在错误情况下也初始化状态
            setTravels([]);
            setTotal(0);
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    const handleTravelClick = (travel: Travel) => {
        navigate(`/travel-detail/${travel.id}`);
    };

    const closeModal = () => {
        setSelectedTravel(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="text-6xl"
                >
                    📖
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 p-4">
            <div className="max-w-6xl mx-auto">
                {/* 返回按钮 */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-6"
                >
                    <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-2"
                    >
                        <span>←</span>
                        <span>返回首页</span>
                    </Button>
                </motion.div>

                {/* 标题 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-bold text-green-600 mb-2">
                        📖 旅行日记
                    </h1>
                    <p className="text-gray-700">
                        记录青蛙的每一次探险故事
                    </p>
                </motion.div>

                {/* 筛选器 */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-end mb-6"
                >
                    <div className="flex items-center space-x-2 bg-white/50 backdrop-blur p-2 rounded-xl border border-white/20">
                        <span className="text-sm font-medium text-gray-700 mr-2">筛选青蛙:</span>
                        <select 
                            value={selectedFrogId}
                            onChange={(e) => {
                                const newId = e.target.value;
                                setSelectedFrogId(newId);
                                setPage(1);
                                const url = new URL(window.location.href);
                                if (newId && newId !== 'all') url.searchParams.set('frogId', newId);
                                else url.searchParams.delete('frogId');
                                window.history.replaceState({}, '', url);
                            }}
                            className="bg-transparent border-none focus:ring-0 text-gray-800 font-medium cursor-pointer"
                        >
                            <option value="all">🐸 所有青蛙</option>
                            {frogs.map(frog => (
                                <option key={frog.id} value={frog.tokenId}>
                                    🐸 {frog.name} (#{frog.tokenId})
                                </option>
                            ))}
                        </select>
                    </div>
                </motion.div>

                {/* 统计卡片 */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                    >
                        <StatCard
                            icon="🎒"
                            label="总旅行次数"
                            value={stats.totalTrips}
                            color="from-blue-400 to-blue-600"
                        />
                        <StatCard
                            icon="✨"
                            label="总发现"
                            value={stats.totalDiscoveries}
                            color="from-purple-400 to-purple-600"
                        />
                        <StatCard
                            icon="💎"
                            label="稀有发现"
                            value={stats.rareFinds}
                            color="from-yellow-400 to-yellow-600"
                        />
                        <StatCard
                            icon="🏆"
                            label="访问链数"
                            value={Object.entries({
                                bsc: stats.bscTrips,
                                eth: stats.ethTrips,
                                zeta: stats.zetaTrips,
                            }).filter(([_, count]) => count > 0).length}
                            color="from-green-400 to-green-600"
                        />
                    </motion.div>
                )}

                {/* 链分布 */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/50 backdrop-blur rounded-2xl p-6 mb-8"
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-4">探索足迹</h3>
                        <div className="space-y-3">
                            {Object.entries({
                                BSC_TESTNET: stats.bscTrips,
                                ETH_SEPOLIA: stats.ethTrips,
                                ZETACHAIN_ATHENS: stats.zetaTrips,
                            }).map(([chain, count]) => {
                                const config = chainConfig[chain as keyof typeof chainConfig];
                                if (!config) return null;
                                
                                const percentage = stats.totalTrips > 0 
                                    ? (count / stats.totalTrips) * 100 
                                    : 0;
                                
                                return (
                                    <div key={chain} className="flex items-center space-x-3">
                                        <span className="text-2xl">{config.icon}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-medium text-gray-700">
                                                    {config.name}
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    {count} 次
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={`h-full bg-gradient-to-r ${config.color}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 0.5 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* 旅行列表 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-4"
                >
                    <h3 className="text-lg font-bold text-gray-800">最近的旅行</h3>
                    
                    {(!travels || travels.length === 0) ? (
                        <div className="text-center py-12 bg-white/50 backdrop-blur rounded-2xl">
                            <p className="text-gray-600 mb-4">还没有旅行记录</p>
                            <Button onClick={() => navigate('/')} variant="primary">
                                                        开始第一次旅行
                                                    </Button>                        </div>
                    ) : (
                        travels.map((travel, index) => {
                            const chainIdToKey: Record<number, keyof typeof chainConfig> = {
    97: 'BSC_TESTNET',
    11155111: 'ETH_SEPOLIA',
    7001: 'ZETACHAIN_ATHENS',
};
const chain = chainConfig[chainIdToKey[travel.chainId] || 'ZETACHAIN_ATHENS'];
                            
                            // 优先从 journal 对象获取内容，如果没有则从 journalContent 获取
                            const journalTitle = travel.journal?.title || `旅行 #${travel.id}`;
                            const journalContent = travel.journal?.content || travel.journalContent || travel.diary || '';
                            const journalMood = travel.journal?.mood || travel.diaryMood || 'happy';
                            
                            return (
                                <motion.div
                                    key={travel.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * index }}
                                    whileHover={{ x: 5 }}
                                    className="bg-white/50 backdrop-blur rounded-xl p-4 cursor-pointer hover:bg-white/70 transition-all"
                                    onClick={() => handleTravelClick(travel)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-3">
                                            <span className="text-2xl">{chain?.icon || '🌍'}</span>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-medium text-gray-800">
                                                        {chain?.name || '未知链'}
                                                    </p>
                                                    {travel.frog && (
                                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                                            {travel.frog.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-medium text-gray-700 text-sm">
                                                    {journalTitle}
                                                </p>
                                                {travel.exploredBlock && (
                                                    <p className="text-sm text-gray-600">
                                                        区块 #{travel.exploredBlock}
                                                    </p>
                                                )}
                                                {travel.completedAt && (
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(travel.completedAt).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                            {journalMood && (
                                                <span className="text-xl">
                                                    {moodEmojis[journalMood.toLowerCase()] || moodEmojis[journalMood.toUpperCase()] || '😊'}
                                                </span>
                                            )}
                                            {travel.souvenir && (
                                                <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded overflow-hidden">
                                                    {(() => {
                                                        const sId = travel.souvenir.tokenId;
                                                        const imgUrl = sId ? souvenirImages[sId] : null;
                                                        return imgUrl ? (
                                                            <img src={imgUrl} className="w-4 h-4 rounded-sm object-cover" alt="" />
                                                        ) : (
                                                            <span>🎁</span>
                                                        );
                                                    })()}
                                                    <span className="text-xs font-medium">{travel.souvenir.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {journalContent && (
                                        <p className="mt-2 text-sm text-gray-600 line-clamp-2 italic">
                                            "{journalContent}"
                                        </p>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </motion.div>

                {/* 分页 */}
                {total > pageSize && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-center mt-8 space-x-2"
                    >
                        <Button
                            variant="outline"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            上一页
                        </Button>
                        <span className="flex items-center px-4 text-gray-600">
                            {page} / {Math.ceil(total / pageSize)}
                        </span>
                        <Button
                            variant="outline"
                            disabled={page >= Math.ceil(total / pageSize)}
                            onClick={() => setPage(page + 1)}
                        >
                            下一页
                        </Button>
                    </motion.div>
                )}

                {/* 旅行详情模态框 */}
                {selectedTravel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    旅行详情
                                </h2>
                                <Button variant="primary" onClick={closeModal}>
                                    ✕
                                </Button>
                            </div>
                            
                            <TravelResult
                                // @ts-ignore
                                travel={selectedTravel}
                                frogName={selectedTravel.frog?.name || "你的青蛙"}
                                discoveries={selectedTravel.discoveries || (selectedTravel as any).exploredSnapshot?.discoveries || []}
                                diary={selectedTravel.journal?.content || selectedTravel.journalContent || selectedTravel.diary}
                                diaryMood={(selectedTravel.journal?.mood || selectedTravel.diaryMood || 'HAPPY') as any}
                                souvenir={selectedTravel.souvenir || (selectedTravel as any).souvenirData}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: {
    icon: string;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white text-center shadow-lg`}
        >
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm opacity-90">{label}</div>
        </motion.div>
    );
}