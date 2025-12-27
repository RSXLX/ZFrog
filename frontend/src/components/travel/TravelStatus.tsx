// frontend/src/components/travel/TravelStatus.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LANDMARKS } from '../../config/landmarks';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { Travel } from '../../types';

export interface TravelStatusProps {
    travel: Travel;
    frogName: string;
}

export function TravelStatus({ travel, frogName }: TravelStatusProps) {
    // 添加调试信息
    console.log('TravelStatus组件渲染，travel数据:', travel);
    
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState<string>('ACTIVE');
    const [message, setMessage] = useState('');
    const [targetAddress, setTargetAddress] = useState<string>('');
    const [isDiscovering, setIsDiscovering] = useState(false);

    const { socket } = useWebSocket();

    useEffect(() => {
        const updateTime = () => {
            const now = Date.now();
            const start = new Date(travel.startTime).getTime();
            const end = new Date(travel.endTime).getTime();
            const total = end - start;
            const elapsed = now - start;
            const remaining = end - now;

            if (remaining <= 0) {
                setTimeRemaining('即将返回...');
                setProgress(100);
                // 旅行结束，但不要在这里触发状态更新，让父组件处理
                return;
            }

            // 计算进度
            const progressPercent = Math.min((elapsed / total) * 100, 100);
            setProgress(progressPercent);

            // 格式化剩余时间
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeRemaining(`${hours}小时 ${minutes}分钟`);
            } else if (minutes > 0) {
                setTimeRemaining(`${minutes}分钟 ${seconds}秒`);
            } else {
                setTimeRemaining(`${seconds}秒`);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [travel.startTime, travel.endTime]);

    // WebSocket 事件监听
    useEffect(() => {
        if (!socket) return;

        // 监听旅行更新
        socket.on('travel:update', (data) => {
            if (data.payload.travelId !== travel.id) return;

            setStage(data.payload.stage);
            setMessage(data.payload.message?.text || '');

            // 处理地址发现阶段
            if (data.payload.stage === 'DISCOVERING') {
                setIsDiscovering(true);
                
                // 从消息中提取地址
                const addressMatch = data.payload.message?.text.match(/0x[a-fA-F0-9]{40}/);
                if (addressMatch) {
                    setTargetAddress(addressMatch[0]);
                    setIsDiscovering(false);
                }
                
                // 从 payload 中直接获取地址
                if (data.payload.message?.address) {
                    setTargetAddress(data.payload.message.address);
                    setIsDiscovering(false);
                }
            }
        });

        // 监听旅行错误
        socket.on('travel:error', (data) => {
            if (data.payload.travelId !== travel.id) return;
            setMessage(data.payload.error || '发生错误');
            setIsDiscovering(false);
        });

        return () => {
            socket.off('travel:update');
            socket.off('travel:error');
        };
    }, [socket, travel.id]);

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-lg p-6 space-y-4"
        >
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                    🌍 {frogName} 正在旅行中...
                </h3>
                <span className="text-2xl animate-bounce">✈️</span>
            </div>

            {/* 进度条 */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                    <span>旅行进度</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {/* 地址发现状态 */}
            {isDiscovering && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="text-2xl"
                        >
                            🎲
                        </motion.div>
                        <div>
                            <p className="font-medium text-purple-800">正在发现目标地址...</p>
                            <p className="text-sm text-purple-600">青蛙正在寻找有趣的探索目标</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 显示发现的地址 */}
            {targetAddress && (
                <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-sm text-green-600 mb-1">发现目标地址：</p>
                    <a 
                        href={`https://etherscan.io/address/${targetAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-green-800 hover:underline"
                    >
                        {targetAddress.slice(0, 6)}...{targetAddress.slice(-4)}
                    </a>
                </div>
            )}

            {/* 消息显示 */}
            {message && (
                <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-800">{message}</p>
                </div>
            )}

            {/* 旅行信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-gray-500">目的地</p>
                    <div className="font-mono font-medium text-gray-800">
                        {(() => {
                            // 如果是随机探索且已发现地址，显示发现的地址
                            if (travel.isRandom && targetAddress) {
                                return shortenAddress(targetAddress);
                            }
                            // 尝试在所有链的推荐地点中查找名称
                            for (const chainId in LANDMARKS) {
                                const found = LANDMARKS[chainId].find(
                                    l => l.address.toLowerCase() === travel.targetWallet.toLowerCase()
                                );
                                if (found) return found.name;
                            }
                            return travel.isRandom ? '🎲 随机探索' : shortenAddress(travel.targetWallet);
                        })()}
                    </div>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-gray-500">剩余时间</p>
                    <p className="font-medium text-gray-800">{timeRemaining}</p>
                </div>
            </div>

            {/* 动画提示 */}
            <div className="text-center text-gray-500 text-sm">
                <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {isDiscovering ? 
                        `🎲 ${frogName} 正在寻找探索目标...` : 
                        `🐸 ${frogName} 正在探索新世界...`
                    }
                </motion.span>
            </div>
        </motion.div>
    );
}