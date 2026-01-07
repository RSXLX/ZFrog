import { useState, useEffect, memo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { motion } from 'framer-motion';
import { TRAVEL_ADDRESS, TRAVEL_ABI } from '../../config/contracts';
import { Button } from '../common/Button';
import { api } from '../../services/api';

interface TravelFormProps {
    frogId: number;
    frogName: string;
    onSuccess?: () => void;
}

import { LANDMARKS } from '../../config/landmarks';

// 后端随机探险 API
const startRandomTravelAPI = async (frogId: number, duration: number) => {
    const response = await api.post<{
        success: boolean;
        data: { travelId: number; targetChain: string; chainName: string };
        message: string;
    }>('/travels/start', {
        frogId,
        duration,
        travelType: 'RANDOM'
        // 不传 targetChain，让后端随机选择
    });
    return response;
};


const DURATION_OPTIONS = [
    { label: '1 分钟', value: 60, description: '闪电测试' },
    { label: '30 分钟', value: 1800, description: '短暂冒险' },
    { label: '1 小时', value: 3600, description: '快速探索' },
    { label: '6 小时', value: 21600, description: '半日冒险' },
    { label: '24 小时', value: 86400, description: '完整探险' },
];

const CHAIN_OPTIONS = [
    { label: 'Ethereum Sepolia', value: 11155111, icon: '💎' },
    { label: 'Polygon Amoy', value: 80002, icon: '💜' },
    { label: 'BSC Testnet', value: 97, icon: '💛' },
    { label: 'ZetaChain Athens', value: 7001, icon: '🟢' },
];

export const TravelForm = memo(function TravelForm({ frogId, frogName, onSuccess }: TravelFormProps) {
    const [targetWallet, setTargetWallet] = useState('');
    const [duration, setDuration] = useState(3600);
    const [chainId, setChainId] = useState(7001);
    const [error, setError] = useState('');
    const [isRandomLoading, setIsRandomLoading] = useState(false);
    const [randomResult, setRandomResult] = useState<{ chainName: string } | null>(null);

    const {
        data: hash,
        writeContract,
        isPending,
        error: writeError,
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const handleRandomExplore = () => {
        const chainLandmarks = LANDMARKS[chainId];
        if (!chainLandmarks || chainLandmarks.length === 0) {
            // Fallback for chains without curated landmarks
            // Using a generic dummy address or simply alerting
            setError('此链暂无推荐地点，请手动输入');
            return;
        }

        const randomIndex = Math.floor(Math.random() * chainLandmarks.length);
        const landmark = chainLandmarks[randomIndex];
        setTargetWallet(landmark.address);
        
        // You might want to show a toast or some feedback, here we just clear error
        setError(`正在前往: ${landmark.name}`);
    };

    // 一键随机探险 (直接调用合约)
    const handleQuickRandomTravel = async () => {
        setError('');
        setIsRandomLoading(true);
        setRandomResult(null);
        
        try {
            // 1. 本地探索仅支持 ZetaChain，避免随机到不支持的链(如 Amoy)导致 Revert
            const selectedChainId = 7001; 
            setChainId(selectedChainId);
            
            // 如果需要显示链名称
            const chainName = CHAIN_OPTIONS.find(c => c.value === selectedChainId)?.label || 'ZetaChain';

            // 2. 随机旅行目标地址设为零地址 (合约以此判断 isRandom=true)
            const randomWallet = '0x0000000000000000000000000000000000000000';
            setTargetWallet(randomWallet);

            // 3. 发起合约交易
            if (!TRAVEL_ADDRESS) {
                throw new Error('Travel合约地址未配置');
            }

            console.log('发起随机旅行:', {
                frogId,
                targetWallet: randomWallet,
                duration,
                chainId: selectedChainId
            });

            // @ts-ignore
            writeContract({
                address: TRAVEL_ADDRESS,
                abi: TRAVEL_ABI,
                functionName: 'startTravel',
                args: [BigInt(frogId), randomWallet as `0x${string}`, BigInt(duration), BigInt(selectedChainId)],
            });

            setRandomResult({ chainName: chainName });

        } catch (e) {
            console.error('随机探险失败:', e);
            setError(`随机探险失败: ${e instanceof Error ? e.message : '未知错误'}`);
            setIsRandomLoading(false); // 只有失败时才重置loading，成功等待交易回执
        }
    };

    // 监听交易状态以关闭 loading
    useEffect(() => {
        if (writeError) {
             setIsRandomLoading(false);
             setError(writeError.message);
        }
    }, [writeError]);

    // 不需要旧的 handleStartTravel 了 (已整合进 handleQuickRandomTravel 且 UI 中无调用)


    useEffect(() => {
        if (isSuccess && onSuccess) {
            // 立即触发一次刷新
            onSuccess();
            
            // 触发全局事件通知其他组件，前端可以先使用临时状态
            window.dispatchEvent(new CustomEvent('travel:started', { 
                detail: { frogId, timestamp: Date.now(), targetWallet, duration, chainId } 
            }));
            
            // 多次延迟刷新，确保后端数据完全同步
            const timer1 = setTimeout(() => onSuccess(), 1000);
            const timer2 = setTimeout(() => onSuccess(), 3000);
            const timer3 = setTimeout(() => onSuccess(), 5000);
            
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [isSuccess, onSuccess, frogId, targetWallet, duration, chainId]);

    // 如果合约未配置，显示提示
    if (!TRAVEL_ADDRESS) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <p className="text-yellow-800">⚠️ Travel合约地址未配置，无法发起旅行</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 space-y-6"
        >
            <h3 className="text-xl font-bold text-center">
                派 {frogName} 去冒险！🌍
            </h3>

            {/* 时长选择 */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    选择旅行时长
                </label>
                <div className="space-y-2">
                    {DURATION_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setDuration(option.value)}
                            className={`w-full p-3 rounded-lg border-2 transition-all flex justify-between items-center ${
                                duration === option.value
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <span className="font-medium">{option.label}</span>
                            <span className="text-sm text-gray-500">{option.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 一键随机探险 */}
            <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-4">
                <Button
                    onClick={handleQuickRandomTravel}
                    disabled={isRandomLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                    size="lg"
                >
                    {isRandomLoading ? '🎲 随机探险中...' : '🚀 开始随机探险'}
                </Button>
                <p className="text-xs text-gray-600 text-center mt-2">
                    系统将随机选择目标链和有趣地址，开启未知之旅！
                </p>
                {randomResult && (
                    <div className="mt-3 bg-white rounded-lg p-3 text-center">
                        <span className="text-green-600 font-medium">
                            ✨ {frogName} 已出发去 {randomResult.chainName}！
                        </span>
                    </div>
                )}
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* 成功提示 */}
            {isSuccess && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"
                >
                    <p className="text-green-700 font-medium">✈️ {frogName} 出发了！</p>
                    <p className="text-green-600 text-sm mt-1">旅行结束后回来查看吧~</p>
                </motion.div>
            )}
        </motion.div>
    );
});