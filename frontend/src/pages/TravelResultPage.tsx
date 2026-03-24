// frontend/src/pages/TravelResultPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TravelResult } from '../components/travel/TravelResult';
import { TravelStatus } from '../components/travel/TravelStatus';
import { Button } from '../components/common/Button';
import type { DiaryMood, Frog, Travel } from '../types';
import { useI18n } from '../i18n';
import { travelFeatureApi, type TravelV1ReadModel } from '../features/travel/api';
import { memoryPalaceApi, type MemoryPalaceLite } from '../features/memory-palace/api';

const toLegacyTravelStatus = (rawStatus?: string): Travel['status'] => {
    const status = (rawStatus || '').toUpperCase();
    if (status === 'ACTIVE') return 'Active';
    if (status === 'PROCESSING') return 'Processing';
    if (status === 'COMPLETED') return 'Completed';
    if (status === 'CANCELLED') return 'Cancelled';
    if (status === 'FAILED') return 'Failed';
    return 'Active';
};

const isActiveTravel = (status?: string): boolean =>
    (status || '').toUpperCase() === 'ACTIVE';

const isCompletedTravel = (status?: string): boolean =>
    (status || '').toUpperCase() === 'COMPLETED';

const normalizeDiaryMood = (raw?: string): DiaryMood | undefined => {
    const mood = (raw || '').toUpperCase();
    if (['HAPPY', 'CURIOUS', 'SURPRISED', 'PEACEFUL', 'EXCITED', 'SLEEPY'].includes(mood)) {
        return mood as DiaryMood;
    }
    return undefined;
};

const toFrogStatus = (rawStatus?: string): Frog['status'] => {
    if (rawStatus === 'Idle') return 'Idle';
    if (rawStatus === 'Traveling') return 'Traveling';
    if (rawStatus === 'CrossChainLocked') return 'CrossChainLocked';
    if (rawStatus === 'Returning') return 'Returning';
    return 'Traveling';
};

const adaptV1Travel = (raw: TravelV1ReadModel): Travel => {
    const id = Number(raw?.id ?? raw?.travelId ?? 0);
    const discoveries = Array.isArray(raw?.discoveries)
        ? raw.discoveries.map((item) => ({
              type: item?.type || 'fun_fact',
              title: item?.title || '链上发现',
              description: item?.description || '',
              rarity: Number(item?.rarity || 1),
          }))
        : [];

    const normalizedFrog: Frog | undefined = raw?.frogId
        ? {
              id: Number(raw?.frog?.id ?? raw.frogId),
              tokenId: Number(raw?.frog?.tokenId ?? raw.tokenId ?? 0),
              name: raw?.frog?.name || raw.frogName || 'Your Frog',
              ownerAddress:
                  raw?.frog?.ownerAddress ||
                  raw.walletAddress ||
                  '0x0000000000000000000000000000000000000000',
              birthday: raw?.frog?.birthday ? new Date(raw.frog.birthday) : new Date(),
              totalTravels: Number(raw?.frog?.totalTravels || 0),
              status: toFrogStatus(raw?.frog?.status),
          }
        : undefined;

    return {
        ...raw,
        id,
        frogId: Number(raw?.frogId ?? 0),
        targetWallet: raw?.targetWallet || '0x0000000000000000000000000000000000000000',
        targetChain: raw?.targetChain as any,
        chainId: Number(raw?.chainId ?? 7001),
        startTime: raw?.startTime || new Date().toISOString(),
        endTime: raw?.endTime || new Date().toISOString(),
        completedAt: raw?.completedAt || null,
        status: toLegacyTravelStatus(raw?.status),
        currentStage: raw?.currentStage as any,
        diary: raw?.diary || raw?.journal?.content || undefined,
        diaryMood: normalizeDiaryMood(raw?.diaryMood || raw?.journal?.mood || undefined),
        exploredSnapshot: raw?.exploredSnapshot || { discoveries },
        frog: normalizedFrog,
    } as Travel;
};

