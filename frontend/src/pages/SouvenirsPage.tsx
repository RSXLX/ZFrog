import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMyFrog } from '../hooks/useMyFrog';
import { rewardFeatureApi } from '../features/reward/api';
import { Loading } from '../components/common/Loading';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SouvenirDisplay {
    id: string | number;
    tokenId?: number;
    name: string;
    description: string;
    rarity: string;
    type: string;
    emoji?: string;
    imageUrl?: string;
    ipfsHash?: string;
    sourceChain?: string;
    date: Date;
    travelId?: number;
}

const rarityConfig: Record<string, { color: string, label: string }> = {
    Common: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: '普通' },
    Uncommon: { color: 'bg-green-100 text-green-800 border-green-200', label: '罕见' },
    Rare: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: '稀有' },
    Epic: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: '史诗' },
    Legendary: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: '传说' },
};

export function SouvenirsPage() {
    const navigate = useNavigate();
    const { frog, loading: frogLoading, isConnected, hasFrog } = useMyFrog();
    const [souvenirs, setSouvenirs] = useState<SouvenirDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSouvenir, setSelectedSouvenir] = useState<SouvenirDisplay | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!frog) {
                setIsLoading(false);
                return;
            }
            
            try {
                setIsLoading(true);
                const allSouvenirs: SouvenirDisplay[] = [];
                
                const souvenirData = await rewardFeatureApi.getSouvenirs(frog.tokenId);
                
                if (souvenirData && Array.isArray(souvenirData)) {
                    souvenirData.forEach((souvenir: any) => {
                        allSouvenirs.push({
                            id: souvenir.id,
                            name: souvenir.name,
                            description: `${souvenir.rarity} 纪念品`,
                            rarity: souvenir.rarity,
                            type: 'NFT',
                            emoji: '🎁',
                            imageUrl: souvenir.metadataUri,
                            date: new Date(souvenir.mintedAt || souvenir.createdAt),
                            travelId: souvenir.travelId || 0
                        });
                    });
                }
                
                setSouvenirs(allSouvenirs.sort((a, b) => b.date.getTime() - a.date.getTime()));
                
                // 异步获取图片状态
                allSouvenirs.forEach(async (s) => {
                    try {
                        const statusRes = await rewardFeatureApi.getSouvenirImageStatus(s.id.toString());
                        if (statusRes.success && statusRes.record) {
                            const displayUrl = statusRes.record.gatewayUrl || statusRes.record.imageUrl;
                            if (displayUrl) {
                                setSouvenirs(prev => prev.map(item => 
                                    item.id === s.id ? { ...item, imageUrl: displayUrl } : item
                                ));
                            }
                        }
                    } catch {
                        // 忽略错误
                    }
                });
            } catch (error) {
                console.error('Failed to fetch souvenirs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!frogLoading) {
            fetchData();
        }
    }, [frog, frogLoading]);

    // 未连接钱包
    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔗</div>
                    <h2 className="text-xl font-bold text-gray-700">请先连接钱包</h2>
                    <p className="text-gray-500 mt-2">连接钱包后查看你的纪念品收藏</p>
                </div>
            </div>
        );
    }

    // 没有青蛙
    if (!frogLoading && !hasFrog) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🐸</div>
                    <h2 className="text-xl font-bold text-gray-700">还没有青蛙</h2>
                    <p className="text-gray-500 mt-2 mb-4">先铸造一只青蛙开始收集纪念品吧！</p>
                    <Link to="/?mint=true" className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        🎉 立即铸造
                    </Link>
                </div>
            </div>
        );
    }

    if (frogLoading || isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loading /></div>;
    }

    return (
        <div className="min-h-screen pb-12">
            <div className="max-w-6xl mx-auto px-4">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-white rounded-full transition-colors"
                        >
                            ←
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">纪念品收藏</h1>
                            <p className="text-gray-500">
                                {frog?.name} 的冒险珍藏 ({souvenirs.length})
                            </p>
                        </div>
                    </div>
                </div>

                {souvenirs.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">🎒</div>
                        <h2 className="text-xl font-bold text-gray-700">背囊空空如也</h2>
                        <p className="text-gray-400 mt-2">派 {frog?.name} 出去旅行，它会带回有趣的礼物哦！</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {souvenirs.map((s) => (
                            <motion.div
                                key={s.id}
                                layoutId={`souvenir-${s.id}`}
                                onClick={() => setSelectedSouvenir(s)}
                                whileHover={{ y: -5 }}
                                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 group"
                            >
                                <div className="aspect-square rounded-xl bg-gray-50 mb-4 flex items-center justify-center overflow-hidden relative">
                                    {s.imageUrl ? (
                                        <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-5xl group-hover:scale-110 transition-transform">
                                            {s.emoji || '🎁'}
                                        </span>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${rarityConfig[s.rarity]?.color || rarityConfig.Common.color}`}>
                                            {rarityConfig[s.rarity]?.label || s.rarity}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-800 truncate">{s.name}</h3>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-400">{s.sourceChain}</span>
                                    <span className="text-[10px] text-gray-300">
                                        {format(s.date, 'yyyy-MM-dd')}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* 详情弹窗 */}
            <AnimatePresence>
                {selectedSouvenir && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedSouvenir(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            layoutId={`souvenir-${selectedSouvenir.id}`}
                            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl"
                        >
                            <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                                {selectedSouvenir.imageUrl ? (
                                    <img src={selectedSouvenir.imageUrl} alt={selectedSouvenir.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-9xl">{selectedSouvenir.emoji || '🎁'}</span>
                                )}
                                <button 
                                    onClick={() => setSelectedSouvenir(null)}
                                    className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${rarityConfig[selectedSouvenir.rarity]?.color || rarityConfig.Common.color}`}>
                                        {rarityConfig[selectedSouvenir.rarity]?.label || selectedSouvenir.rarity}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        {format(selectedSouvenir.date, 'PPP', { locale: zhCN })}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedSouvenir.name}</h2>
                                <p className="text-gray-600 leading-relaxed italic border-l-4 border-gray-100 pl-4 mb-6">
                                    "{selectedSouvenir.description}"
                                </p>
                                
                                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🌐</span>
                                        <div className="text-xs">
                                            <p className="text-gray-400">发现于</p>
                                            <p className="font-bold text-gray-700">{selectedSouvenir.sourceChain || 'ZetaChain'}</p>
                                        </div>
                                    </div>
                                    {selectedSouvenir.travelId && (
                                        <button 
                                            onClick={() => navigate(`/travel/${selectedSouvenir.travelId}`)}
                                            className="px-6 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-100"
                                        >
                                            回顾这次旅行
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
