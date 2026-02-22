/**
 * 增强版青蛙铸造组件
 * 
 * 集成个性化外观预览功能
 * 功能：
 * - 外观预览 + 重新生成（最多 3 次）
 * - DNA 读取进度条
 * - 稀有度边框展示
 */

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { decodeEventLog } from 'viem';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';
import { Button } from '../common/Button';
import { apiService } from '../../services/api';
import { useFrogAppearance } from '../../hooks/useFrogAppearance';
import { FrogSvgGenerated } from './FrogSvgGenerated';
import { FrogHatchingLoader } from './FrogHatchingLoader';
import { RarityBorder } from './RarityBorder';
import { getRarityDisplayText, getRarityColor, confirmAppearance } from '../../services/appearance.api';

interface FrogMintWithAppearanceProps {
  onSuccess?: () => void;
}

export function FrogMintWithAppearance({ onSuccess }: FrogMintWithAppearanceProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'name' | 'preview' | 'minting' | 'success'>('name');
  const { address, isConnected } = useAccount();
  
  const {
    params: appearanceParams,
    isLoading: isGenerating,
    error: generateError,
    stage,
    progress,
    regenerateRemaining,
    generate,
    regenerate,
    confirm,
    reset,
  } = useFrogAppearance();

  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // 生成外观预览
  const handleGenerateAppearance = async () => {
    if (!name || name.length < 2 || name.length > 16) {
      setError('名字需要 2-16 个字符');
      return;
    }
    setError('');
    await generate();
    setStep('preview');
  };

  // 重新生成
  const handleRegenerate = async () => {
    if (regenerateRemaining <= 0) {
      setError('已用完所有重新生成次数');
      return;
    }
    await regenerate();
  };

  // 确认铸造
  const handleMint = async () => {
    if (!ZETAFROG_ADDRESS) {
      setError('合约地址未配置');
      return;
    }

    setStep('minting');
    
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
      setStep('preview');
    }
  };

  // 成功后同步
  useEffect(() => {
    if (isSuccess && receipt && address) {
      const syncAndNotify = async () => {
        try {
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
              
              // 同步青蛙数据
              await apiService.syncFrog(tokenId);
              
              // 确认外观参数
              await confirm(tokenId);
            }
          }
        } catch (e) {
          console.error('Error syncing:', e);
        }

        setStep('success');
        setTimeout(() => onSuccess?.(), 2000);
      };

      syncAndNotify();
    }
  }, [isSuccess, receipt, address, confirm, onSuccess]);

  // 合并错误信息
  useEffect(() => {
    if (generateError) setError(generateError);
    if (writeError) setError(writeError.message);
  }, [generateError, writeError]);

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">请先连接钱包</p>
      </div>
    );
  }

  if (!ZETAFROG_ADDRESS) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">合约地址未配置</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl shadow-lg p-6 max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-bold text-center mb-6 text-white">
        🐸 铸造你的 ZetaFrog
      </h2>

      <AnimatePresence mode="wait">
        {/* Step 1: 输入名字 */}
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                给你的青蛙起个名字
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="2-16 个字符"
                maxLength={16}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-green-500 focus:ring-2 focus:ring-green-900 outline-none transition-all"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              onClick={handleGenerateAppearance}
              disabled={!name || isGenerating}
              className="w-full"
            >
              {isGenerating ? '生成中...' : '🧬 生成专属外观'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              系统将根据你的钱包地址生成独一无二的青蛙外观
            </p>
          </motion.div>
        )}

        {/* Loading: DNA 进度条 */}
        {isGenerating && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FrogHatchingLoader
              walletAddress={address || ''}
              stage={stage}
              progress={progress}
            />
          </motion.div>
        )}

        {/* Step 2: 预览外观 */}
        {step === 'preview' && appearanceParams && !isGenerating && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-4"
          >
            {/* 青蛙预览 */}
            <div className="flex justify-center">
              <RarityBorder tier={appearanceParams.rarity.tier} size={220}>
                <FrogSvgGenerated params={appearanceParams} size={180} />
              </RarityBorder>
            </div>

            {/* 稀有度信息 */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span 
                  className="text-lg font-bold"
                  style={{ color: getRarityColor(appearanceParams.rarity.tier) }}
                >
                  {getRarityDisplayText(appearanceParams.rarity.tier)}
                </span>
                <span className="text-gray-400">
                  (分数: {appearanceParams.rarity.score})
                </span>
              </div>
              {appearanceParams.description && (
                <p className="text-gray-400 text-sm mt-1">
                  "{appearanceParams.description}"
                </p>
              )}
            </div>

            {/* 配件展示 */}
            <div className="flex flex-wrap justify-center gap-2">
              {appearanceParams.accessories.hat !== 'none' && (
                <span className="px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300">
                  🎩 {appearanceParams.accessories.hat}
                </span>
              )}
              {appearanceParams.accessories.glasses !== 'none' && (
                <span className="px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300">
                  👓 {appearanceParams.accessories.glasses}
                </span>
              )}
              {appearanceParams.accessories.necklace !== 'none' && (
                <span className="px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300">
                  📿 {appearanceParams.accessories.necklace}
                </span>
              )}
              {appearanceParams.effects.sparkle && (
                <span className="px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300">
                  ✨ 闪亮
                </span>
              )}
              {appearanceParams.effects.glow && (
                <span className="px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300">
                  💫 发光
                </span>
              )}
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                onClick={handleRegenerate}
                disabled={regenerateRemaining <= 0 || isGenerating}
                variant="secondary"
                className="flex-1"
              >
                🔄 换一只 ({regenerateRemaining})
              </Button>
              <Button
                onClick={handleMint}
                disabled={isPending || isConfirming}
                className="flex-1"
              >
                ✅ 确认铸造
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              外观铸造后将永久固定，无法更改
            </p>
          </motion.div>
        )}

        {/* Step 3: 铸造中 */}
        {step === 'minting' && (
          <motion.div
            key="minting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white">
              {isPending ? '请在钱包中确认交易...' : '铸造中...'}
            </p>
          </motion.div>
        )}

        {/* Step 4: 成功 */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-green-400 font-bold text-lg">恭喜！</p>
            <p className="text-gray-300">
              你的 ZetaFrog "{name}" 已经铸造成功！
            </p>
            {appearanceParams && (
              <p className="text-gray-400 text-sm mt-2">
                稀有度: {getRarityDisplayText(appearanceParams.rarity.tier)}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default FrogMintWithAppearance;