export function TravelResultPage() {
    const { tr } = useI18n();
    const { travelId } = useParams<{ travelId: string }>();
    const navigate = useNavigate();
    
    const [travel, setTravel] = useState<Travel | null>(null);
    const [memoryPalace, setMemoryPalace] = useState<MemoryPalaceLite | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!travelId) {
            navigate('/');
            return;
        }

        let isCancelled = false;
        let interval: ReturnType<typeof setInterval> | null = null;

        const fetchMemoryPalace = async (frogId: number) => {
            try {
                if (isCancelled) return;
                const memory = await memoryPalaceApi.getByFrogId(frogId);
                if (isCancelled) return;
                setMemoryPalace(memory);
            } catch {
                if (isCancelled) return;
                setMemoryPalace(null);
            }
        };

        const fetchTravel = async () => {
            try {
                setLoading(true);
                const travel = await travelFeatureApi.getById(travelId);
                
                if (isCancelled) return;

                const adapted = adaptV1Travel(travel);
                setTravel(adapted);
                if (isCompletedTravel(adapted.status) && adapted.frogId) {
                    void fetchMemoryPalace(adapted.frogId);
                } else {
                    setMemoryPalace(null);
                }
                
                // 如果旅行还在进行中，定期刷新状态
                if (isActiveTravel(adapted.status)) {
                    interval = setInterval(async () => {
                        if (isCancelled) return;
                        try {
                            const refreshedTravel = await travelFeatureApi.getById(travelId);
                            const refreshed = adaptV1Travel(refreshedTravel);
                            setTravel(refreshed);
                            if (isCompletedTravel(refreshed.status) && interval) {
                                clearInterval(interval);
                                interval = null;
                                if (refreshed.frogId) {
                                    void fetchMemoryPalace(refreshed.frogId);
                                }
                            }
                        } catch (err) {
                            console.error('Failed to refresh travel status:', err);
                        }
                    }, 5000); // 每5秒刷新一次
                }
            } catch (err: any) {
                if (isCancelled) return;
                setError(err.message || 'Failed to load');
            } finally {
                if (isCancelled) return;
                setLoading(false);
            }
        };

        void fetchTravel();

        return () => {
            isCancelled = true;
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [travelId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="text-6xl"
                >
                    🐸
                </motion.div>
            </div>
        );
    }

    if (error || !travel) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={() => navigate('/')}>
                        {tr('返回首页', 'Back to Home')}
                    </Button>
                </div>
            </div>
        );
    }

    // 旅行进行中
    if (isActiveTravel(travel.status)) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 p-4">
                <div className="max-w-2xl mx-auto pt-8">
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
                            <span>{tr('返回首页', 'Back to Home')}</span>
                        </Button>
                    </motion.div>

                    {/* 旅行状态 */}
                    <TravelStatus
                        travel={travel}
                        frogName={tr('你的青蛙', 'Your Frog')}
                    />

                    {/* 提示信息 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 bg-white/50 backdrop-blur rounded-xl p-6 text-center"
                    >
                        <p className="text-gray-700">
                            {tr('🐸 青蛙正在探索中...', '🐸 Your frog is exploring...')}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            {tr('旅行结束后会自动刷新，请耐心等待~', 'This page refreshes automatically when travel completes.')}
                        </p>
                    </motion.div>
                </div>
            </div>
        );
    }

    // 旅行完成
    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 p-4">
            <div className="max-w-4xl mx-auto pt-8">
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
                        <span>{tr('返回首页', 'Back to Home')}</span>
                    </Button>
                </motion.div>

                {/* 成功标题 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
              
                </motion.div>

                {/* 旅行结果 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <TravelResult
                        travel={travel}
                        frogName={tr('你的青蛙', 'Your Frog')}
                        diary={travel.diary || undefined}
                        diaryMood={travel.diaryMood || undefined}
                        souvenir={travel.souvenirData || undefined}
                        discoveries={travel.exploredSnapshot?.discoveries || []}
                        memoryPalace={memoryPalace}
                    />
                </motion.div>

                {memoryPalace && travel.frogId ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-center"
                    >
                        <p className="text-sm text-indigo-700">
                            {tr(
                                '旅行结果已沉淀到记忆空间，继续进入完整回忆视图。',
                                'This trip has been distilled into your memory palace. Continue to the full memory view.'
                            )}
                        </p>
                        <Button
                            variant="primary"
                            className="mt-3"
                            onClick={() => navigate(`/memory-palace/${travel.frogId}`)}
                        >
                            {tr('进入记忆空间', 'Open Memory Palace')}
                        </Button>
                    </motion.div>
                ) : null}

                {/* 操作按钮 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <Button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center space-x-2"
                        variant="primary"
                    >
                        <span>🎒</span>
                        <span>{tr('再次出发', 'Start Another Trip')}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/travel-detail/${travel.id}`)}
                        className="flex items-center justify-center space-x-2"
                    >
                        <span>📖</span>
                        <span>{tr('查看日记详情', 'View Journal Details')}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/travel-history')}
                        className="flex items-center justify-center space-x-2"
                    >
                        <span>📚</span>
                        <span>{tr('所有日记', 'All Journals')}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/badges')}
                        className="flex items-center justify-center space-x-2"
                    >
                        <span>🏆</span>
                        <span>{tr('我的徽章', 'My Badges')}</span>
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
