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
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      <h3 className="text-xl font-bold mb-4">
        派 {frogName} 去冒险！🌍
      </h3>

      {/* 链选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          目标区块链
        </label>
        <div className="flex gap-3">
          {CHAIN_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setChainId(option.value)}
              disabled={isPending || isConfirming}
              className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                chainId === option.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <span>{option.icon}</span>
              <span className="font-semibold text-sm">{option.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          * 仅作为观察目标，交易仍在 ZetaChain 发送，无需切换钱包网络
        </p>
      </div>
      
      {/* 目标钱包输入 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          要观察的钱包地址
        </label>
        <input
          type="text"
          value={targetWallet}
          onChange={(e) => setTargetWallet(e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          disabled={isPending || isConfirming}
        />
        <p className="text-xs text-gray-500 mt-1">
          输入任意以太坊钱包地址，让你的青蛙去观察
        </p>
      </div>
      
      {/* 时长选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          旅行时长
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setDuration(option.value)}
              disabled={isPending || isConfirming}
              className={`p-3 rounded-lg border-2 transition-all ${
                duration === option.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="font-semibold text-sm">{option.label}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* 错误提示 */}
      {(error || writeError) && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error || writeError?.message}
        </div>
      )}
      
      {/* 成功提示 */}
      {isSuccess && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg text-center"
        >
          <p className="text-xl mb-1">✈️</p>
          <p className="font-semibold">{frogName} 出发了！</p>
          <p className="text-sm">旅行结束后回来查看吧~</p>
        </motion.div>
      )}
      
      <Button
        onClick={handleStartTravel}
        disabled={isPending || isConfirming || !targetWallet}
        loading={isPending || isConfirming}
        className="w-full"
      >
        {isPending ? '确认交易中...' :
         isConfirming ? '出发中...' :
         '开始冒险'}
      </Button>
    </motion.div>
  );
}
