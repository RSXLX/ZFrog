import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { motion } from 'framer-motion';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';
import { Button } from '../common/Button';

interface TravelFormProps {
    frogId: number;
    frogName: string;
    onSuccess?: () => void;
}

const DURATION_OPTIONS = [
    { label: '1 分钟', value: 60, description: '闪电测试' },
    { label: '30 分钟', value: 1800, description: '短暂冒险' },
    { label: '1 小时', value: 3600, description: '快速探索' },
    { label: '6 小时', value: 21600, description: '半日冒险' },
    { label: '24 小时', value: 86400, description: '完整探险' },
];

const CHAIN_OPTIONS = [
    { label: 'Ethereum', value: 1, icon: '💎' },
    { label: 'Polygon', value: 137, icon: '💜' },
    { label: 'BSC', value: 56, icon: '💛' },
    { label: 'ZetaChain', value: 7001, icon: '🟢' },
];

export function TravelForm({ frogId, frogName, onSuccess }: TravelFormProps) {
    const [targetWallet, setTargetWallet] = useState('');
    const [duration, setDuration] = useState(3600);
    const [chainId, setChainId] = useState(1);
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

    const handleStartTravel = () => {
        setError('');

        // 验证地址
        if (!isAddress(targetWallet)) {
            setError('请输入有效的以太坊地址');
            return;
        }

        // 检查合约地址是否已配置
        if (!ZETAFROG_ADDRESS) {
            setError('合约地址未配置');
            return;
        }

        try {
            writeContract({
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'startTravel',
                args: [BigInt(frogId), targetWallet as `0x${string}`, BigInt(duration), BigInt(chainId)],
            });
        } catch (e) {
            setError('发起旅行失败，请重试');
        }
    };

    useEffect(() => {
        if (isSuccess && onSuccess) {
            const timer = setTimeout(onSuccess, 1500);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, onSuccess]);

    // 如果合约未配置，显示提示
    if (!ZETAFROG_ADDRESS) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <p className="text-yellow-800">⚠️ 合约地址未配置，无法发起旅行</p>
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

            {/* 链选择 */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    选择目标链
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {CHAIN_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setChainId(option.value)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                                chainId === option.value
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <span className="text-xl">{option.icon}</span>
                            <span className="ml-2 text-sm">{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 目标钱包输入 */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    目标钱包地址
                </label>
                <input
                    type="text"
                    value={targetWallet}
                    onChange={(e) => setTargetWallet(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500">
                    青蛙将前往这个地址"旅行"
                </p>
            </div>

            {/* 时长选择 */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    旅行时长
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

            {/* 错误提示 */}
            {(error || writeError) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {error || writeError?.message}
                </div>
            )}

            {/* 提交按钮 */}
            <Button
                onClick={handleStartTravel}
                disabled={isPending || isConfirming || !targetWallet}
                className="w-full"
                size="lg"
            >
                {isPending
                    ? '确认交易中...'
                    : isConfirming
                    ? '等待确认...'
                    : '🚀 开始旅行'}
            </Button>

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
}