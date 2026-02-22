/**
 * useGroupCrossChainTravel Hook
 * 
 * 用于调用 OmniTravel 合约的结伴跨链旅行功能
 */

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';

// OmniTravel 合约地址 (从环境变量读取或硬编码)
const OMNI_TRAVEL_ADDRESS = import.meta.env.VITE_OMNI_TRAVEL_ADDRESS as `0x${string}`;

// 部分 ABI (只包含需要的函数)
const OMNI_TRAVEL_ABI = [
  {
    name: 'startGroupCrossChainTravel',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'leaderTokenId', type: 'uint256' },
      { name: 'companionTokenId', type: 'uint256' },
      { name: 'targetChainId', type: 'uint256' },
      { name: 'duration', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'calculateGroupProvisions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'durationHours', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'testMode',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

// 支持的目标链配置
export const TARGET_CHAINS = [
  { id: 97, name: 'BSC Testnet', icon: '🟡', key: 'BSC_TESTNET' },
  { id: 11155111, name: 'Sepolia', icon: '💎', key: 'ETH_SEPOLIA' },
  { id: 7001, name: 'ZetaChain Athens', icon: '⚡', key: 'ZETACHAIN_ATHENS' }
] as const;

interface UseGroupCrossChainTravelReturn {
  // 状态
  isLoading: boolean;
  isSuccess: boolean;
  isPending: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  
  // 方法
  startGroupTravel: (params: {
    leaderTokenId: number;
    companionTokenId: number;
    targetChainId: number;
    duration: number;
    provisions: bigint;
  }) => Promise<void>;
  
  // 费用估算
  estimatedProvisions: bigint | undefined;
  estimatedProvisionsFormatted: string;
  
  // 工具方法
  calculateProvisions: (durationHours: number) => bigint;
  reset: () => void;
}

export function useGroupCrossChainTravel(): UseGroupCrossChainTravelReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // 合约写入
  const { 
    writeContract, 
    data: txHash,
    isPending,
    isSuccess: writeSuccess,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();
  
  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  
  // 读取测试模式
  const { data: testMode } = useReadContract({
    address: OMNI_TRAVEL_ADDRESS,
    abi: OMNI_TRAVEL_ABI,
    functionName: 'testMode',
  });
  
  // 计算干粮费用 (本地计算，与合约逻辑一致)
  const calculateProvisions = useCallback((durationHours: number): bigint => {
    // 结伴旅行干粮 = 单人干粮 × 1.5
    // 单人干粮 = MIN_PROVISIONS + (hours * FEE_PER_HOUR)
    // = 0.01 ZETA + (hours * 0.005 ZETA)
    
    if (testMode && durationHours <= 1) {
      // 测试模式: 0.001 ZETA × 1.5 = 0.0015 ZETA
      return parseEther('0.0015');
    }
    
    const minProvisions = 0.01;
    const feePerHour = 0.005;
    const singleProvisions = minProvisions + (durationHours * feePerHour);
    const groupProvisions = singleProvisions * 1.5;
    
    return parseEther(groupProvisions.toFixed(6));
  }, [testMode]);
  
  // 发起结伴旅行
  const startGroupTravel = useCallback(async (params: {
    leaderTokenId: number;
    companionTokenId: number;
    targetChainId: number;
    duration: number;
    provisions: bigint;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // @ts-ignore
      await writeContract({
        address: OMNI_TRAVEL_ADDRESS,
        abi: OMNI_TRAVEL_ABI,
        functionName: 'startGroupCrossChainTravel',
        args: [
          BigInt(params.leaderTokenId),
          BigInt(params.companionTokenId),
          BigInt(params.targetChainId),
          BigInt(params.duration)
        ],
        value: params.provisions,
      });
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [writeContract]);
  
  // 重置状态
  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
    resetWrite();
  }, [resetWrite]);
  
  // 默认 1 小时的费用估算
  const estimatedProvisions = calculateProvisions(1);
  
  return {
    isLoading: isLoading || isPending || isConfirming,
    isSuccess: isConfirmed,
    isPending,
    error: error || writeError || null,
    txHash,
    startGroupTravel,
    estimatedProvisions,
    estimatedProvisionsFormatted: estimatedProvisions ? formatEther(estimatedProvisions) : '0',
    calculateProvisions,
    reset,
  };
}
