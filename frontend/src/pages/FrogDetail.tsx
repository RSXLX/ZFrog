import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FrogPet } from '../components/frog/FrogPet';
import { TravelForm } from '../components/travel/TravelForm';
import { TravelStatus } from '../components/travel/TravelStatus';
import { TravelJournal } from '../components/travel/TravelJournal';
import { Loading } from '../components/common/Loading';
import { useWebSocket } from '../hooks/useWebSocket';
import { useEffect, useState } from 'react';
import { apiService, type Frog } from '../services/api';

interface Travel {
    id: number;
    startTime: string;
    endTime: string;
    targetWallet: string;
    status: string;
    completed: boolean;
    journal?: {
        title: string;
        content: string;
        mood: string;
        highlights: string[];
    };
    souvenir?: {
        name: string;
        rarity: string;
    };
}

export function FrogDetail() {
    const { id } = useParams<{ id: string }>();
    const tokenId = parseInt(id || '0');

    const [frog, setFrog] = useState<Frog | null>(null);
    const [activeTravel, setActiveTravel] = useState<Travel | null>(null);
    const [travels, setTravels] = useState<Travel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);
    const [prevStatus, setPrevStatus] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const frogData = await apiService.getFrogDetail(tokenId);

            // Check for status transition: Traveling -> Idle
            if (prevStatus === 'Traveling' && frogData?.status === 'Idle') {
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 5000); // Hide after 5s
            }
            setPrevStatus(frogData?.status || null);
            setFrog(frogData);

            // 获取旅行历史
            const historyData = await apiService.getFrogsTravels(tokenId);
            setTravels(historyData.filter((t: Travel) => t.status === 'Completed')); // 仅显示已完成的旅行

            if (frogData?.status === 'Traveling') {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/travels/${tokenId}/active`);
                if (response.ok) {
                    const travelData = await response.json();
                    setActiveTravel({
                        ...travelData,
                        startTime: travelData.startTime,
                        endTime: travelData.endTime,
                        completed: travelData.status === 'Completed'
                    });
                }
            } else {
                setActiveTravel(null);
            }
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenId]);

    useWebSocket();

    useEffect(() => {
        const handleTravelCompleted = () => {
            fetchData();
        };

        window.addEventListener('travel:completed', handleTravelCompleted);
        return () => {
            window.removeEventListener('travel:completed', handleTravelCompleted);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenId]);

    useEffect(() => {
        if (frog?.status === 'Traveling' && activeTravel && !activeTravel.completed) {
            const checkInterval = setInterval(() => {
                const now = Date.now();
                const endTime = new Date(activeTravel.endTime).getTime();

                if (now >= endTime + 5000) {
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
                    <p className="text-gray-500">找不到 ID 为 {tokenId} 的青蛙</p>
                </div>
            </div>
        );
    }

    return (
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
                            <p className="text-xl">{frog.name} 旅行归来啦！</p>
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
                        <FrogPet name={frog.name} status={frog.status} />
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-800">{frog.name}</h1>
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
                    {/* 左侧: 旅行状态或表单 */}
                    <div>
                        {frog.status === 'Traveling' && activeTravel ? (
                            <TravelStatus travel={activeTravel} frogName={frog.name} />
                        ) : (
                            <TravelForm
                                frogId={tokenId}
                                frogName={frog.name}
                                onSuccess={fetchData}
                            />
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
    );
}