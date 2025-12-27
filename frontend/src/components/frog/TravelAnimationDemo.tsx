/**
 * 旅行动画演示组件
 * 用于展示完整的旅行动画序列
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TravelAnimation, TravelAnimationPhase } from './TravelAnimation';
import { useTravelAnimation } from '../../hooks/useTravelAnimation';

interface TravelAnimationDemoProps {
  /** 是否显示控制面板 */
  showControls?: boolean;
  /** 自动播放 */
  autoPlay?: boolean;
  /** 旅行时长（毫秒） */
  travelDuration?: number;
  /** 目的地链 */
  destinationChain?: string;
}

// 纪念品列表
const SOUVENIRS = ['🏔️', '🌊', '🏛️', '🎨', '🗿', '🌸', '🏰', '🎭', '🎪', '💎'];

export function TravelAnimationDemo({
  showControls = true,
  autoPlay = false,
  travelDuration = 5000,
  destinationChain = 'ethereum',
}: TravelAnimationDemoProps) {
  const {
    phase,
    progress,
    souvenirEmoji,
    isAnimating,
    startDepartureAnimation,
    startReturnAnimation,
    setPhase,
    resetAnimation,
    playFullTravelAnimation,
  } = useTravelAnimation();

  const [selectedChain, setSelectedChain] = useState(destinationChain);

  // 自动播放
  useEffect(() => {
    if (autoPlay && !isAnimating) {
      const randomSouvenir = SOUVENIRS[Math.floor(Math.random() * SOUVENIRS.length)];
      playFullTravelAnimation(selectedChain, travelDuration, randomSouvenir);
    }
  }, [autoPlay]);

  // 开始完整旅行
  const handleStartTravel = () => {
    const randomSouvenir = SOUVENIRS[Math.floor(Math.random() * SOUVENIRS.length)];
    playFullTravelAnimation(selectedChain, travelDuration, randomSouvenir);
  };

  // 阶段按钮数据
  const phaseButtons: { phase: TravelAnimationPhase; label: string; emoji: string }[] = [
    { phase: 'idle', label: '待机', emoji: '🐸' },
    { phase: 'preparing', label: '准备', emoji: '🎒' },
    { phase: 'departing', label: '出发', emoji: '👋' },
    { phase: 'traveling', label: '旅途', emoji: '✈️' },
    { phase: 'returning', label: '归来', emoji: '🏠' },
    { phase: 'arrived', label: '到达', emoji: '🎉' },
    { phase: 'writing', label: '日记', emoji: '📝' },
  ];

  // 链选项
  const chains = [
    { id: 'ethereum', name: 'Ethereum', emoji: '⟠' },
    { id: 'bsc', name: 'BSC', emoji: '🟡' },
    { id: 'polygon', name: 'Polygon', emoji: '🟣' },
    { id: 'arbitrum', name: 'Arbitrum', emoji: '🔵' },
    { id: 'zetachain', name: 'ZetaChain', emoji: '🟢' },
  ];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* 动画展示区 */}
      <div className="relative bg-gradient-to-b from-sky-100 to-emerald-100 
                      dark:from-gray-800 dark:to-gray-900
                      rounded-2xl p-8 shadow-xl">
        <TravelAnimation
          phase={phase}
          destinationChain={selectedChain}
          progress={progress}
          souvenirEmoji={souvenirEmoji}
          size={200}
        />
        
        {/* 状态指示器 */}
        <div className="absolute top-2 right-2 px-3 py-1 bg-white/80 dark:bg-gray-800/80 
                        rounded-full text-sm font-medium shadow">
          {phaseButtons.find(p => p.phase === phase)?.emoji} {phase}
        </div>
        
        {/* 进度条（旅途中显示） */}
        {phase === 'traveling' && (
          <div className="absolute bottom-2 left-4 right-4">
            <div className="text-xs text-center text-gray-600 dark:text-gray-400 mb-1">
              旅途进度: {Math.round(progress)}%
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 控制面板 */}
      {showControls && (
        <div className="w-full max-w-md space-y-4">
          {/* 链选择 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {chains.map(chain => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${selectedChain === chain.id 
                    ? 'bg-emerald-500 text-white shadow-lg scale-105' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {chain.emoji} {chain.name}
              </button>
            ))}
          </div>

          {/* 主要操作按钮 */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleStartTravel}
              disabled={isAnimating}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 
                         text-white font-semibold rounded-xl shadow-lg
                         hover:shadow-xl hover:scale-105 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 开始旅行
            </button>
            
            <button
              onClick={resetAnimation}
              className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 
                         font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600
                         transition-all"
            >
              ↺ 重置
            </button>
          </div>

          {/* 阶段快速切换 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {phaseButtons.map(({ phase: p, label, emoji }) => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${phase === p 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* 快捷操作 */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => startDepartureAnimation(selectedChain)}
              disabled={isAnimating}
              className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300
                         rounded-lg text-sm hover:bg-amber-200 dark:hover:bg-amber-800 transition-all
                         disabled:opacity-50"
            >
              👋 出发动画
            </button>
            
            <button
              onClick={() => startReturnAnimation(SOUVENIRS[Math.floor(Math.random() * SOUVENIRS.length)])}
              disabled={isAnimating}
              className="px-3 py-1.5 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300
                         rounded-lg text-sm hover:bg-pink-200 dark:hover:bg-pink-800 transition-all
                         disabled:opacity-50"
            >
              🏠 归来动画
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TravelAnimationDemo;
