import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isAddress } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '../common/Button';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';
import { LANDMARKS } from '../../config/landmarks';

interface TravelP0FormProps {
    frogId: number;
    frogName: string;
    onSuccess?: () => void;
}

const DURATION_OPTIONS = [
    { label: '1 分钟', value: 60 },
    { label: '30 分钟', value: 1800 },
    { label: '1 小时', value: 3600 },
    { label: '6 小时', value: 21600 },
];

const CHAIN_MAPPING: Record<string, number> = {
    'BSC_TESTNET': 97,
    'ETH_SEPOLIA': 11155111,
    'ZETACHAIN_ATHENS': 7001
};

export function TravelP0Form({ frogId, frogName, onSuccess }: TravelP0FormProps) {
    const [travelType, setTravelType] = useState<'RANDOM' | 'SPECIFIC'>('RANDOM');
    const [targetChain, setTargetChain] = useState<string>('');
    const [duration, setDuration] = useState(3600);
    const [error, setError] = useState('');

    const {
        data: hash,
        writeContract,
        isPending,
        error: writeError,
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const handleStartTravel = async () => {
        setError('');

        try {
            if (!ZETAFROG_ADDRESS) {
                setError('合约地址未配置');
                return;
            }

            // 1. 确定链 Key 和 ID
            let chainKey: string = 'ZETACHAIN_ATHENS';
            if (travelType === 'RANDOM') {
                const keys = Object.keys(CHAIN_MAPPING);
                chainKey = keys[Math.floor(Math.random() * keys.length)];
            } else if (targetChain) {
                chainKey = targetChain;
            }
            const selectedChainId = CHAIN_MAPPING[chainKey];

            // 2. 确定目标地址：随机模式使用零地址作为标记，指定模式使用随机地标
            let targetAddress = '0x0000000000000000000000000000000000000000';
            
            if (travelType === 'SPECIFIC') {
                const landmarks = LANDMARKS[selectedChainId] || [];
                if (landmarks.length > 0) {
                    targetAddress = landmarks[Math.floor(Math.random() * landmarks.length)].address;
                }
            }

            console.log('发起全链旅行:', {
                frogId,
                targetAddress,
                duration,
                selectedChainId,
                isRandom: travelType === 'RANDOM'
            });

            (writeContract as any)({
                address: ZETAFROG_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'startTravel',
                args: [BigInt(frogId), targetAddress as `0x${string}`, BigInt(duration), BigInt(selectedChainId)],
            });

        } catch (err: any) {
            console.error('Start travel failed:', err);
            setError(err.message || '发起失败，请重试');
        }
    };

    useEffect(() => {
        if (isSuccess && onSuccess) {
            // 立即触发一次刷新
            onSuccess();
            
            // 触发全局事件通知其他组件，前端可以先使用临时状态
            window.dispatchEvent(new CustomEvent('travel:started', { 
                detail: { 
                    frogId, 
                    timestamp: Date.now(), 
                    targetWallet: travelType === 'RANDOM' ? '0x0000000000000000000000000000000000000000' : 
                     (LANDMARKS[CHAIN_MAPPING[targetChain || 'ZETACHAIN_ATHENS']]?.[Math.floor(Math.random() * (LANDMARKS[CHAIN_MAPPING[targetChain || 'ZETACHAIN_ATHENS']]?.length || 1))]?.address || '0x0000000000000000000000000000000000000000'), 
                    duration, 
                    chainId: travelType === 'RANDOM' ? Object.values(CHAIN_MAPPING)[Math.floor(Math.random() * Object.values(CHAIN_MAPPING).length)] : CHAIN_MAPPING[targetChain || 'ZETACHAIN_ATHENS'],
                    isRandom: travelType === 'RANDOM'
                } 
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
    }, [isSuccess, onSuccess, frogId, duration, travelType, targetChain]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 space-y-6 max-w-md mx-auto"
        >
            {/* 标题 */}
            <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    🐸 让{frogName}出门旅行
                </h3>
                <p className="text-gray-600">
                    背上小书包，去探索区块链的世界！
                </p>
            </div>

            {/* 旅行方式选择 */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                    选择旅行方式
                </label>
                
                <div className="space-y-2">
                    {/* 随机旅行（推荐） */}
                    <button
                        onClick={() => setTravelType('RANDOM')}
                        className={`w-full p-4 rounded-xl border-2 transition-all ${
                            travelType === 'RANDOM'
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">🎲</span>
                                <div className="text-left">
                                    <p className="font-medium">随机旅行</p>
                                    <p className="text-sm text-gray-500">
                                        青蛙自己决定去哪探险
                                    </p>
                                </div>
                            </div>
                            {travelType === 'RANDOM' && (
                                <span className="text-green-600 text-sm font-medium">
                                    推荐
                                </span>
                            )}
                        </div>
                    </button>

                    {/* 指定链旅行 */}
                    <button
                        onClick={() => setTravelType('SPECIFIC')}
                        className={`w-full p-4 rounded-xl border-2 transition-all ${
                            travelType === 'SPECIFIC'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">📍</span>
                            <div className="text-left">
                                <p className="font-medium">指定去某条链</p>
                                <p className="text-sm text-gray-500">
                                    选择青蛙探索的目标链
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* 条件显示：链选择 */}
            {travelType === 'SPECIFIC' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                >
                    <label className="block text-sm font-medium text-gray-700">
                        选择目标链
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { key: 'BSC_TESTNET', name: 'BSC 测试网', icon: '🟡' },
                            { key: 'ETH_SEPOLIA', name: '以太坊 Sepolia', icon: '💎' },
                            { key: 'ZETACHAIN_ATHENS', name: 'ZetaChain Athens', icon: '⚡' },
                        ].map((chain) => (
                            <button
                                key={chain.key}
                                onClick={() => setTargetChain(chain.key)}
                                className={`p-3 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                                    targetChain === chain.key
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <span className="text-xl">{chain.icon}</span>
                                <span className="font-medium">{chain.name}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* 随机旅行（原有的逻辑中并没有指定时长，现在全链化后需要指定） */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                    预计旅行时长
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setDuration(opt.value)}
                            className={`p-2 rounded-lg border text-sm transition-all ${
                                duration === opt.value
                                    ? 'border-green-500 bg-green-50 text-green-700 font-bold'
                                    : 'border-gray-200 text-gray-600'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 错误提示 */}
            {(error || writeError) && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"
                >
                    {error || writeError?.message}
                </motion.div>
            )}

            {/* 出发按钮 */}
            <Button
                onClick={handleStartTravel}
                disabled={isPending || isConfirming || (travelType === 'SPECIFIC' && !targetChain)}
                className="w-full"
                size="lg"
                variant="primary"
            >
                {isPending ? (
                    '请在钱包确认...'
                ) : isConfirming ? (
                    <span className="flex items-center space-x-2">
                        <span className="animate-spin">⏳</span>
                        <span>广播交易中...</span>
                    </span>
                ) : (
                    <span className="flex items-center space-x-2">
                        <span>🚀</span>
                        <span>一键出发</span>
                    </span>
                )}
            </Button>

            {/* 提示信息 */}
            <div className="text-center text-xs text-gray-500 space-y-1">
                <p>全链随机模式会自动为您挑选有趣的探索地</p>
                <p>完成后将产生真实的链上纪念品 NFT 🎁</p>
            </div>
        </motion.div>
    );
}