/**
 * Travel Mode Selector Component
 * 
 * Unified entry point for travel features
 * Guides users to choose between:
 * - Local Exploration (free, no gas)
 * - Cross-Chain Travel (explore other blockchains)
 * - Group Travel (travel with friends)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TravelModeSelectorProps {
  tokenId: number;
  frogId: number;
  frogName: string;
  onSelectLocalExploration: () => void;
  onSelectCrossChain: () => void;
  onSelectGroupTravel?: () => void;
  hasIdleFriends?: boolean; // 是否有空闲好友
}

export function TravelModeSelector({
  tokenId,
  frogId,
  frogName,
  onSelectLocalExploration,
  onSelectCrossChain,
  onSelectGroupTravel,
  hasIdleFriends = true,
}: TravelModeSelectorProps) {
  const [hoveredMode, setHoveredMode] = useState<'local' | 'crosschain' | 'group' | null>(null);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Local Exploration Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onMouseEnter={() => setHoveredMode('local')}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={onSelectLocalExploration}
          className={`
            relative p-5 rounded-2xl cursor-pointer transition-all duration-300
            border-2 ${hoveredMode === 'local' ? 'border-green-400 shadow-lg' : 'border-gray-200'}
            bg-gradient-to-br from-green-50 to-emerald-50
          `}
        >
          {/* Free Badge */}
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            免费
          </div>

          <div className="text-center">
            <div className="text-3xl mb-2">🌿</div>
            <h3 className="text-base font-bold text-gray-800">本地探索</h3>
            <p className="text-xs text-gray-500 mt-1">
              ZetaChain 自由探索
            </p>
            
            <ul className="mt-3 space-y-1 text-xs text-gray-500 text-left">
              <li className="flex items-center gap-1">
                <span className="text-green-500">✓</span> 免费体验
              </li>
              <li className="flex items-center gap-1">
                <span className="text-green-500">✓</span> 快速完成
              </li>
            </ul>
          </div>

          <div className="mt-3 text-center">
            <span className="text-xs text-green-600 font-medium">
              新手推荐 →
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
            relative p-5 rounded-2xl cursor-pointer transition-all duration-300
            border-2 ${hoveredMode === 'crosschain' ? 'border-purple-400 shadow-lg shadow-purple-100' : 'border-gray-200'}
            bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50
          `}
        >
          {/* Recommended Badge */}
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            ⭐ 推荐
          </div>

          <div className="text-center">
            <div className="text-3xl mb-2">🌉</div>
            <h3 className="text-base font-bold text-gray-800">跨链旅行</h3>
            <p className="text-xs text-gray-500 mt-1">
              探索 BSC、Sepolia
            </p>
            
            <ul className="mt-3 space-y-1 text-xs text-gray-500 text-left">
              <li className="flex items-center gap-1">
                <span className="text-purple-500">✓</span> 真正跨链
              </li>
              <li className="flex items-center gap-1">
                <span className="text-purple-500">✓</span> AI 旅行日记
              </li>
            </ul>
          </div>

          <div className="mt-3 text-center">
            <span className="text-xs text-purple-600 font-medium">
              跨链魔法 →
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

        {/* Group Travel Card - 新增 */}
        {onSelectGroupTravel && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => setHoveredMode('group')}
            onMouseLeave={() => setHoveredMode(null)}
            onClick={onSelectGroupTravel}
            className={`
              relative p-5 rounded-2xl cursor-pointer transition-all duration-300
              border-2 ${hoveredMode === 'group' ? 'border-pink-400 shadow-lg shadow-pink-100' : 'border-gray-200'}
              bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50
            `}
          >
            {/* Social Badge */}
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              🐸🐸 社交
            </div>

            <div className="text-center">
              <div className="text-3xl mb-2">👫</div>
              <h3 className="text-base font-bold text-gray-800">结伴旅行</h3>
              <p className="text-xs text-gray-500 mt-1">
                与好友一起出发
              </p>
              
              <ul className="mt-3 space-y-1 text-xs text-gray-500 text-left">
                <li className="flex items-center gap-1">
                  <span className="text-pink-500">✓</span> 双倍乐趣
                </li>
                <li className="flex items-center gap-1">
                  <span className="text-pink-500">✓</span> 增进友情值
                </li>
              </ul>
            </div>

            <div className="mt-3 text-center">
              <span className="text-xs text-pink-600 font-medium">
                邀请好友 →
              </span>
            </div>

            {/* Animated glow effect */}
            {hoveredMode === 'group' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-400/10 to-orange-400/10 pointer-events-none"
              />
            )}
          </motion.div>
        )}
      </div>

      {/* Info Footer */}
      <div className="text-center text-xs text-gray-400">
        <p>跨链旅行需要少量 ZETA 作为 Gas 费用</p>
        <p className="mt-1">结伴旅行可获得友情值奖励</p>
      </div>
    </div>
  );
}
