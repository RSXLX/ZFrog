/**
 * useHomesteadWeb3 - 家园 Web3 功能 Hook
 * 
 * 功能:
 * - EIP-712 签名 (留言验证)
 * - 代币打赏
 * - NFT 礼物转账
 * - 照片 NFT 铸造
 */

import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { parseEther, encodeFunctionData, type Address } from 'viem';

// ============ 类型定义 ============

export interface TipResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface MintResult {
  success: boolean;
  txHash?: string;
  tokenId?: string;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// ============ EIP-712 类型定义 ============

const EIP712_DOMAIN = {
  name: 'ZetaFrog Homestead',
  version: '1',
  chainId: 7001, // ZetaChain Athens
};

const MESSAGE_TYPES = {
  VisitorMessage: [
    { name: 'fromFrogId', type: 'uint256' },
    { name: 'toAddress', type: 'address' },
    { name: 'message', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
};

// ERC721 ABI (仅转账需要的部分)
const ERC721_TRANSFER_ABI = [
  {
    name: 'transferFrom',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'safeTransferFrom',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
];

// ============ Hook ============

export function useHomesteadWeb3() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [isLoading, setIsLoading] = useState(false);

  // ============ EIP-712 签名 ============
  
  /**
   * 对留言进行 EIP-712 签名
   */
  const signMessage = useCallback(
    async (fromFrogId: number, toAddress: string, message: string): Promise<string | null> => {
      if (!walletClient || !address) {
        console.error('Wallet not connected');
        return null;
      }

      try {
        const timestamp = Math.floor(Date.now() / 1000);
        
        const signature = await walletClient.signTypedData({
          account: address as Address,
          domain: EIP712_DOMAIN,
          types: MESSAGE_TYPES,
          primaryType: 'VisitorMessage',
          message: {
            fromFrogId: BigInt(fromFrogId),
            toAddress: toAddress as Address,
            message,
            timestamp: BigInt(timestamp),
          },
        });

        return signature;
      } catch (error) {
        console.error('Failed to sign message:', error);
        return null;
      }
    },
    [walletClient, address]
  );

  // ============ 代币打赏 ============
  
  /**
   * 发送原生代币打赏
   */
  const tipWithNative = useCallback(
    async (toAddress: string, amountInEther: string): Promise<TipResult> => {
      if (!walletClient || !address) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsLoading(true);
      
      try {
        // @ts-ignore - kzg is optional but TS is strict
        const hash = await walletClient.sendTransaction({
          account: address as Address,
          to: toAddress as Address,
          value: parseEther(amountInEther),
          chain: walletClient.chain,
        });
        
        // 等待交易确认
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        return { success: true, txHash: hash };

        // 等待交易确认
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        return { success: true, txHash: hash };
      } catch (error: any) {
        console.error('Tip failed:', error);
        return { 
          success: false, 
          error: error.shortMessage || error.message || 'Transaction failed' 
        };
      } finally {
        setIsLoading(false);
      }
    },
    [walletClient, address, publicClient]
  );

  // ============ NFT 礼物转账 ============
  
  /**
   * 转移 NFT 作为礼物
   */
  const transferNftGift = useCallback(
    async (
      nftContract: string,
      tokenId: string,
      toAddress: string
    ): Promise<TransferResult> => {
      if (!walletClient || !address) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsLoading(true);

      try {
        const data = encodeFunctionData({
          abi: ERC721_TRANSFER_ABI,
          functionName: 'safeTransferFrom',
          args: [address, toAddress as Address, BigInt(tokenId)],
        });

        // @ts-ignore
        const hash = await walletClient.sendTransaction({
          account: address as Address,
          to: nftContract as Address,
          data,
          chain: walletClient.chain,
        });

        // 等待交易确认
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        return { success: true, txHash: hash };
      } catch (error: any) {
        console.error('NFT transfer failed:', error);
        return {
          success: false,
          error: error.shortMessage || error.message || 'Transfer failed',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [walletClient, address, publicClient]
  );

  // ============ 照片 NFT 铸造 ============
  
  // 简化版本 - 实际项目中需要与合约集成
  const PHOTO_NFT_CONTRACT = '0x0000000000000000000000000000000000000000'; // TODO: 配置实际地址
  
  const PHOTO_NFT_ABI = [
    {
      name: 'mint',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'tokenURI', type: 'string' },
      ],
      outputs: [{ name: 'tokenId', type: 'uint256' }],
    },
  ];

  /**
   * 铸造照片为 NFT
   */
  const mintPhotoNft = useCallback(
    async (ipfsUri: string): Promise<MintResult> => {
      if (!walletClient || !address) {
        return { success: false, error: 'Wallet not connected' };
      }

      if (PHOTO_NFT_CONTRACT === '0x0000000000000000000000000000000000000000') {
        return { success: false, error: 'Photo NFT contract not configured' };
      }

      setIsLoading(true);

      try {
        const data = encodeFunctionData({
          abi: PHOTO_NFT_ABI,
          functionName: 'mint',
          args: [address, ipfsUri],
        });

        // @ts-ignore
        const hash = await walletClient.sendTransaction({
          account: address as Address,
          to: PHOTO_NFT_CONTRACT as Address,
          data,
          chain: walletClient.chain,
        });

        // 等待交易确认并获取 tokenId (简化版)
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          // 实际项目中需要解析事件获取 tokenId
          return { 
            success: true, 
            txHash: hash,
            // @ts-ignore
            tokenId: receipt.logs[0]?.topics?.[3]?.toString() || '0', 
          };
        }

        return { success: true, txHash: hash };
      } catch (error: any) {
        console.error('Mint failed:', error);
        return {
          success: false,
          error: error.shortMessage || error.message || 'Mint failed',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [walletClient, address, publicClient]
  );

  return {
    // 状态
    isConnected,
    address,
    isLoading,
    
    // 签名
    signMessage,
    
    // 打赏
    tipWithNative,
    
    // NFT 转账
    transferNftGift,
    
    // NFT 铸造
    mintPhotoNft,
  };
}

export default useHomesteadWeb3;
