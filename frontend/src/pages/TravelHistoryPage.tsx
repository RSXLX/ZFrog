// frontend/src/pages/TravelHistoryPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { TravelResult } from '../components/travel/TravelResult';
import { EmptyTravels } from '../components/common/EmptyState';
import { AnimatedNumber } from '../components/common/MicroInteractions';
import { apiService } from '../services/api';
import { useAccount } from 'wagmi';
import { 
    Clock, 
    MapPin, 
    BookOpen, 
    Trophy, 
    Compass, 
    Calendar, 
    ArrowLeft, 
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Map
} from 'lucide-react';
import clsx from 'clsx';

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
                    className="mb-6 relative z-10"
                >
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-white/90 hover:text-white transition-colors group"
                    >
                        <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 backdrop-blur-sm transition-all">
                            <ArrowLeft size={20} />
                        </div>
                        <span className="font-exo font-medium">Back to Home</span>
                    </button>
                </motion.div>

                {/* 标题 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10 relative"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-400/20 rounded-full blur-3xl -z-10" />
                    <h1 className="text-5xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-500 mb-3 drop-shadow-sm">
                        Travel Journal
                    </h1>
                    <p className="text-gray-600 font-exo text-lg">
                        Adventures across the multiverse
                    </p>
                </motion.div>

                {/* 筛选器 */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-end mb-8"
                >
                    <div className="flex items-center bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-shadow">
                        <Filter size={18} className="text-green-600 mr-2" />
                        <span className="text-sm font-semibold text-gray-700 mr-3">Filter Frog:</span>
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
                            className="bg-transparent border-none focus:ring-0 text-gray-800 font-medium cursor-pointer outline-none font-exo"
                        >
                            <option value="all">🐸 All Frogs</option>
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
                            icon={<Map size={32} />}
                            label="Total Trips"
                            value={stats.totalTrips}
                            color="from-blue-500 to-indigo-600"
                        />
                        <StatCard
                            icon={<BookOpen size={32} />}
                            label="Discoveries"
                            value={stats.totalDiscoveries}
                            color="from-purple-500 to-fuchsia-600"
                        />
                        <StatCard
                            icon={<Trophy size={32} />}
                            label="Rare Finds"
                            value={stats.rareFinds}
                            color="from-amber-400 to-orange-500"
                        />
                        <StatCard
                            icon={<Compass size={32} />}
                            label="Chains Visited"
                            value={Object.entries({
                                bsc: stats.bscTrips,
                                eth: stats.ethTrips,
                                zeta: stats.zetaTrips,
                            }).filter(([_, count]) => count > 0).length}
                            color="from-emerald-400 to-teal-600"
                        />
                    </motion.div>
                )}

                {/* 链分布 */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/40 backdrop-blur-md rounded-3xl p-8 mb-8 border border-white/30 shadow-sm"
                    >
                        <h3 className="text-xl font-orbitron font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <MapPin className="text-green-500" />
                            Exploration Footprint
                        </h3>
                        <div className="space-y-4">
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
                                    <div key={chain} className="flex items-center space-x-4 group">
                                        <div className="text-2xl p-2 bg-white/50 rounded-xl shadow-sm">{config.icon}</div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-exo font-semibold text-gray-700">
                                                    {config.name}
                                                </span>
                                                <span className="text-sm font-bg font-bold text-gray-600 bg-white/40 px-2 py-0.5 rounded-lg">
                                                    {count} Trips
                                                </span>
                                            </div>
                                            <div className="h-3 bg-gray-100/50 rounded-full overflow-hidden border border-white/20">
                                                <motion.div
                                                    className={`h-full bg-gradient-to-r ${config.color} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 0.8, ease: "easeOut" }}
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
                    <h3 className="text-xl font-orbitron font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock className="text-blue-500" />
                        Recent Journeys
                    </h3>
                    
                    {(!travels || travels.length === 0) ? (
                        <EmptyTravels onStartTravel={() => navigate('/')} />
                    ) : (
                        travels.map((travel, index) => {
                            const chainIdToKey: Record<number, keyof typeof chainConfig> = {
                                97: 'BSC_TESTNET',
                                11155111: 'ETH_SEPOLIA',
                                7001: 'ZETACHAIN_ATHENS',
                            };
                            const chain = chainConfig[chainIdToKey[travel.chainId] || 'ZETACHAIN_ATHENS'];
                            
                            // 优先从 journal 对象获取内容，如果没有则从 journalContent 获取
                            const journalTitle = travel.journal?.title || `Journey #${travel.id}`;
                            const journalContent = travel.journal?.content || travel.journalContent || travel.diary || '';
                            const journalMood = travel.journal?.mood || travel.diaryMood || 'happy';
                            
                            return (
                                <motion.div
                                    key={travel.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * index }}
                                    whileHover={{ x: 5, scale: 1.01 }}
                                    className="bg-white/60 backdrop-blur-md rounded-2xl p-5 cursor-pointer hover:bg-white/80 transition-all border border-white/40 shadow-sm hover:shadow-md group"
                                    onClick={() => handleTravelClick(travel)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="text-3xl p-3 bg-white/60 rounded-2xl shadow-sm border border-white/30">
                                                {chain?.icon || '🌍'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-exo font-bold text-gray-800 text-lg group-hover:text-green-600 transition-colors">
                                                        {chain?.name || 'Unknown Realm'}
                                                    </p>
                                                    {travel.frog && (
                                                        <span className="text-xs px-2 py-0.5 bg-green-100/80 text-green-700 font-bold rounded-lg border border-green-200">
                                                            {travel.frog.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-medium text-gray-700 text-sm mb-1 bg-white/30 inline-block px-2 py-0.5 rounded-md">
                                                    {journalTitle}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 font-exo">
                                                    {travel.exploredBlock && (
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                                            Block #{travel.exploredBlock}
                                                        </span>
                                                    )}
                                                    {travel.completedAt && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {new Date(travel.completedAt).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {journalMood && (
                                                <span className="text-2xl filter drop-shadow-sm hover:scale-110 transition-transform cursor-help" title={`Mood: ${journalMood}`}>
                                                    {moodEmojis[journalMood.toLowerCase()] || moodEmojis[journalMood.toUpperCase()] || '😊'}
                                                </span>
                                            )}
                                            <ChevronRight className="text-gray-400 group-hover:text-green-500 transition-colors" />
                                        </div>
                                    </div>
                                    
                                    {/* 纪念品展示 (如果有) */}
                                    {travel.souvenir && (
                                        <div className="mt-3 ml-16 p-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 flex items-center gap-3 w-fit">
                                            {(() => {
                                                const sId = travel.souvenir.tokenId;
                                                const imgUrl = sId ? souvenirImages[sId] : null;
                                                return imgUrl ? (
                                                    <img src={imgUrl} className="w-8 h-8 rounded-md object-cover shadow-sm" alt="" />
                                                ) : (
                                                    <span className="text-xl">🎁</span>
                                                );
                                            })()}
                                            <div>
                                                <p className="text-xs font-bold text-purple-700">{travel.souvenir.name}</p>
                                                <p className="text-[10px] text-purple-500 uppercase tracking-wider font-bold">{travel.souvenir.rarity}</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {journalContent && (
                                        <p className="mt-3 ml-16 text-sm text-gray-600 line-clamp-2 italic border-l-2 border-green-300 pl-3">
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
                        className="flex justify-center mt-10 gap-4"
                    >
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="p-2 bg-white/40 hover:bg-white/60 disabled:opacity-30 disabled:hover:bg-white/40 rounded-xl transition-all border border-white/30 backdrop-blur-sm"
                        >
                            <ChevronLeft />
                        </button>
                        <span className="flex items-center px-6 bg-white/40 rounded-xl font-orbitron font-bold text-gray-700 border border-white/30 backdrop-blur-sm shadow-sm">
                            {page} <span className="mx-2 text-gray-400">/</span> {Math.ceil(total / pageSize)}
                        </span>
                        <button
                            disabled={page >= Math.ceil(total / pageSize)}
                            onClick={() => setPage(page + 1)}
                            className="p-2 bg-white/40 hover:bg-white/60 disabled:opacity-30 disabled:hover:bg-white/40 rounded-xl transition-all border border-white/30 backdrop-blur-sm"
                        >
                            <ChevronRight />
                        </button>
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
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white text-center shadow-lg relative overflow-hidden group`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                {icon}
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <div className="text-3xl mb-2 opacity-90 drop-shadow-sm">{icon}</div>
                <div className="text-3xl font-orbitron font-bold tracking-tight">
                    <AnimatedNumber value={value} />
                </div>
                <div className="text-xs font-exo uppercase tracking-wider opacity-80 mt-1">{label}</div>
            </div>
        </motion.div>
    );
}