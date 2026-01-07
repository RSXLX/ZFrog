/**
 * EIP-712 Signature Verification Service
 * 
 * 功能:
 * - 验证留言签名
 * - 防止重放攻击
 */

import { ethers } from 'ethers';

// EIP-712 类型定义
const DOMAIN = {
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

// 用于防止重放攻击的时间窗口 (5分钟)
const VALID_TIMESTAMP_WINDOW = 5 * 60;

/**
 * 验证 EIP-712 签名
 */
export async function verifyMessageSignature(
  signature: string,
  fromFrogId: number,
  toAddress: string,
  message: string,
  timestamp: number,
  expectedSigner: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // 检查时间戳是否在有效窗口内
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > VALID_TIMESTAMP_WINDOW) {
      return { valid: false, error: 'Signature expired' };
    }

    // 构建 EIP-712 消息
    const domain = {
      ...DOMAIN,
    };

    const messageData = {
      fromFrogId: BigInt(fromFrogId),
      toAddress: toAddress.toLowerCase(),
      message,
      timestamp: BigInt(timestamp),
    };

    // 恢复签名者地址
    const recoveredAddress = ethers.verifyTypedData(
      domain,
      MESSAGE_TYPES,
      messageData,
      signature
    );

    // 比较地址 (不区分大小写)
    if (recoveredAddress.toLowerCase() !== expectedSigner.toLowerCase()) {
      return { valid: false, error: 'Invalid signer' };
    }

    return { valid: true };
  } catch (error: any) {
    console.error('Signature verification failed:', error);
    return { valid: false, error: error.message || 'Verification failed' };
  }
}

/**
 * 验证打赏交易
 */
export async function verifyTipTransaction(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: string,
  provider: ethers.Provider
): Promise<{ valid: boolean; error?: string }> {
  try {
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    // 等待交易确认
    const receipt = await tx.wait();
    
    if (!receipt || receipt.status !== 1) {
      return { valid: false, error: 'Transaction failed' };
    }

    // 验证交易详情
    if (tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { valid: false, error: 'Invalid sender' };
    }

    if (tx.to?.toLowerCase() !== expectedTo.toLowerCase()) {
      return { valid: false, error: 'Invalid recipient' };
    }

    // 验证金额 (允许一定误差)
    const expectedValue = ethers.parseEther(expectedAmount);
    if (tx.value < expectedValue) {
      return { valid: false, error: 'Insufficient amount' };
    }

    return { valid: true };
  } catch (error: any) {
    console.error('Transaction verification failed:', error);
    return { valid: false, error: error.message || 'Verification failed' };
  }
}

export const signatureService = {
  verifyMessageSignature,
  verifyTipTransaction,
};

export default signatureService;
