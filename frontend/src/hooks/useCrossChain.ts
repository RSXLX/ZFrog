/**
 * useCrossChain - ZetaChain Gateway 跨链转账 Hook
 * 
 * 功能:
 * - 跨链代币转账
 * - 追踪 CCTX 状态
 * - 好友转账
 */

import { useState, useCallback,  useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { parseEther, type Address, encodeFunctionData } from 'viem';
import { apiService } from '../services/api';

// ============ 配置 ============

// ZetaChain Gateway 地址
const GATEWAY_ADDRESSES: Record<string, Address> = {
  '7001': '0x6c533f7fe93fae114d0954697069df33c9b74fd7', // ZetaChain Athens Testnet
  '97': '0x0000000000000000000000000000000000000000', // BSC Testnet (placeholder)
  '11155111': '0x0000000000000000000000000000000000000000', // Sepolia (placeholder)
};

// 支持的链
export const SUPPORTED_CHAINS = [
  { id: '7001', name: 'ZetaChain Athens', symbol: 'ZETA', icon: '⚡' },
  { id: '97', name: 'BSC Testnet', symbol: 'tBNB', icon: '🔶' },
  { id: '11155111', name: 'Sepolia', symbol: 'ETH', icon: '💎' },
];

// Gateway ABI (简化版)
const GATEWAY_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'asset', type: 'address' },
      { name: 'message', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'depositAndCall',
    type: 'function',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'asset', type: 'address' },
      { name: 'message', type: 'bytes' },
    ],
    outputs: [],
  },
];

// ============ 类型定义 ============

export interface TransferParams {
  toAddress: string;
  toFrogId?: number;
  amount: string;
  targetChain: string;
  message?: string;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  txHash?: string;
  error?: string;
}

export interface Transfer {
  id: string;
  fromFrogId: number;
  toAddress: string;
  toFrogId?: number;
  amount: string;
  tokenSymbol: string;
  sourceChain: string;
  targetChain: string;
  status: 'PENDING' | 'CONFIRMING' | 'COMPLETED' | 'FAILED';
  cctxHash?: string;
  createdAt: string;
}

export interface Friend {
  id: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
}

// ============ Hook ============

export function useCrossChain(frogId: number) {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isLoading, setIsLoading] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [stats, setStats] = useState({ sentCount: 0, receivedCount: 0, totalVolume: '0' });

  // 加载转账历史
  const loadTransfers = useCallback(async () => {
    try {
      const response = await apiService.get(`/crosschain-transfer/${frogId}/history`);
      if (response.success) {
        setTransfers(response.data.transfers || []);
      }
    } catch (error) {
      console.error('Failed to load transfers:', error);
    }
  }, [frogId]);

  // 加载好友列表
  const loadFriends = useCallback(async () => {
    try {
      const response = await apiService.get(`/crosschain-transfer/${frogId}/friends`);
      if (response.success) {
        setFriends(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }, [frogId]);

  // 加载统计
  const loadStats = useCallback(async () => {
    try {
      const response = await apiService.get(`/crosschain-transfer/${frogId}/stats`);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [frogId]);

  // 初始化加载
  useEffect(() => {
    if (frogId) {
      loadTransfers();
      loadFriends();
      loadStats();
    }
  }, [frogId, loadTransfers, loadFriends, loadStats]);

  // 发起跨链转账
  const sendCrossChainTransfer = useCallback(
    async (params: TransferParams): Promise<TransferResult> => {
      if (!walletClient || !address || !chainId) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsLoading(true);

      try {
        // 1. 创建转账记录
        const createResponse = await apiService.post('/crosschain-transfer/create', {
          fromFrogId: frogId,
          fromAddress: address,
          toAddress: params.toAddress,
          toFrogId: params.toFrogId,
          amount: params.amount,
          tokenSymbol: SUPPORTED_CHAINS.find(c => c.id === chainId.toString())?.symbol || 'ZETA',
          sourceChain: chainId.toString(),
          targetChain: params.targetChain,
          message: params.message,
        });

        if (!createResponse.success) {
          throw new Error('Failed to create transfer record');
        }

        const transferId = createResponse.data.id;

        // 2. 发送链上交易
        // 判断是同链还是跨链
        if (chainId.toString() === params.targetChain) {
          // 同链转账 - 直接发送
          const hash = await walletClient.sendTransaction({
            to: params.toAddress as Address,
            value: parseEther(params.amount),
          });

          // 更新状态
          await apiService.post('/crosschain-transfer/confirm', {
            transferId,
            cctxHash: hash,
            status: 'COMPLETED',
            targetTxHash: hash,
          });

          await loadTransfers();
          await loadStats();

          return { success: true, transferId, txHash: hash };
        } else {
          // 跨链转账 - 调用 Gateway
          const gatewayAddress = GATEWAY_ADDRESSES[chainId.toString()];

          if (!gatewayAddress || gatewayAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Gateway not configured for this chain');
          }

          // 编码消息
          const message = params.message 
            ? new TextEncoder().encode(params.message)
            : new Uint8Array(0);

          const data = encodeFunctionData({
            abi: GATEWAY_ABI,
            functionName: 'deposit',
            args: [
              params.toAddress as Address,
              parseEther(params.amount),
              '0x0000000000000000000000000000000000000000' as Address, // Native token
              `0x${Buffer.from(message).toString('hex')}` as `0x${string}`,
            ],
          });

          const hash = await walletClient.sendTransaction({
            to: gatewayAddress,
            value: parseEther(params.amount),
            data,
          });

          // 更新状态为确认中
          await apiService.post('/crosschain-transfer/confirm', {
            transferId,
            cctxHash: hash,
            status: 'CONFIRMING',
          });

          await loadTransfers();

          return { success: true, transferId, txHash: hash };
        }
      } catch (error: any) {
        console.error('Cross-chain transfer failed:', error);
        return {
          success: false,
          error: error.shortMessage || error.message || 'Transfer failed',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [walletClient, address, chainId, frogId, loadTransfers, loadStats]
  );

  // 发送给好友
  const sendToFriend = useCallback(
    async (friend: Friend, amount: string, targetChain: string, message?: string) => {
      return sendCrossChainTransfer({
        toAddress: friend.ownerAddress,
        toFrogId: friend.id,
        amount,
        targetChain,
        message,
      });
    },
    [sendCrossChainTransfer]
  );

  return {
    // 状态
    isConnected,
    isLoading,
    currentChainId: chainId?.toString(),
    
    // 数据
    transfers,
    friends,
    stats,
    supportedChains: SUPPORTED_CHAINS,
    
    // 方法
    sendCrossChainTransfer,
    sendToFriend,
    refreshTransfers: loadTransfers,
    refreshFriends: loadFriends,
    refreshStats: loadStats,
  };
}

export default useCrossChain;
