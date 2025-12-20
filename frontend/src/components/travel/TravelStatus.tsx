// frontend/src/components/travel/TravelStatus.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LANDMARKS } from '../../config/landmarks';
import type { Travel } from '../../types';

export interface TravelStatusProps {
    travel: Travel;
    frogName: string;
}

export function TravelStatus({ travel, frogName }: TravelStatusProps) {
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [progress, setProgress] = useState(0);

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

            {/* 旅行信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-gray-500">目的地</p>
                    <div className="font-mono font-medium text-gray-800">
                        {(() => {
                            // 尝试在所有链的推荐地点中查找名称
                            for (const chainId in LANDMARKS) {
                                const found = LANDMARKS[chainId].find(
                                    l => l.address.toLowerCase() === travel.targetWallet.toLowerCase()
                                );
                                if (found) return found.name;
                            }
                            return shortenAddress(travel.targetWallet);
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
                    🐸 {frogName} 正在探索新世界...
                </motion.span>
            </div>
        </motion.div>
    );
}