// frontend/src/pages/TravelResultPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TravelResult } from '../components/travel/TravelResult';
import { TravelStatus } from '../components/travel/TravelStatus';
import { Button } from '../components/common/Button';
import { apiService } from '../services/api';
import type { Travel } from '../types';

export function TravelResultPage() {
    const { travelId } = useParams<{ travelId: string }>();
    const navigate = useNavigate();
    
    const [travel, setTravel] = useState<Travel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!travelId) {
            navigate('/');
            return;
        }

        const fetchTravel = async () => {
            try {
                setLoading(true);
                
                // 首先尝试获取 P0 旅行数据
                let response = await apiService.get(`/travels/p0/${travelId}`);
                
                // 如果 P0 接口失败，尝试获取普通旅行数据
                if (!response.success) {
                    response = await apiService.get(`/travels/journal/${travelId}`);
                }
                
                if (response.success || response.data) {
                    setTravel(response.data);
                    
                    // 如果旅行还在进行中，定期刷新状态
                    if (response.data.status === 'Active') {
                        const interval = setInterval(async () => {
                            try {
                                let refreshResponse = await apiService.get(`/travels/p0/${travelId}`);
                                if (!refreshResponse.success) {
                                    refreshResponse = await apiService.get(`/travels/journal/${travelId}`);
                                }
                                
                                if (refreshResponse.success || refreshResponse.data) {
                                    setTravel(refreshResponse.data);
                                    if (refreshResponse.data.status === 'Completed') {
                                        clearInterval(interval);
                                    }
                                }
                            } catch (err) {
                                console.error('Failed to refresh travel status:', err);
                            }
                        }, 5000); // 每5秒刷新一次
                        
                        return () => clearInterval(interval);
                    }
                } else {
                    setError('找不到旅行记录');
                }
            } catch (err: any) {
                setError(err.message || '加载失败');
            } finally {
                setLoading(false);
            }
        };

        fetchTravel();
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
                        返回首页
                    </Button>
                </div>
            </div>
        );
    }

    // 旅行进行中
    if (travel.status === 'Active') {
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
                            <span>返回首页</span>
                        </Button>
                    </motion.div>

                    {/* 旅行状态 */}
                    <TravelStatus
                        travel={travel}
                        frogName="你的青蛙"
                    />

                    {/* 提示信息 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 bg-white/50 backdrop-blur rounded-xl p-6 text-center"
                    >
                        <p className="text-gray-700">
                            🐸 青蛙正在探索中...
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            旅行结束后会自动刷新，请耐心等待~
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
                        <span>返回首页</span>
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
                        frogName="你的青蛙"
                        diary={travel.diary || undefined}
                        diaryMood={travel.diaryMood || undefined}
                        souvenir={travel.souvenirData || undefined}
                        discoveries={travel.exploredSnapshot?.discoveries || []}
                    />
                </motion.div>

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
                        <span>再次出发</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/travel-detail/${travel.id}`)}
                        className="flex items-center justify-center space-x-2"
                    >
                        <span>📖</span>
                        <span>查看日记详情</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/travel-history')}
                        className="flex items-center justify-center space-x-2"
                    >
                        <span>📚</span>
                        <span>所有日记</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/badges')}
                        className="flex items-center justify-center space-x-2"
                    >
                        <span>🏆</span>
                        <span>我的徽章</span>
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}