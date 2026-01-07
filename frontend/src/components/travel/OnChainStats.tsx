/**
 * OnChainStats Component
 * 
 * Displays on-chain data during cross-chain travel:
 * - Block height explored
 * - Gas used
 * - Target chain info
 */

import { motion } from 'framer-motion';

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
}

function StatCard({ icon, label, value, subValue }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/70 backdrop-blur rounded-xl p-3 text-center shadow-sm border border-white/50"
    >
      <span className="text-2xl">{icon}</span>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="font-semibold text-gray-800 text-sm truncate">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-400 truncate">{subValue}</p>
      )}
    </motion.div>
  );
}

interface OnChainStatsProps {
  blockHeight?: number;
  gasUsed?: string;
  targetChain: string;
  exploredAddress?: string;
  transactionCount?: number;
}

export function OnChainStats({
  blockHeight,
  gasUsed,
  targetChain,
  exploredAddress,
  transactionCount,
}: OnChainStatsProps) {
  return (
    <div className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-xl p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        📊 链上数据
      </h4>
      
      <div className="grid grid-cols-3 gap-3">
        <StatCard 
          icon="🧱" 
          label="区块高度" 
          value={blockHeight ? `#${blockHeight.toLocaleString()}` : '扫描中...'} 
        />
        <StatCard 
          icon="⛽" 
          label="Gas 消耗" 
          value={gasUsed || '计算中...'} 
        />
        <StatCard 
          icon="🔗" 
          label="目标链" 
          value={targetChain} 
        />
      </div>
      
      {exploredAddress && (
        <div className="mt-3 bg-white/50 rounded-lg p-2 text-xs">
          <span className="text-gray-500">探索地址: </span>
          <span className="font-mono text-gray-700">
            {exploredAddress.slice(0, 6)}...{exploredAddress.slice(-4)}
          </span>
        </div>
      )}
    </div>
  );
}
