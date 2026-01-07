/**
 * Provider Utils
 * 
 * 工具函数用于创建和配置 ethers Provider
 */

import { ethers } from 'ethers';
import { logger } from './logger';

/**
 * 创建一个带有错误处理的 JsonRpcProvider
 * 自动静默处理 "filter not found" 等常见的无害错误
 */
export function createSafeProvider(rpcUrl: string, chainName?: string): ethers.JsonRpcProvider {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // 添加全局错误处理器
  provider.on('error', (error: any) => {
    // 静默忽略 filter 过期错误 (公共 RPC 的正常行为)
    if (error?.code === 'UNKNOWN_ERROR' && error?.error?.message?.includes('filter')) {
      return;
    }
    
    // 静默忽略连接重置错误 (网络波动的正常现象)
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      return;
    }
    
    // 静默忽略超时错误
    if (error?.code === 'TIMEOUT') {
      return;
    }
    
    // 其他错误使用 debug 级别记录
    const name = chainName || 'Unknown';
    logger.debug(`[Provider:${name}] Error: ${error?.message || error}`);
  });
  
  return provider;
}

/**
 * 为现有 Provider 添加错误处理
 */
export function addSafeErrorHandler(provider: ethers.JsonRpcProvider, chainName?: string): void {
  provider.on('error', (error: any) => {
    // 静默忽略 filter 过期错误
    if (error?.code === 'UNKNOWN_ERROR' && error?.error?.message?.includes('filter')) {
      return;
    }
    
    // 静默忽略连接/超时错误
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'TIMEOUT') {
      return;
    }
    
    const name = chainName || 'Unknown';
    logger.debug(`[Provider:${name}] Error: ${error?.message || error}`);
  });
}
