/**
 * Group Travel Modal Component V2.0
 * 
 * 结伴跨链旅行弹窗升级版：
 * - 随机选择目标链（ZetaChain/BSC/ETH）
 * - 时长选项（1分钟/10分钟/1小时/24小时）
 * - 干粮费用显示
 * - 发起链上交易
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService, Frog } from '../../services/api';
import { travelApi } from '../../services/travel.api';
import { useGroupCrossChainTravel, TARGET_CHAINS } from '../../hooks/useGroupCrossChainTravel';
import { formatEther, parseEther } from 'viem';
import { useAccount } from 'wagmi';

interface GroupTravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  frogId: number;
  frogName: string;
  tokenId: number;
  onSuccess?: (travelId: number) => void;
}

interface FriendWithStatus extends Frog {
  friendshipId: number;
  affinityLevel?: number;
}

type ModalStep = 'list' | 'config' | 'confirm' | 'loading' | 'success' | 'error';

// 时长选项配置
const DURATION_OPTIONS = [
  { label: '1 分钟', value: 60, icon: '⚡' },
  { label: '10 分钟', value: 600, icon: '🚀' },
  { label: '1 小时', value: 3600, icon: '🌟' },
  { label: '24 小时', value: 86400, icon: '🌙' },
];

export function GroupTravelModal({
  isOpen,
  onClose,
  frogId,
  frogName,
  tokenId,
  onSuccess,
}: GroupTravelModalProps) {
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ModalStep>('list');
  const [selectedFriend, setSelectedFriend] = useState<FriendWithStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{ travelId: number } | null>(null);
  
  // V2.0: 新增状态
  const [selectedChain, setSelectedChain] = useState<typeof TARGET_CHAINS[number] | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[0]);
  const [provisionsUsed, setProvisionsUsed] = useState<string>('0');
  
  // 钱包和合约 Hook
  const { address } = useAccount();
  const {
    startGroupTravel,
    isLoading: isContractLoading,
    isSuccess: isContractSuccess,
    txHash,
    calculateProvisions,
    error: contractError,
    reset: resetContract
  } = useGroupCrossChainTravel();

  // 随机选择目标链
  const randomSelectChain = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * TARGET_CHAINS.length);
    setSelectedChain(TARGET_CHAINS[randomIndex]);
  }, []);

  // 计算干粮费用
  const estimatedProvisions = useMemo(() => {
    const hours = Math.ceil(selectedDuration.value / 3600);
    return calculateProvisions(hours);
  }, [selectedDuration, calculateProvisions]);

  const estimatedProvisionsDisplay = useMemo(() => {
    if (!estimatedProvisions) return '0';
    return parseFloat(formatEther(estimatedProvisions)).toFixed(4);
  }, [estimatedProvisions]);

  // 加载好友列表
  const loadFriends = useCallback(async () => {
    if (tokenId === undefined || tokenId === null) return;
    setLoading(true);
    try {
      const response = await apiService.get(`/friends/list/${tokenId}`);
      if (response.success) {
        setFriends(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    if (isOpen) {
      loadFriends();
      setStep('list');
      setSelectedFriend(null);
      setSelectedChain(null);
      setError(null);
      resetContract();
    }
  }, [isOpen, loadFriends, resetContract]);

  // 监听合约交易成功
  useEffect(() => {
    if (isContractSuccess && txHash && selectedFriend && selectedChain) {
      // 确认后端记录
      confirmBackend();
    }
  }, [isContractSuccess, txHash]);

  // 确认后端记录
  const confirmBackend = async () => {
    if (!selectedFriend || !selectedChain || !txHash) return;
    
    try {
      const result = await travelApi.confirmGroupCrossChainTravel({
        txHash,
        leaderTokenId: tokenId,
        companionTokenId: selectedFriend.tokenId,
        targetChainId: selectedChain.id,
        duration: selectedDuration.value,
        crossChainMessageId: txHash, // 使用 txHash 作为临时 messageId
        provisionsUsed: estimatedProvisions?.toString() || '0'
      });
      
      if (result.success && result.data) {
        setResultData({ travelId: result.data.travelId });
        setProvisionsUsed(estimatedProvisionsDisplay);
        setStep('success');
        setTimeout(() => {
          onSuccess?.(result.data!.travelId);
          onClose();
        }, 3000);
      } else {
        setError(result.error || '后端确认失败');
        setStep('error');
      }
    } catch (err: any) {
      setError(err.message || '后端确认失败');
      setStep('error');
    }
  };

  // 选择好友进入配置步骤
  const handleSelectFriend = (friend: FriendWithStatus) => {
    setSelectedFriend(friend);
    randomSelectChain(); // 随机选择链
    setStep('config');
  };

  // 确认配置进入确认步骤
  const handleConfirmConfig = () => {
    setStep('confirm');
  };

  // 重新随机选择链
  const handleRerollChain = () => {
    randomSelectChain();
  };

  // 发起链上交易
  const handleStartTravel = async () => {
    if (!selectedFriend || !selectedChain || !estimatedProvisions) return;
    
    setStep('loading');
    setError(null);

    try {
      await startGroupTravel({
        leaderTokenId: tokenId,
        companionTokenId: selectedFriend.tokenId,
        targetChainId: selectedChain.id,
        duration: selectedDuration.value,
        provisions: estimatedProvisions
      });
    } catch (err: any) {
      setError(err.message || '发起交易失败');
      setStep('error');
    }
  };

  // 返回上一步
  const handleBack = () => {
    if (step === 'config') {
      setStep('list');
      setSelectedFriend(null);
    } else if (step === 'confirm') {
      setStep('config');
    } else if (step === 'error') {
      setStep('config');
      setError(null);
    }
  };

  // 可结伴的好友（状态为 Idle）
  const availableFriends = friends.filter(f => f.status === 'Idle');
  const busyFriends = friends.filter(f => f.status !== 'Idle');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                🐸🐸 跨链结伴旅行
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-white/80 text-sm mt-2">
              {step === 'list' && '选择一位好友一起探险'}
              {step === 'config' && '配置旅行参数'}
              {step === 'confirm' && '确认并支付干粮'}
              {step === 'loading' && '正在处理...'}
              {step === 'success' && '出发成功！'}
              {step === 'error' && '遇到问题'}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[55vh]">
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-gray-500 mt-4">加载好友列表...</p>
              </div>
            )}

            {/* List Step */}
            {!loading && step === 'list' && (
              <>
                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🐸</div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">还没有好友</h3>
                    <p className="text-gray-500 text-sm mb-6">快去添加好友，一起结伴探险吧！</p>
                  </div>
                ) : availableFriends.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">😴</div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">好友都在旅行中</h3>
                    <p className="text-gray-500 text-sm">等他们回来再一起出发吧~</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 mb-4">选择一位空闲的好友：</p>
                    {availableFriends.map(friend => (
                      <motion.div
                        key={friend.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 rounded-2xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 cursor-pointer hover:border-green-400 hover:shadow-lg transition-all"
                        onClick={() => handleSelectFriend(friend)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl shadow-md">
                            🐸
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{friend.name}</h4>
                            <p className="text-sm text-gray-500">Lv.{friend.level} · 旅行 {friend.totalTravels} 次</p>
                          </div>
                          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                            选择 →
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Config Step - 选择链和时长 */}
            {step === 'config' && selectedFriend && selectedChain && (
              <div className="space-y-6">
                {/* 好友信息 */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-xl">
                      🐸
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">结伴好友</p>
                      <p className="font-bold text-gray-800">{selectedFriend.name}</p>
                    </div>
                  </div>
                </div>

                {/* 目标链（随机） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎲 目标链（随机命运）
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-4 rounded-2xl bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedChain.icon}</span>
                        <div>
                          <p className="font-bold text-gray-800">{selectedChain.name}</p>
                          <p className="text-xs text-gray-500">Chain ID: {selectedChain.id}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleRerollChain}
                      className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                      title="重新随机"
                    >
                      🎲
                    </button>
                  </div>
                </div>

                {/* 时长选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⏱️ 旅行时长
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DURATION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedDuration(opt)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          selectedDuration.value === opt.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg mr-2">{opt.icon}</span>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 干粮费用显示 */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🍙</span>
                      <div>
                        <p className="text-sm text-gray-600">干粮费用（1.5×社交优惠）</p>
                        <p className="font-bold text-lg text-gray-800">
                          {estimatedProvisionsDisplay} ZETA
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>由 {frogName} 支付</p>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                  >
                    ← 返回
                  </button>
                  <button
                    onClick={handleConfirmConfig}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:shadow-lg transition-all"
                  >
                    下一步 →
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Step */}
            {step === 'confirm' && selectedFriend && selectedChain && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="flex justify-center gap-2 text-5xl mb-4">
                    <span>🐸</span>
                    <span>💕</span>
                    <span>🐸</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">确认出发？</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-500">我的青蛙</span>
                    <span className="font-bold">{frogName}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-500">好友青蛙</span>
                    <span className="font-bold">{selectedFriend.name}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-500">目标链</span>
                    <span className="font-bold">{selectedChain.icon} {selectedChain.name}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-500">旅行时长</span>
                    <span className="font-bold">{selectedDuration.icon} {selectedDuration.label}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                    <span className="text-gray-500">🍙 干粮费用</span>
                    <span className="font-bold text-orange-600">{estimatedProvisionsDisplay} ZETA</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                  >
                    ← 返回
                  </button>
                  <button
                    onClick={handleStartTravel}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:shadow-lg transition-all"
                  >
                    🚀 出发！
                  </button>
                </div>
              </div>
            )}

            {/* Loading Step */}
            {step === 'loading' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">
                    🐸
                  </div>
                </div>
                <p className="text-gray-600 mt-6 font-medium">
                  {isContractLoading ? '等待钱包确认...' : '处理中...'}
                </p>
                {txHash && (
                  <p className="text-xs text-gray-400 mt-2">
                    TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </p>
                )}
              </div>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">出发成功！</h3>
                <p className="text-gray-500 text-center mb-4">
                  {frogName} 和 {selectedFriend?.name} 开始了跨链冒险
                </p>
                <div className="p-3 bg-yellow-50 rounded-xl text-sm">
                  <span className="text-gray-600">消耗干粮：</span>
                  <span className="font-bold text-orange-600 ml-2">{provisionsUsed} ZETA</span>
                </div>
              </div>
            )}

            {/* Error Step */}
            {step === 'error' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">😵</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">出发失败</h3>
                <p className="text-red-500 text-sm text-center mb-6">{error || contractError?.message}</p>
                <button
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                >
                  返回重试
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
