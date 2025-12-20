import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { apiService } from '../services/api';

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
                    className="mb-6"
                >
                    <Button
                        variant="outline"
                        onClick={() => navigate('/travel-history')}
                        className="flex items-center space-x-2"
                    >
                        <span>←</span>
                        <span>返回旅行历史</span>
                    </Button>
                </motion.div>

                {/* 旅行标题 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-bold text-green-600 mb-2">
                        {travel.journal?.title || '旅行详情'}
                    </h1>
                    <div className="flex items-center justify-center space-x-4 text-gray-700">
                        <span className="flex items-center space-x-1">
                            <span className="text-2xl">{chain.icon}</span>
                            <span>{chain.name}</span>
                        </span>
                        {travel.frog && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                {travel.frog.name} (#{travel.frog.tokenId})
                            </span>
                        )}
                        {travel.completedAt && (
                            <span className="text-sm text-gray-600">
                                {new Date(travel.completedAt).toLocaleString()}
                            </span>
                        )}
                    </div>
                </motion.div>

                {/* 主要内容 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左侧：旅行日记 */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <div className="bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                                <span className="text-3xl mr-3">📖</span>
                                旅行日记
                            </h2>
                            
                            {travel.journal ? (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-2xl">
                                            {moodEmojis[travel.journal.mood.toLowerCase()] || '😊'}
                                        </span>
                                        <span className="text-sm text-gray-600 capitalize">
                                            心情: {travel.journal.mood}
                                        </span>
                                    </div>
                                    
                                    <div className="prose prose-sm max-w-none">
                                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                            {travel.journal.content}
                                        </p>
                                    </div>

                                    {travel.journal.highlights && travel.journal.highlights.length > 0 && (
                                        <div className="mt-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-3">✨ 精彩瞬间</h3>
                                            <ul className="space-y-2">
                                                {travel.journal.highlights.map((highlight, index) => (
                                                    <li key={index} className="flex items-start space-x-2">
                                                        <span className="text-green-500 mt-1">•</span>
                                                        <span className="text-gray-700">{highlight}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-500 italic">这次旅行没有留下日记...</p>
                            )}
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
                        <div className="bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📍 旅行信息</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">目标钱包:</span>
                                    <span className="text-sm font-mono text-gray-800">
                                        {travel.targetWallet.slice(0, 6)}...{travel.targetWallet.slice(-4)}
                                    </span>
                                </div>
                                {travel.exploredBlock && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">探索区块:</span>
                                        <span className="text-gray-800">#{travel.exploredBlock}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">状态:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        travel.status === 'Completed' 
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {travel.status === 'Completed' ? '已完成' : '进行中'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 纪念品 */}
                        {travel.souvenir && (
                            <div className="bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">🎁 纪念品</h3>
                                <div className={`rounded-lg border-2 p-4 ${rarityColors[travel.souvenir.rarity as keyof typeof rarityColors]} overflow-hidden`}>
                                    {souvenirImageUrl && (
                                        <div className="aspect-square w-full rounded-lg bg-white mb-3 overflow-hidden shadow-inner border border-gray-100 flex items-center justify-center">
                                            <img src={souvenirImageUrl} alt={travel.souvenir.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <h4 className="font-bold text-gray-800 mb-2">{travel.souvenir.name}</h4>
                                    <p className="text-sm text-gray-600 mb-2">
                                        稀有度: {travel.souvenir.rarity}
                                    </p>
                                    {travel.souvenir.description && (
                                        <p className="text-sm text-gray-700 italic border-l-2 border-gray-200 pl-2">
                                            "{travel.souvenir.description}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 发现 */}
                        {travel.discoveries && travel.discoveries.length > 0 && (
                            <div className="bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 发现</h3>
                                <div className="space-y-3">
                                    {travel.discoveries.map((discovery, index) => (
                                        <div key={index} className="border-l-4 border-green-400 pl-3">
                                            <h4 className="font-medium text-gray-800">{discovery.title}</h4>
                                            <p className="text-sm text-gray-600">{discovery.description}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-xs text-gray-500">类型: {discovery.type}</span>
                                                <span className="text-xs text-gray-500">稀有度: {'⭐'.repeat(discovery.rarity)}</span>
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