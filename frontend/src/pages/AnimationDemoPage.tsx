/**
 * 动画演示页面
 * 展示所有青蛙动画效果
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TravelAnimationDemo } from '../components/frog/TravelAnimationDemo';
import { TravelAnimation, TravelAnimationPhase } from '../components/frog/TravelAnimation';

export function AnimationDemoPage() {
  const [activeTab, setActiveTab] = useState<'travel' | 'states' | 'interactions'>('travel');

  const tabs = [
    { id: 'travel', label: '旅行动画', emoji: '✈️' },
    { id: 'states', label: '状态动画', emoji: '🐸' },
    { id: 'interactions', label: '互动动画', emoji: '👆' },
  ] as const;

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
          🐸 ZetaFrog 动画系统
        </motion.h1>

        {/* 标签页 */}
        <div className="flex justify-center gap-2 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 shadow-lg scale-105 text-emerald-600 dark:text-emerald-400'
                  : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
                }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8"
        >
          {activeTab === 'travel' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">旅行动画序列</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  展示青蛙旅行的完整动画：准备→出发→旅途→归来→写日记
                </p>
              </div>
              
              <TravelAnimationDemo 
                showControls={true}
                travelDuration={5000}
              />

              {/* 动画阶段说明 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {[
                  { phase: '准备', emoji: '🎒', desc: '背上背包' },
                  { phase: '出发', emoji: '👋', desc: '挥手告别' },
                  { phase: '旅途', emoji: '✈️', desc: '探索中...' },
                  { phase: '归来', emoji: '🎁', desc: '带回纪念品' },
                ].map((item, i) => (
                  <div key={i} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="text-2xl mb-1">{item.emoji}</div>
                    <div className="font-medium text-sm">{item.phase}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'states' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">状态动画预览</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  不同状态下的青蛙表情和动画
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { state: 'idle', label: '待机', emoji: '😌' },
                  { state: 'traveling', label: '旅行中', emoji: '🎒' },
                  { state: 'returning', label: '归来', emoji: '🎁' },
                  { state: 'writing', label: '写日记', emoji: '📝' },
                  { state: 'arrived', label: '到达', emoji: '🎉' },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex flex-col items-center p-4 bg-gradient-to-b from-sky-50 to-emerald-50
                               dark:from-gray-700 dark:to-gray-800 rounded-xl"
                  >
                    <TravelAnimation
                      phase={item.state as TravelAnimationPhase}
                      size={120}
                    />
                    <div className="mt-2 font-medium">{item.emoji} {item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interactions' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">互动动画</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  点击、拖拽、喂食等交互动画
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {[
                  { action: '点击', emoji: '👆', response: '眨眼微笑' },
                  { action: '多次点击', emoji: '👆👆👆', response: '生气脸红' },
                  { action: '拖拽', emoji: '✋', response: '惊慌乱舞' },
                  { action: '喂食', emoji: '🍀', response: '开心吃东西' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gradient-to-r from-amber-50 to-orange-50
                               dark:from-gray-700 dark:to-gray-800 rounded-xl cursor-pointer"
                  >
                    <div className="text-2xl mb-2">{item.emoji}</div>
                    <div className="font-medium">{item.action}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      反应: {item.response}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="text-center text-sm text-gray-500 mt-4">
                💡 在主页的青蛙上尝试这些互动！
              </div>
            </div>
          )}
        </motion.div>

        {/* 技术说明 */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>使用 Framer Motion + SVG 实现 | 支持 Tauri 桌面模式</p>
        </div>
      </div>
    </div>
  );
}

export default AnimationDemoPage;
