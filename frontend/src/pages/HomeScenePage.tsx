/**
 * 家场景演示页面
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HomeScene } from '../components/home/HomeScene';
import { FrogState } from '../types/frogAnimation';

// 示例纪念品数据
const DEMO_SOUVENIRS = [
  { id: '1', emoji: '🏔️', name: '雪山明信片', chain: 'ethereum', rarity: 'uncommon' as const },
  { id: '2', emoji: '🌊', name: '海浪贝壳', chain: 'polygon', rarity: 'common' as const },
  { id: '3', emoji: '💎', name: '钻石徽章', chain: 'zetachain', rarity: 'legendary' as const },
  { id: '4', emoji: '🏛️', name: '神殿拓片', chain: 'arbitrum', rarity: 'rare' as const },
  { id: '5', emoji: '🎨', name: '艺术画作', chain: 'bsc', rarity: 'uncommon' as const },
  { id: '6', emoji: '🗿', name: '石像拓印', chain: 'optimism', rarity: 'common' as const },
];

export function HomeScenePage() {
  const [sceneSize, setSceneSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [frogState, setFrogState] = useState<FrogState>(FrogState.IDLE);

  // 状态选项
  const stateOptions: { state: FrogState; label: string; emoji: string }[] = [
    { state: FrogState.IDLE, label: '待机', emoji: '😌' },
    { state: FrogState.HAPPY, label: '开心', emoji: '😊' },
    { state: FrogState.SLEEPING, label: '睡觉', emoji: '😴' },
    { state: FrogState.EATING, label: '吃东西', emoji: '🍽️' },
    { state: FrogState.EXCITED, label: '兴奋', emoji: '🤩' },
    { state: FrogState.ANGRY, label: '生气', emoji: '😤' },
    { state: FrogState.CRYING, label: '伤心', emoji: '😢' },
    { state: FrogState.RICH, label: '发财', emoji: '🤑' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50
                    dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-center mb-8 
                     bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
        >
          🏠 青蛙的小窝
        </motion.h1>

        {/* 控制面板 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-8">
          <div className="flex flex-wrap gap-4 justify-center items-center">
            {/* 尺寸选择 */}
            <div className="flex gap-2">
              <span className="text-sm text-gray-500 self-center">尺寸:</span>
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSceneSize(s)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all
                    ${sceneSize === s 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            {/* 状态选择 */}
            <div className="flex gap-1 flex-wrap justify-center">
              <span className="text-sm text-gray-500 self-center mr-1">状态:</span>
              {stateOptions.map(({ state, label, emoji }) => (
                <button
                  key={state}
                  onClick={() => setFrogState(state)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all
                    ${frogState === state 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 场景展示 */}
        <motion.div 
          layout
          className="flex justify-center"
        >
          <HomeScene
            frogId={1}
            frogName="小蛙"
            frogState={frogState}
            unreadDiaries={3}
            souvenirs={DEMO_SOUVENIRS}
            size={sceneSize}
            onStartTravel={() => console.log('开始旅行')}
            onFeed={(itemId) => console.log('喂食:', itemId)}
          />
        </motion.div>

        {/* 说明 */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>💡 点击道具栏选择道具，然后点击青蛙使用</p>
          <p>📫 点击邮箱查看旅行日记 | 🎒 选择背包后点击青蛙开始旅行</p>
        </div>
      </div>
    </div>
  );
}

export default HomeScenePage;
