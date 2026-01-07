import { 
  useWriteContract, 
  useWaitForTransactionReceipt,
  useSimulateContract,
} from 'wagmi';
import { useState, useCallback, useEffect } from 'react';
import { parseEther, type Abi } from 'viem';
import { transactionManager } from '../services/wallet/transactionManager';

export type TransactionStatus = 'idle' | 'simulating' | 'pending' | 'confirming' | 'success' | 'error';

export interface TransactionState {
  status: TransactionStatus;
  hash?: `0x${string}`;
  error?: Error;
  receipt?: any;
}

export interface UseTransactionOptions {
  onSuccess?: (hash: string, receipt: any) => void;
  onError?: (error: Error) => void;
}

export function useTransaction(options: UseTransactionOptions = {}) {
  const [state, setState] = useState<TransactionState>({ status: 'idle' });
  
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  
  const { isLoading: isConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash: state.hash,
  });
  
  // 执行合约写入
  const execute = useCallback(async (params: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: any[];
    value?: bigint;
    description?: string;
  }) => {
    try {
      setState({ status: 'pending' });
      
      // @ts-ignore
      const hash = await writeContractAsync({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args || [],
        value: params.value,
      });
      
      // 添加到交易管理器
      transactionManager.addTransaction(hash, params.description || params.functionName);
      
      setState({ status: 'confirming', hash });
      console.log('📤 Transaction sent:', hash);
      
      return hash;
    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      setState({ status: 'error', error });
      options.onError?.(error);
      throw error;
    }
  }, [writeContractAsync, options]);
  
  // 监听交易确认
  useEffect(() => {
    if (receipt && state.status === 'confirming') {
      // 更新交易状态
      if (state.hash) {
        transactionManager.updateTransactionStatus(state.hash, 'confirmed');
      }
      
      setState(prev => ({ ...prev, status: 'success', receipt }));
      console.log('✅ Transaction confirmed:', receipt);
      options.onSuccess?.(state.hash!, receipt);
    }
  }, [receipt, state.status, state.hash, options]);
  
  // 重置状态
  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);
  
  return {
    ...state,
    isLoading: state.status === 'pending' || state.status === 'confirming' || isWritePending || isConfirming,
    execute,
    reset,
  };
}

// 便捷 Hook: 铸造青蛙
export function useMintFrog(options: UseTransactionOptions = {}) {
  const tx = useTransaction(options);
  
  const mint = useCallback(async (name: string) => {
    // 这里需要从合约配置中获取 ABI 和地址
    const { ZETAFROG_ABI, ZETAFROG_ADDRESS } = await import('../config/contracts');
    
    return tx.execute({
      address: ZETAFROG_ADDRESS!,
      abi: ZETAFROG_ABI,
      functionName: 'mintFrog',
      args: [name],
      description: `铸造青蛙: ${name}`,
    });
  }, [tx]);
  
  return { ...tx, mint };
}

// 便捷 Hook: 发起旅行
export function useStartTravel(options: UseTransactionOptions = {}) {
  const tx = useTransaction(options);
  
  const startTravel = useCallback(async (
    tokenId: bigint,
    targetWallet: `0x${string}`,
    duration: bigint
  ) => {
    const { ZETAFROG_ABI, ZETAFROG_ADDRESS } = await import('../config/contracts');
    
    return tx.execute({
      address: ZETAFROG_ADDRESS!,
      abi: ZETAFROG_ABI,
      functionName: 'startTravel',
      args: [tokenId, targetWallet, duration],
      description: `青蛙旅行 #${tokenId}`,
    });
  }, [tx]);
  
  return { ...tx, startTravel };
}