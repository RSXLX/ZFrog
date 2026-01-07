/**
 * CrossChainTransfer - 独立跨链转账组件
 * 
 * 功能:
 * - 选择目标链/接收者
 * - 发送跨链转账
 * - 显示转账历史
 * - 好友快捷转账
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrossChain, SUPPORTED_CHAINS, Friend } from '../../hooks/useCrossChain';

interface CrossChainTransferProps {
  frogId: number;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'send' | 'friends' | 'history';

export const CrossChainTransfer: React.FC<CrossChainTransferProps> = ({
  frogId,
  isOpen,
  onClose,
}) => {
  const {
    isConnected,
    isLoading,
    currentChainId,
    transfers,
    friends,
    stats,
    supportedChains,
    sendCrossChainTransfer,
    sendToFriend,
  } = useCrossChain(frogId);

  const [activeTab, setActiveTab] = useState<TabType>('send');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [targetChain, setTargetChain] = useState('7001');
  const [message, setMessage] = useState('');
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

  // 发送转账
  const handleSend = async () => {
    if (!toAddress || !amount) return;

    const result = await sendCrossChainTransfer({
      toAddress,
      amount,
      targetChain,
      message: message || undefined,
    });

    if (result.success) {
      setTxResult({ success: true, message: `转账已发起! TX: ${result.txHash?.slice(0, 10)}...` });
      setToAddress('');
      setAmount('');
      setMessage('');
    } else {
      setTxResult({ success: false, message: result.error || '转账失败' });
    }

    setTimeout(() => setTxResult(null), 5000);
  };

  // 发送给好友
  const handleSendToFriend = async (friend: Friend) => {
    if (!amount) {
      setTxResult({ success: false, message: '请输入金额' });
      return;
    }

    const result = await sendToFriend(friend, amount, targetChain, `送给 ${friend.name} 的礼物 💝`);

    if (result.success) {
      setTxResult({ success: true, message: `已向 ${friend.name} 发送 ${amount}! 🎉` });
      setAmount('');
    } else {
      setTxResult({ success: false, message: result.error || '转账失败' });
    }

    setTimeout(() => setTxResult(null), 5000);
  };

  // 格式化地址
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // 状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-500';
      case 'CONFIRMING': return 'text-yellow-500';
      case 'FAILED': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md 
                   max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b 
                        dark:border-gray-700 bg-gradient-to-r from-purple-500 to-indigo-500">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            ⚡ 跨链转账
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl">
            ✕
          </button>
        </div>

        {/* 统计栏 */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
          <div className="text-center">
            <div className="text-lg font-bold text-purple-500">{stats.sentCount}</div>
            <div className="text-xs text-gray-500">已发送</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-500">{stats.receivedCount}</div>
            <div className="text-xs text-gray-500">已接收</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-cyan-500">{parseFloat(stats.totalVolume || '0').toFixed(2)}</div>
            <div className="text-xs text-gray-500">总额</div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b dark:border-gray-700">
          {(['send', 'friends', 'history'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'send' && '发送'}
              {tab === 'friends' && `好友 (${friends.length})`}
              {tab === 'history' && '历史'}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 发送 Tab */}
          {activeTab === 'send' && (
            <div className="space-y-4">
              {!isConnected ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">🔌</div>
                  <p>请先连接钱包</p>
                </div>
              ) : (
                <>
                  {/* 目标链选择 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">目标链</label>
                    <div className="grid grid-cols-3 gap-2">
                      {supportedChains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => setTargetChain(chain.id)}
                          className={`p-2 rounded-lg text-center transition-all ${
                            targetChain === chain.id
                              ? 'bg-purple-100 dark:bg-purple-900/50 ring-2 ring-purple-500'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="text-xl">{chain.icon}</div>
                          <div className="text-xs mt-1">{chain.symbol}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 接收地址 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">接收地址</label>
                    <input
                      type="text"
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 
                                 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 
                                 focus:ring-purple-400"
                    />
                  </div>

                  {/* 金额 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">金额</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.0"
                        step="0.001"
                        className="w-full px-4 py-2 pr-16 rounded-lg border dark:border-gray-600 
                                   bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 
                                   focus:ring-purple-400"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {supportedChains.find(c => c.id === currentChainId)?.symbol || 'ZETA'}
                      </span>
                    </div>
                  </div>

                  {/* 附言 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">附言 (可选)</label>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="跨链问候..."
                      className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 
                                 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 
                                 focus:ring-purple-400"
                    />
                  </div>

                  {/* 发送按钮 */}
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !toAddress || !amount}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 
                               text-white rounded-xl font-bold disabled:opacity-50 
                               disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    {isLoading ? '发送中...' : '⚡ 发送跨链转账'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 好友 Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {/* 金额输入 (在好友列表上方) */}
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="金额"
                  step="0.001"
                  className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-sm"
                />
                <span className="text-gray-400 text-sm">
                  {supportedChains.find(c => c.id === currentChainId)?.symbol}
                </span>
              </div>

              {friends.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">👥</div>
                  <p>还没有好友</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <motion.div
                    key={friend.id}
                    className="flex items-center justify-between p-3 bg-gray-50 
                               dark:bg-gray-700 rounded-xl"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div>
                      <div className="font-medium">{friend.name}</div>
                      <div className="text-xs text-gray-400">
                        {formatAddress(friend.ownerAddress)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendToFriend(friend)}
                      disabled={isLoading || !amount}
                      className="px-4 py-1.5 bg-purple-500 text-white text-sm rounded-full 
                                 font-medium disabled:opacity-50 hover:bg-purple-600"
                    >
                      发送 💝
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* 历史 Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {transfers.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">📜</div>
                  <p>暂无转账记录</p>
                </div>
              ) : (
                transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {transfer.fromFrogId === frogId ? '📤' : '📥'}
                        </span>
                        <span className="font-medium">
                          {transfer.amount} {transfer.tokenSymbol}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${getStatusColor(transfer.status)}`}>
                        {transfer.status === 'COMPLETED' && '✓ 完成'}
                        {transfer.status === 'CONFIRMING' && '⏳ 确认中'}
                        {transfer.status === 'PENDING' && '⏳ 等待'}
                        {transfer.status === 'FAILED' && '✕ 失败'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between">
                      <span>
                        {transfer.sourceChain} → {transfer.targetChain}
                      </span>
                      <span>
                        {new Date(transfer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 结果提示 */}
        <AnimatePresence>
          {txResult && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`p-3 text-center text-sm ${
                txResult.success
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600'
              }`}
            >
              {txResult.message}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default CrossChainTransfer;
