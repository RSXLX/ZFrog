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
import { BSC_CONNECTOR_ADDRESS, SEPOLIA_CONNECTOR_ADDRESS } from '../config/contracts';

// ============ 配置 ============

const getAddressOrFallback = (address: string | undefined, fallback: Address): Address => {
  if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
    return address as Address;
  }
  return fallback;
};

// ZetaChain Gateway/Connector 地址（支持环境变量覆盖）
const GATEWAY_ADDRESSES: Record<string, Address> = {
  '7001': getAddressOrFallback(
    import.meta.env.VITE_ZETACHAIN_GATEWAY_ADDRESS,
    '0x6c533f7fe93fae114d0954697069df33c9b74fd7' as Address
  ), // ZetaChain Athens Testnet
  '97': getAddressOrFallback(import.meta.env.VITE_BSC_GATEWAY_ADDRESS, BSC_CONNECTOR_ADDRESS), // BSC Testnet
  '11155111': getAddressOrFallback(import.meta.env.VITE_SEPOLIA_GATEWAY_ADDRESS, SEPOLIA_CONNECTOR_ADDRESS), // Sepolia
};

// 支持的链
export const SUPPORTED_CHAINS = [
  { id: '7001', name: 'ZetaChain Athens', symbol: 'ZETA', icon: '⚡' },
  { id: '97', name: 'BSC Testnet', symbol: 'tBNB', icon: '🔶' },
  { id: '11155111', name: 'Sepolia', symbol: 'ETH', icon: '💎' },
];

// Gateway ABI - ZetaChain EVM Gateway 接口
// Reference: https://www.zetachain.com/docs/developers/chains/evm
const GATEWAY_ABI = [
  // Deposit native gas tokens (ETH, BNB, etc.) to ZetaChain
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { 
        name: 'revertOptions', 
        type: 'tuple',
        components: [
          { name: 'revertAddress', type: 'address' },
          { name: 'callOnRevert', type: 'bool' },
          { name: 'abortAddress', type: 'address' },
          { name: 'revertMessage', type: 'bytes' },
          { name: 'onRevertGasLimit', type: 'uint256' },
        ]
      },
    ],
    outputs: [],
  },
  // Deposit native gas tokens and call a universal app
  {
    name: 'depositAndCall',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'payload', type: 'bytes' },
      { 
        name: 'revertOptions', 
        type: 'tuple',
        components: [
          { name: 'revertAddress', type: 'address' },
          { name: 'callOnRevert', type: 'bool' },
          { name: 'abortAddress', type: 'address' },
          { name: 'revertMessage', type: 'bytes' },
          { name: 'onRevertGasLimit', type: 'uint256' },
        ]
      },
    ],
    outputs: [],
  },
] as const;

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
          // @ts-ignore
          const hash = await walletClient.sendTransaction({
            account: address as Address,
            to: params.toAddress as Address,
            value: parseEther(params.amount),
            chain: walletClient.chain,
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

          // 构造 RevertOptions - 如果失败则退回到发送者地址
          const revertOptions = {
            revertAddress: address as Address,
            callOnRevert: false,
            abortAddress: '0x0000000000000000000000000000000000000000' as Address,
            revertMessage: '0x' as `0x${string}`,
            onRevertGasLimit: BigInt(200000),
          };

          // 使用 deposit 函数进行简单转账
          const data = encodeFunctionData({
            abi: GATEWAY_ABI,
            functionName: 'deposit',
            args: [
              params.toAddress as Address,
              revertOptions,
            ],
          });

          // @ts-ignore
          const hash = await walletClient.sendTransaction({
            account: address as Address,
            to: gatewayAddress,
            value: parseEther(params.amount),
            data,
            chain: walletClient.chain,
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
