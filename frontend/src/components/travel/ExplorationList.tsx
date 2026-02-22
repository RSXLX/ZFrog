/**
 * ExplorationList Component
 * 
 * Displays categorized on-chain exploration records (contracts vs wallets)
 * with filtering tabs and pagination support
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Exploration {
  id: number;
  chainId: number;
  chainName?: string;
  chainSymbol?: string;
  blockNumber: string;
  blockUrl?: string | null;
  message: string;
  aiAnalysis?: string;
  exploredAddress: string | null;
  exploredUrl?: string | null;
  isContract: boolean;
  txHash: string | null;
  txUrl?: string | null;
  timestamp: string;
  source?: 'discovery' | 'interaction';
}

interface ExplorationSummary {
  totalAll: number;
  totalContracts: number;
  totalWallets: number;
  filtered: number;
  uniqueAddresses: number;
}

interface ExplorationListProps {
  travelId: number;
  className?: string;
}

type CategoryFilter = 'all' | 'contract' | 'wallet';

const chainNames: Record<number, string> = {
  97: 'BSC 测试网',
  11155111: 'Sepolia',
  7001: 'ZetaChain',
};

export function ExplorationList({ travelId, className = '' }: ExplorationListProps) {
  const [explorations, setExplorations] = useState<Exploration[]>([]);
  const [summary, setSummary] = useState<ExplorationSummary>({ 
    totalAll: 0, totalContracts: 0, totalWallets: 0, filtered: 0, uniqueAddresses: 0 
  });
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchExplorations = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(
        `/api/travels/${travelId}/explorations?category=${category}&offset=${currentOffset}&limit=20`
      );
      const data = await response.json();

      if (data.success && data.data) {
        if (reset) {
          setExplorations(data.data.explorations);
        } else {
          setExplorations(prev => [...prev, ...data.data.explorations]);
        }
        setSummary(data.data.summary);
        // 使用新的 pagination 对象
        if (data.data.pagination) {
          setOffset(data.data.pagination.offset + data.data.explorations.length);
          setHasMore(data.data.pagination.hasMore);
        } else {
          // 兼容旧格式
          setOffset(currentOffset + data.data.explorations.length);
          setHasMore(data.data.hasMore ?? false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch explorations:', error);
      setError('加载探索记录失败');
    } finally {
      setLoading(false);
    }
  }, [travelId, category, offset]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchExplorations(true);
  }, [travelId, category]);

  const handleLoadMore = () => {
    fetchExplorations(false);
  };

  const handleCategoryChange = (newCategory: CategoryFilter) => {
    if (newCategory !== category) {
      setCategory(newCategory);
    }
  };

  const formatAddress = (address: string | null) => {
    if (!address) return '未知地址';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && explorations.length === 0) {
    return (
      <div className={`bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="text-3xl"
          >
            🔍
          </motion.div>
          <span className="ml-2 text-gray-500">加载探索记录...</span>
        </div>
      </div>
    );
  }

  if (error && explorations.length === 0) {
    return (
      <div className={`bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20 ${className}`}>
        <div className="text-center py-8 text-red-500">
          <span className="text-4xl block mb-2">⚠️</span>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/50 backdrop-blur rounded-xl p-6 border border-white/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="text-2xl mr-2">🔗</span>
          链上探索记录
        </h3>
        <span className="text-sm text-gray-500">
          已探索 {summary.uniqueAddresses} 个地址
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-2 mb-4 border-b border-gray-200 pb-2">
        <button
          onClick={() => handleCategoryChange('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            category === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部 ({summary.totalAll})
        </button>
        <button
          onClick={() => handleCategoryChange('contract')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            category === 'contract'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📜 合约 ({summary.totalContracts})
        </button>
        <button
          onClick={() => handleCategoryChange('wallet')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            category === 'wallet'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          👛 钱包 ({summary.totalWallets})
        </button>
      </div>

      {/* Explorations List */}
      {explorations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl block mb-2">🐸</span>
          暂无探索记录
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          <AnimatePresence>
            {explorations.map((exp, index) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  {/* Icon & Address Info */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xl" title={exp.isContract ? '智能合约' : '钱包地址'}>
                      {exp.isContract ? '📜' : '👛'}
                    </span>
                    <div>
                      <div className="flex items-baseline space-x-2">
                        {exp.exploredUrl ? (
                            <a 
                                href={exp.exploredUrl}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-blue-600 hover:underline font-medium"
                            >
                                {formatAddress(exp.exploredAddress)}
                            </a>
                        ) : (
                            <span className="font-mono text-sm text-gray-800">
                                {formatAddress(exp.exploredAddress)}
                            </span>
                        )}
                        {exp.chainName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                                {exp.chainSymbol || exp.chainName}
                            </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 text-xs text-gray-400 mt-0.5">
                         <span>Block</span>
                         {exp.blockUrl ? (
                             <a 
                                href={exp.blockUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-600 hover:underline"
                             >
                                 #{exp.blockNumber}
                             </a>
                         ) : (
                             <span>#{exp.blockNumber}</span>
                         )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Time */}
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatTime(exp.timestamp)}
                  </span>
                </div>

                {/* AI / Content Message */}
                {(exp.aiAnalysis || exp.message) && (
                  <div className="mt-2 text-sm text-gray-600 bg-purple-50/50 rounded p-2 border-l-2 border-purple-300">
                    <div className="text-[10px] font-bold text-purple-400 mb-0.5 uppercase tracking-wider flex items-center">
                        <span className="mr-1">🤖</span> 
                        {exp.source === 'discovery' ? 'Chain AI Analysis' : 'Interaction Log'}
                    </div>
                    {exp.aiAnalysis || exp.message}
                  </div>
                )}

                {/* Tx Link */}
                {exp.txUrl && (
                  <div className="mt-2 flex justify-end">
                      <a
                        href={exp.txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-blue-500 hover:text-blue-700 hover:underline bg-blue-50 px-2 py-1 rounded"
                      >
                        <span>查看链上交易</span>
                        <span className="ml-1">↗</span>
                      </a>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          className="w-full mt-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          加载更多...
        </button>
      )}
    </div>
  );
}
