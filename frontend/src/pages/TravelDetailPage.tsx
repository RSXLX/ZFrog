import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { apiService } from '../services/api';
import { ExplorationList } from '../components/travel/ExplorationList';
import { 
    ArrowLeft, 
    MapPin, 
    Calendar, 
    Clock, 
    Hash, 
    Globe, 
    BookOpen, 
    Award, 
    Share2, 
    Sparkles, 
    Zap,
    Search
} from 'lucide-react';
import clsx from 'clsx';

interface TravelDetail {
    id: number;
    frogId: number;
    targetWallet: string;
    chainId: number;
    status: string;
    startTime: string;
    endTime: string;
    completedAt?: string;
    exploredBlock?: string;
    exploredTimestamp?: string;
    exploredSnapshot?: any;
    journal?: {
        title: string;
        content: string;
        mood: string;
        highlights: string[];
    };
    souvenir?: {
        name: string;
        rarity: string;
        description?: string;
        tokenId?: number;
    };
    discoveries?: Array<{
        title: string;
        description: string;
        rarity: number;
        type: string;
    }>;
    frog?: {
        name: string;
        tokenId: number;
    };
}

const chainConfig = {
    97: { name: 'BSC 测试网', icon: '🟡', color: 'from-yellow-400 to-orange-500' },
    11155111: { name: '以太坊 Sepolia', icon: '💎', color: 'from-blue-400 to-purple-500' },
    7001: { name: 'ZetaChain Athens', icon: '⚡', color: 'from-green-400 to-emerald-500' },
};

