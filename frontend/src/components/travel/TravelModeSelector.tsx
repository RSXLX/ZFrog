/**
 * Travel Mode Selector Component
 * 
 * Unified entry point for travel features
 * Guides users to choose between:
 * - Local Exploration (free, no gas)
 * - Cross-Chain Travel (explore other blockchains)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TravelModeSelectorProps {
  tokenId: number;
  frogId: number;
  frogName: string;
  onSelectLocalExploration: () => void;
  onSelectCrossChain: () => void;
}

export function TravelModeSelector({
  tokenId,
  frogId,
  frogName,
  onSelectLocalExploration,
  onSelectCrossChain,
}: TravelModeSelectorProps) {
  const [hoveredMode, setHoveredMode] = useState<'local' | 'crosschain' | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          🐸 {frogName} 想去哪里探险？
        </h2>
        <p className="text-gray-500 mt-2">选择旅行方式</p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Exploration Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onMouseEnter={() => setHoveredMode('local')}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={onSelectLocalExploration}
          className={`
            relative p-6 rounded-2xl cursor-pointer transition-all duration-300
            border-2 ${hoveredMode === 'local' ? 'border-green-400 shadow-lg' : 'border-gray-200'}
            bg-gradient-to-br from-green-50 to-emerald-50
          `}
        >
          {/* Free Badge */}
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            免费
          </div>

          <div className="flex items-start gap-4">
            <div className="text-4xl">🌿</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800">本地探索</h3>
              <p className="text-sm text-gray-600 mt-1">
                在 ZetaChain 上自由探索，无需 Gas
              </p>
              
              <ul className="mt-3 space-y-1 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 免费体验
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 快速完成
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 探索区块发现
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-400">○</span> 无 NFT 凭证
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-sm text-green-600 font-medium">
              适合新手体验 →
            </span>
          </div>
        </motion.div>

        {/* Cross-Chain Travel Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onMouseEnter={() => setHoveredMode('crosschain')}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={onSelectCrossChain}
          className={`
            relative p-6 rounded-2xl cursor-pointer transition-all duration-300
            border-2 ${hoveredMode === 'crosschain' ? 'border-purple-400 shadow-lg shadow-purple-100' : 'border-gray-200'}
            bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50
          `}
        >
          {/* Recommended Badge */}
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            ⭐ 推荐
          </div>

          <div className="flex items-start gap-4">
            <div className="text-4xl">🌉</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800">跨链旅行</h3>
              <p className="text-sm text-gray-600 mt-1">
                穿越彩虹桥，探索 BSC、Sepolia 等链
              </p>
              
              <ul className="mt-3 space-y-1 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="text-purple-500">✓</span> 真正的跨链体验
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500">✓</span> NFT 锁定证明
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500">✓</span> 目标链区块探索
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500">✓</span> AI 生成旅行日记
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-sm text-purple-600 font-medium">
              体验 ZetaChain 跨链魔法 →
            </span>
          </div>

          {/* Animated glow effect */}
          {hoveredMode === 'crosschain' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/10 to-blue-400/10 pointer-events-none"
            />
          )}
        </motion.div>
      </div>

      {/* Info Footer */}
      <div className="text-center text-xs text-gray-400">
        <p>跨链旅行需要少量 ZETA 作为 Gas 费用</p>
        <p className="mt-1">本地探索完全免费，适合初次体验</p>
      </div>
    </div>
  );
}
