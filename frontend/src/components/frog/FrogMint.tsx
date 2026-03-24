// frontend/src/components/frog/FrogMint.tsx

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { decodeEventLog } from 'viem';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';
import { Button } from '../common/Button';
import { frogFeatureApi } from '../../features/frog/api';
import { useI18n } from '../../i18n';

interface FrogMintProps {
    onSuccess?: () => void;
}

export function FrogMint({ onSuccess }: FrogMintProps) {
    const { tr } = useI18n();
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

        // 验证名字（合约用 bytes 长度校验，需与链上一致）
        const nameBytes = new TextEncoder().encode(name).length;
        if (nameBytes < 2 || nameBytes > 16) {
            setError(tr('名字需要 2-16 字节（中文字符占 3 字节）', 'Name must be 2-16 bytes (Chinese chars count as 3 bytes)'));
            return;
        }

        // 检查合约地址是否配置
        if (!ZETAFROG_ADDRESS) {
            setError(tr('合约地址未配置，请检查环境变量', 'Contract address is missing. Please check environment variables.'));
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
            setError(tr('铸造失败，请重试', 'Mint failed, please try again.'));
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
                            await frogFeatureApi.syncFrog(tokenId);
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
                <p className="text-gray-500">{tr('请先连接钱包', 'Please connect your wallet first')}</p>
            </div>
        );
    }

    // 如果合约地址未配置，显示提示
    if (!ZETAFROG_ADDRESS) {
        return (
            <div className="text-center p-8">
                <p className="text-red-500">{tr(
                    '合约地址未配置，请检查 .env 文件中的 VITE_ZETAFROG_ADDRESS',
                    'Contract address is missing. Please check VITE_ZETAFROG_ADDRESS in .env'
                )}</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto"
        >
            <h2 className="text-2xl font-bold text-center mb-6">{tr('🐸 铸造你的 ZetaFrog', '🐸 Mint Your ZetaFrog')}</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {tr('给你的青蛙起个名字', 'Give your frog a name')}
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={tr('2-16 字节（英文1字节，中文3字节）', '2-16 bytes (English 1 byte, Chinese 3 bytes)')}
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
                    {isPending ? tr('确认交易中...', 'Confirming transaction...') :
                        isConfirming ? tr('铸造中...', 'Minting...') :
                            tr('🐸 铸造青蛙', '🐸 Mint Frog')}
                </Button>

                {isSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center p-4 bg-green-50 rounded-xl"
                    >
                        <p className="text-green-600 font-medium">{tr('🎉 恭喜！', '🎉 Success!')}</p>
                        <p className="text-sm text-green-500">
                            {tr('你的 ZetaFrog "{name}" 已经铸造成功！', 'Your ZetaFrog "{name}" has been minted!', { name })}
                        </p>
                    </motion.div>
                )}

                <p className="text-xs text-gray-400 text-center">
                    {tr('铸造免费！只需支付 Gas 费用。', 'Minting is free. You only pay gas fees.')}
                </p>
            </div>
        </motion.div>
    );
}
