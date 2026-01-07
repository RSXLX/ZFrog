// frontend/src/components/frog/FrogMint.tsx

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { decodeEventLog } from 'viem';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';
import { Button } from '../common/Button';
import { apiService } from '../../services/api';

interface FrogMintProps {
    onSuccess?: () => void;
}

export function FrogMint({ onSuccess }: FrogMintProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const { isConnected } = useAccount();

    const {
        data: hash,
        writeContract,
        isPending,
        error: writeError,
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
        hash,
    });

    const handleMint = async () => {
        setError('');

        // 验证名字
        if (name.length < 2 || name.length > 16) {
            setError('名字需要 2-16 个字符');
            return;
        }

        // 检查合约地址是否配置
        if (!ZETAFROG_ADDRESS) {
            setError('合约地址未配置，请检查环境变量');
            return;
        }

        try {
            // @ts-ignore
            writeContract({
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'mintFrog',
                args: [name],
            });
        } catch (e) {
            setError('铸造失败，请重试');
        }
    };

    // 成功后同步并回调
    useEffect(() => {
        if (isSuccess && receipt && onSuccess) {
            const syncAndNotify = async () => {
                try {
                    // Find FrogMinted log
                    const mintLog = receipt.logs.find(log => {
                        try {
                            const decoded = decodeEventLog({
                                abi: ZETAFROG_ABI,
                                data: log.data,
                                topics: log.topics,
                            }) as any;
                            return decoded.eventName === 'FrogMinted';
                        } catch {
                            return false;
                        }
                    });

                    if (mintLog) {
                        const decoded = decodeEventLog({
                            abi: ZETAFROG_ABI,
                            data: mintLog.data,
                            topics: mintLog.topics,
                        }) as any;

                        if (decoded.eventName === 'FrogMinted') {
                            const args = decoded.args as any;
                            const tokenId = Number(args.tokenId);
                            console.log('Syncing frog:', tokenId);
                            // Trigger backend sync
                            await apiService.syncFrog(tokenId);
                        }
                    }
                } catch (e) {
                    console.error('Error syncing:', e);
                }

                // Call onSuccess after a short delay
                setTimeout(onSuccess, 1500);
            };

            syncAndNotify();
        }
    }, [isSuccess, receipt, onSuccess]);

    if (!isConnected) {
        return (
            <div className="text-center p-8">
                <p className="text-gray-500">请先连接钱包</p>
            </div>
        );
    }

    // 如果合约地址未配置，显示提示
    if (!ZETAFROG_ADDRESS) {
        return (
            <div className="text-center p-8">
                <p className="text-red-500">合约地址未配置，请检查 .env 文件中的 VITE_ZETAFROG_ADDRESS</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto"
        >
            <h2 className="text-2xl font-bold text-center mb-6">🐸 铸造你的 ZetaFrog</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        给你的青蛙起个名字
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="2-16 个字符"
                        maxLength={16}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                        disabled={isPending || isConfirming}
                    />
                </div>

                {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                )}

                {writeError && (
                    <p className="text-red-500 text-sm">{writeError.message}</p>
                )}

                <Button
                    onClick={handleMint}
                    disabled={!name || isPending || isConfirming}
                    className="w-full"
                >
                    {isPending ? '确认交易中...' :
                        isConfirming ? '铸造中...' :
                            '🐸 铸造青蛙'}
                </Button>

                {isSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center p-4 bg-green-50 rounded-xl"
                    >
                        <p className="text-green-600 font-medium">🎉 恭喜！</p>
                        <p className="text-sm text-green-500">
                            你的 ZetaFrog "{name}" 已经铸造成功！
                        </p>
                    </motion.div>
                )}

                <p className="text-xs text-gray-400 text-center">
                    铸造免费！只需支付 Gas 费用。
                </p>
            </div>
        </motion.div>
    );
}