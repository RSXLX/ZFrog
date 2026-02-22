/**
 * 青蛙外观数据 Hook
 * 
 * 管理外观生成、获取和状态
 */

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import {
  FrogAppearanceParams,
  generateAppearance,
  getAppearance,
  getPendingAppearance,
  confirmAppearance,
} from '../services/appearance.api';

// 生成阶段
export type GenerationStage = 'init' | 'reading' | 'computing' | 'generating' | 'done';

interface UseFrogAppearanceOptions {
  /** 是否启用签名验证（生产环境建议开启） */
  withSignature?: boolean;
}

interface UseFrogAppearanceReturn {
  // 状态
  params: FrogAppearanceParams | null;
  isLoading: boolean;
  error: string | null;
  stage: GenerationStage;
  progress: number;
  regenerateRemaining: number;
  cooldownUntil: number | null;
  descriptionPending: boolean;
  
  // 方法
  generate: () => Promise<void>;
  regenerate: () => Promise<void>;
  confirm: (tokenId: number) => Promise<void>;
  fetchAppearance: (tokenId: number) => Promise<void>;
  reset: () => void;
}

export function useFrogAppearance(options: UseFrogAppearanceOptions = {}): UseFrogAppearanceReturn {
  const { withSignature = false } = options;
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // 状态
  const [params, setParams] = useState<FrogAppearanceParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<GenerationStage>('init');
  const [progress, setProgress] = useState(0);
  const [regenerateRemaining, setRegenerateRemaining] = useState(3);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [descriptionPending, setDescriptionPending] = useState(false);
  
  /**
   * 模拟进度条动画
   */
  const simulateProgress = useCallback(async () => {
    // Stage 1: init
    setStage('init');
    setProgress(0);
    await sleep(300);
    
    // Stage 2: reading
    setStage('reading');
    for (let i = 0; i <= 30; i += 5) {
      setProgress(i);
      await sleep(50);
    }
    
    // Stage 3: computing
    setStage('computing');
    for (let i = 30; i <= 60; i += 5) {
      setProgress(i);
      await sleep(50);
    }
    
    // Stage 4: generating
    setStage('generating');
    for (let i = 60; i <= 90; i += 5) {
      setProgress(i);
      await sleep(50);
    }
  }, []);
  
  /**
   * 生成外观
   */
  const generate = useCallback(async () => {
    if (!address) {
      setError('请先连接钱包');
      return;
    }
    
    // 检查冷却时间
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      setError(`请等待 ${remaining} 秒后再试`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // 开始进度动画
    const progressPromise = simulateProgress();
    
    try {
      // F10: 签名验证（可选）
      let signature: string | undefined;
      let message: string | undefined;
      
      if (withSignature && address) {
        message = `Generate frog appearance for ${address} at ${Date.now()}`;
        try {
          // @ts-ignore - wagmi v2 类型问题，实际运行正常
          signature = await signMessageAsync({ message });
        } catch (signError) {
          console.error('Signature cancelled or failed:', signError);
          setError('签名被取消');
          setIsLoading(false);
          return;
        }
      }
      
      const response = await generateAppearance(address, signature, message);
      
      if (response.success) {
        // 等待进度动画完成
        await progressPromise;
        
        setParams(response.params);
        setRegenerateRemaining(response.regenerateRemaining);
        setCooldownUntil(response.cooldownUntil || null);
        setDescriptionPending(response.descriptionPending);
        
        // 完成
        setStage('done');
        setProgress(100);
      } else {
        throw new Error('生成失败');
      }
    } catch (err: any) {
      console.error('Generate appearance error:', err);
      
      if (err.response?.status === 429) {
        const cooldown = err.response?.data?.cooldownUntil;
        if (cooldown) {
          setCooldownUntil(cooldown);
          const remaining = Math.ceil((cooldown - Date.now()) / 1000);
          setError(`请等待 ${remaining} 秒后再试`);
        } else {
          setError('已达到最大重新生成次数 (3 次)');
        }
      } else {
        setError(err.message || '生成失败，请重试');
      }
      
      setStage('init');
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, cooldownUntil, simulateProgress]);
  
  /**
   * 重新生成
   */
  const regenerate = useCallback(async () => {
    if (regenerateRemaining <= 0) {
      setError('已达到最大重新生成次数 (3 次)');
      return;
    }
    await generate();
  }, [regenerateRemaining, generate]);
  
  /**
   * 确认外观（铸造成功后调用）
   */
  const confirm = useCallback(async (tokenId: number) => {
    if (!address) return;
    
    try {
      await confirmAppearance(address, tokenId);
    } catch (err) {
      console.error('Confirm appearance error:', err);
    }
  }, [address]);
  
  /**
   * 获取已保存的外观
   */
  const fetchAppearance = useCallback(async (tokenId: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getAppearance(tokenId);
      if (response.success && response.params) {
        setParams(response.params);
        setStage('done');
        setProgress(100);
      }
    } catch (err: any) {
      console.error('Fetch appearance error:', err);
      setError('获取外观失败');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * 轮询检查描述是否生成完成
   */
  useEffect(() => {
    if (!descriptionPending || !address) return;
    
    const interval = setInterval(async () => {
      try {
        const response = await getPendingAppearance(address);
        if (response.ready && response.params) {
          setParams(response.params);
          setDescriptionPending(false);
        }
      } catch (err) {
        console.error('Poll pending appearance error:', err);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [descriptionPending, address]);
  
  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setParams(null);
    setIsLoading(false);
    setError(null);
    setStage('init');
    setProgress(0);
    setRegenerateRemaining(3);
    setCooldownUntil(null);
    setDescriptionPending(false);
  }, []);
  
  return {
    params,
    isLoading,
    error,
    stage,
    progress,
    regenerateRemaining,
    cooldownUntil,
    descriptionPending,
    generate,
    regenerate,
    confirm,
    fetchAppearance,
    reset,
  };
}

// 辅助函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
