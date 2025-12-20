// frontend/src/pages/BadgesPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { apiService } from '../services/api';
import { useFrogStore } from '../stores/frogStore';


interface Badge {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    rarity: number;
    isHidden: boolean;
    unlocked: boolean;
    unlockedAt?: string;
}

const rarityColors = {
    1: 'border-gray-300 bg-gray-50',
    2: 'border-green-300 bg-green-50',
    3: 'border-blue-300 bg-blue-50',
    4: 'border-purple-300 bg-purple-50',
    5: 'border-yellow-300 bg-yellow-50',
};

const rarityStars = {
    1: '⭐',
    2: '⭐⭐',
    3: '⭐⭐⭐',
    4: '⭐⭐⭐⭐',
    5: '⭐⭐⭐⭐⭐',
};

export function BadgesPage() {
    const navigate = useNavigate();
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

    const { frogId } = useParams<{ frogId: string }>();
    const { currentFrog } = useFrogStore();

    useEffect(() => {
        const fetchBadges = async () => {
            const idToFetch = frogId || currentFrog?.id?.toString();
            if (!idToFetch) return;
            
            try {
                setLoading(true);
                const response = await apiService.get(`/badges/${idToFetch}`);
                
                if (response.success) {
                    setBadges(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch badges:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBadges();
    }, [currentFrog]);

    const filteredBadges = badges.filter(badge => {
        if (filter === 'all') return true;
        if (filter === 'unlocked') return badge.unlocked;
        if (filter === 'locked') return !badge.unlocked;
        return true;
    });

    const unlockedCount = badges.filter(b => b.unlocked).length;
    const totalCount = badges.length;

    if (!currentFrog && !frogId) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex flex-col items-center justify-center p-4">
                <div className="text-6xl mb-4">🐸</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">请先选择一只青蛙</h2>
                <Button onClick={() => navigate('/my-frogs')} variant="primary">
                    去我的青蛙
                </Button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="text-6xl"
                >
                    🏆
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

                {/* 标题和统计 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-bold text-green-600 mb-2">
                        🏆 我的徽章
                    </h1>
                    <p className="text-gray-700 mb-4">
                        收集旅行徽章，记录你的探险成就！
                    </p>
                    <div className="inline-flex items-center space-x-4 bg-white/50 backdrop-blur rounded-full px-6 py-3">
                        <span className="text-2xl">🎯</span>
                        <span className="font-medium text-gray-700">
                            已解锁: {unlockedCount} / {totalCount}
                        </span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* 筛选标签 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-center mb-8"
                >
                    <div className="inline-flex rounded-lg border border-white/50 bg-white/30 backdrop-blur p-1">
                        {[
                            { key: 'all', label: '全部', count: totalCount },
                            { key: 'unlocked', label: '已解锁', count: unlockedCount },
                            { key: 'locked', label: '未解锁', count: totalCount - unlockedCount },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key as any)}
                                className={`px-4 py-2 rounded-md transition-all ${
                                    filter === tab.key
                                        ? 'bg-white text-gray-800 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* 徽章网格 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                >
                    {filteredBadges.map((badge, index) => (
                        <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * index }}
                            whileHover={{ y: -5 }}
                            className={`relative rounded-2xl border-2 p-6 text-center transition-all ${
                                badge.unlocked
                                    ? rarityColors[badge.rarity as keyof typeof rarityColors]
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                        >
                            {/* 锁定状态 */}
                            {!badge.unlocked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 rounded-2xl">
                                    <span className="text-4xl">🔒</span>
                                </div>
                            )}

                            {/* 徽章图标 */}
                            <div className="text-5xl mb-3">
                                {badge.unlocked ? badge.icon : '❓'}
                            </div>

                            {/* 徽章名称 */}
                            <h3 className={`font-bold mb-2 ${
                                badge.unlocked ? 'text-gray-800' : 'text-gray-500'
                            }`}>
                                {badge.unlocked ? badge.name : '???'}
                            </h3>

                            {/* 徽章描述 */}
                            <p className={`text-sm mb-3 ${
                                badge.unlocked ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                                {badge.unlocked ? badge.description : '完成特定条件解锁'}
                            </p>

                            {/* 稀有度星级 */}
                            {badge.unlocked && (
                                <div className="flex justify-center mb-2">
                                    <span className="text-sm">
                                        {rarityStars[badge.rarity as keyof typeof rarityStars]}
                                    </span>
                                </div>
                            )}

                            {/* 解锁时间 */}
                            {badge.unlocked && badge.unlockedAt && (
                                <p className="text-xs text-gray-500">
                                    解锁于 {new Date(badge.unlockedAt).toLocaleDateString()}
                                </p>
                            )}
                        </motion.div>
                    ))}
                </motion.div>

                {/* 空状态 */}
                {filteredBadges.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <p className="text-gray-600 mb-4">
                            {filter === 'locked' 
                                ? '太棒了！你已经解锁了所有徽章！🎉'
                                : '还没有徽章，快去旅行收集吧！🐸'
                            }
                        </p>
                        {filter !== 'locked' && (
                            <Button onClick={() => navigate('/')} variant="primary">
                                                        开始旅行
                                                    </Button>                        )}
                    </motion.div>
                )}

                {/* 提示信息 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center text-sm text-gray-600"
                >
                    <p>💡 提示：通过旅行、探索不同链、发现稀有物品来解锁更多徽章！</p>
                </motion.div>
            </div>
        </div>
    );
}