const rarityColors = {
    Common: 'border-gray-300 bg-gray-50',
    Uncommon: 'border-green-300 bg-green-50',
    Rare: 'border-blue-300 bg-blue-50',
    Epic: 'border-purple-300 bg-purple-50',
    Legendary: 'border-yellow-300 bg-yellow-50',
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

export function TravelDetailPage() {
    const { travelId } = useParams<{ travelId: string }>();
    const navigate = useNavigate();
    const [travel, setTravel] = useState<TravelDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const [souvenirImageUrl, setSouvenirImageUrl] = useState<string | undefined>();

    useEffect(() => {
        if (travelId) {
            fetchTravelDetail(travelId);
        }
    }, [travelId]);

    useEffect(() => {
        if (travel?.souvenir) {
            const sId = (travel.souvenir as any).tokenId || 
                         ((travel as any).souvenirData ? `p0-${travel.id}` : null);
            
            if (sId) {
                apiService.getSouvenirImageStatus(sId.toString())
                    .then(res => {
                        if (res.success && res.record) {
                            setSouvenirImageUrl(res.record.gatewayUrl || res.record.imageUrl);
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [travel]);

    const fetchTravelDetail = async (id: string) => {
        try {
            setLoading(true);
            // 先尝试获取P0旅行详情
            const response = await apiService.get(`/travels/p0/${id}`);
            if (response.success && response.data) {
                // P0数据已经包含了解析后的journal和souvenir
                setTravel(response.data);
            } else {
                // 如果P0失败，尝试获取普通旅行详情
                const journalResponse = await apiService.get(`/travels/journal/${id}`);
                if (journalResponse.success) {
                    // 获取基础旅行信息
                    const historyResponse = await apiService.get(`/travels/history?limit=100`);
                    if (historyResponse.success) {
                        const baseTravel = historyResponse.data.travels.find((t: any) => t.id === parseInt(id));
                        if (baseTravel) {
                            setTravel({
                                ...baseTravel,
                                journal: journalResponse.data.journal,
                                souvenir: journalResponse.data.souvenir,
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch travel detail:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="text-6xl"
                >
                    ✈️
                </motion.div>
            </div>
        );
    }

    if (!travel) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex flex-col items-center justify-center p-4">
                <div className="text-6xl mb-4">🤔</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">找不到这次旅行</h2>
                <Button onClick={() => navigate('/travel-history')} variant="primary">
                    返回旅行历史
                </Button>
            </div>
        );
    }

    const chain = chainConfig[travel.chainId as keyof typeof chainConfig] || chainConfig[7001];

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 p-4">
            <div className="max-w-4xl mx-auto">
                {/* 返回按钮 */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8 relative z-10"
                >
                    <button
                        onClick={() => navigate('/travel-history')}
                        className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors group bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/40 shadow-sm"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-exo font-semibold">Back to History</span>
                    </button>
                </motion.div>

                {/* 旅行标题 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10 relative"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-green-300/20 rounded-full blur-[60px] -z-10" />
                    <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-500 mb-4 drop-shadow-sm">
                        {travel.journal?.title || 'Adventure Log'}
                    </h1>
                    
                    <div className="flex flex-wrap items-center justify-center gap-3 text-gray-700">
                        <span className="flex items-center gap-2 bg-white/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/40 shadow-sm">
                            <span className="text-2xl">{chain.icon}</span>
                            <span className="font-exo font-bold">{chain.name}</span>
                        </span>
                        
                        {travel.frog && (
                            <span className="flex items-center gap-2 bg-green-100/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-green-200 shadow-sm text-green-800">
                                <span className="font-bold">{travel.frog.name}</span>
                                <span className="text-xs bg-green-200 px-1.5 py-0.5 rounded-md font-mono">#{travel.frog.tokenId}</span>
                            </span>
                        )}
                        
                        {travel.completedAt && (
                            <span className="flex items-center gap-2 bg-white/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/40 shadow-sm text-gray-600 font-exo text-sm">
                                <Calendar size={14} />
                                {new Date(travel.completedAt).toLocaleString()}
                            </span>
                        )}
                    </div>
                </motion.div>

                {/* 主要内容 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 左侧：旅行日记 */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/40 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5">
                                <BookOpen size={120} />
                            </div>
                            
                            <h2 className="text-2xl font-orbitron font-bold text-gray-800 mb-6 flex items-center gap-3 relative z-10">
                                <BookOpen className="text-indigo-500" />
                                Travel Journal
                            </h2>
                            
                            {travel.journal ? (
                                <>
                                    <div className="flex items-center justify-between mb-6 bg-white/40 p-4 rounded-2xl border border-white/20">
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl filter drop-shadow-md animate-bounce-slow">
                                                {moodEmojis[travel.journal.mood.toLowerCase()] || '😊'}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Frog's Mood</span>
                                                <span className="text-lg font-exo font-bold text-gray-800 capitalize">
                                                    {travel.journal.mood}
                                                </span>
                                            </div>
                                        </div>
                                        <button className="text-gray-400 hover:text-indigo-500 transition-colors">
                                            <Share2 size={20} />
                                        </button>
                                    </div>
                                    
                                    <div className="prose prose-lg max-w-none mb-8">
                                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed font-exo">
                                            {travel.journal.content}
                                        </p>
                                    </div>

                                    {travel.journal.highlights && travel.journal.highlights.length > 0 && (
                                        <div className="mt-8 bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-100">
                                            <h3 className="text-lg font-bold text-amber-700 mb-4 flex items-center gap-2">
                                                <Sparkles className="text-amber-500" size={20} />
                                                Highlights
                                            </h3>
                                            <ul className="space-y-3">
                                                {travel.journal.highlights.map((highlight, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <span className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                                                        <span className="text-gray-700 font-medium">{highlight}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 italic">No journal entry found for this adventure...</p>
                                </div>
                            )}
                        </div>

                        {/* 链上探索记录 */}
                        <div className="mt-8">
                             <h3 className="text-xl font-orbitron font-bold text-gray-800 mb-4 flex items-center gap-2 px-2">
                                <Zap className="text-yellow-500" />
                                On-Chain Activity
                            </h3>
                            <ExplorationList 
                                travelId={parseInt(travelId || '0')} 
                                className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/30"
                            />
                        </div>
                    </motion.div>

                    {/* 右侧：信息面板 */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-6"
                    >
                        {/* 旅行信息 */}
                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/40 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-lg font-orbitron font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Globe size={20} className="text-blue-500" />
                                Details
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-gray-100/50">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <MapPin size={16} />
                                        <span className="font-exo text-sm">Target</span>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-gray-800 bg-gray-100/80 px-2 py-1 rounded-md">
                                        {travel.targetWallet.slice(0, 6)}...{travel.targetWallet.slice(-4)}
                                    </span>
                                </div>
                                {travel.exploredBlock && (
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100/50">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Hash size={16} />
                                            <span className="font-exo text-sm">Block</span>
                                        </div>
                                        <span className="text-sm font-mono text-gray-700">#{travel.exploredBlock}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Award size={16} />
                                        <span className="font-exo text-sm">Status</span>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                        travel.status === 'Completed' 
                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                    }`}>
                                        {travel.status === 'Completed' ? 'COMPLETED' : 'IN PROGRESS'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 纪念品 */}
                        {travel.souvenir && (
                            <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-md rounded-2xl p-6 border border-purple-100/50 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Award size={80} className="text-purple-600" />
                                </div>
                                <h3 className="text-lg font-orbitron font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Award size={20} className="text-purple-500" />
                                    Souvenir
                                </h3>
                                <div className={`rounded-xl border p-4 ${rarityColors[travel.souvenir.rarity as keyof typeof rarityColors]} bg-opacity-60 transition-transform group-hover:scale-[1.02]`}>
                                    {souvenirImageUrl && (
                                        <div className="aspect-square w-full rounded-lg bg-white mb-3 overflow-hidden shadow-sm border border-white/50 flex items-center justify-center">
                                            <img src={souvenirImageUrl} alt={travel.souvenir.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <h4 className="font-bold text-gray-800 mb-1 text-lg">{travel.souvenir.name}</h4>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] uppercase font-bold tracking-widest bg-white/50 px-2 py-0.5 rounded-full text-gray-600">
                                            {travel.souvenir.rarity}
                                        </span>
                                    </div>
                                    {travel.souvenir.description && (
                                        <p className="text-sm text-gray-700 italic border-l-2 border-gray-400/30 pl-3 leading-relaxed">
                                            "{travel.souvenir.description}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 发现 */}
                        {travel.discoveries && travel.discoveries.length > 0 && (
                            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/40 shadow-sm">
                                <h3 className="text-lg font-orbitron font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Search size={20} className="text-orange-500" />
                                    Discoveries
                                </h3>
                                <div className="space-y-4">
                                    {travel.discoveries.map((discovery, index) => (
                                        <div key={index} className="pl-4 border-l-2 border-green-400 hover:bg-white/50 p-2 rounded-r-lg transition-colors">
                                            <h4 className="font-bold text-gray-800 text-sm">{discovery.title}</h4>
                                            <p className="text-xs text-gray-600 mt-1 leading-snug">{discovery.description}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 rounded uppercase">{discovery.type}</span>
                                                <span className="text-xs text-yellow-500 tracking-[-2px]">{'⭐'.repeat(discovery.rarity)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}