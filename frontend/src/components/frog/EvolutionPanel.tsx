/**
 * 🐸 宠物蛋系统 - 进化选择面板
 * 设计风格: Claymorphism
 * 功能: 展示进化条件、选择进化类型、播放进化动画
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogNurtureActions } from '../../hooks/useFrogNurture';

interface EvolutionPanelProps {
  frogId: number;
  canEvolve: boolean;
  currentType: string | null;
  level: number;
  onEvolved?: () => void;
}

// SVG 图标
const Icons = {
  Explorer: () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Scholar: () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 6h8M8 10h8M8 14h4" />
    </svg>
  ),
  Social: () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
};

// Claymorphism 样式
const clayStyles = {
  card: `
    bg-gradient-to-br from-white to-gray-50
    rounded-3xl
    shadow-[8px_8px_16px_rgba(163,177,198,0.6),-8px_-8px_16px_rgba(255,255,255,0.8)]
    border border-white/50
  `,
  button: `
    rounded-2xl
    shadow-[4px_4px_8px_rgba(163,177,198,0.5),-4px_-4px_8px_rgba(255,255,255,0.8)]
    hover:shadow-[2px_2px_4px_rgba(163,177,198,0.5),-2px_-2px_4px_rgba(255,255,255,0.8)]
    active:shadow-inner
    transition-all duration-200 ease-out
    cursor-pointer
  `,
};

// 进化类型配置
const evolutionTypes = [
  {
    id: 'explorer' as const,
    name: '探险家',
    icon: Icons.Explorer,
    color: 'from-blue-400 to-cyan-500',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    bonus: '旅行奖励 +15%',
    description: '热爱探索未知的冒险者，每次旅行都能发现更多宝物',
    trait: '好奇心旺盛',
  },
  {
    id: 'scholar' as const,
    name: '学者',
    icon: Icons.Scholar,
    color: 'from-purple-400 to-indigo-500',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    bonus: 'AI对话更深度',
    description: '追求知识的智者，与AI的对话更加有深度和启发性',
    trait: '博学多才',
  },
  {
    id: 'social' as const,
    name: '社交家',
    icon: Icons.Social,
    color: 'from-pink-400 to-rose-500',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-600',
    bonus: '好友上限 +10',
    description: '广交朋友的交际达人，能结交更多的青蛙好友',
    trait: '人缘极佳',
  },
];

export function EvolutionPanel({
  frogId,
  canEvolve,
  currentType,
  level,
  onEvolved,
}: EvolutionPanelProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { evolve, actionLoading } = useFrogNurtureActions(frogId);

  // 已经进化过
  if (currentType) {
    const evolvedType = evolutionTypes.find((t) => t.id === currentType);
    if (!evolvedType) return null;

    return (
      <motion.div
        className={clayStyles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Icons.Star />
            进化形态
          </h3>

          <div className={`p-4 rounded-2xl ${evolvedType.bgColor} flex items-center gap-4`}>
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${evolvedType.color} flex items-center justify-center text-white shadow-lg`}
            >
              <evolvedType.icon />
            </div>
            <div>
              <h4 className={`text-xl font-bold ${evolvedType.textColor}`}>
                {evolvedType.name}
              </h4>
              <p className="text-sm text-gray-600">{evolvedType.trait}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">
                🎁 {evolvedType.bonus}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 不能进化
  if (!canEvolve) {
    return (
      <motion.div
        className={`${clayStyles.card} p-6`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
            <Icons.Lock />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">进化尚未解锁</h3>
          <p className="text-sm text-gray-500 mb-4">
            青蛙需要达到 <span className="font-bold text-gray-700">10级</span> 才能进化
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-gray-500">当前等级:</span>
            <span className="font-bold text-gray-800">Lv.{level}</span>
            <span className="text-gray-400">/ 10</span>
          </div>
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[200px] mx-auto">
            <motion.div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (level / 10) * 100)}%` }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  // 进化选择
  const handleEvolve = async () => {
    if (!selectedType) return;

    setIsEvolving(true);
    try {
      await evolve(selectedType as 'explorer' | 'scholar' | 'social');
      setShowSuccess(true);
      setTimeout(() => {
        onEvolved?.();
      }, 2000);
    } catch (err) {
      console.error('进化失败:', err);
    } finally {
      setIsEvolving(false);
    }
  };

  return (
    <motion.div
      className={clayStyles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 进化成功动画 */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 rounded-3xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              className="text-center"
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                transition={{ duration: 1 }}
              >
                ✨
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800">进化成功！</h3>
              <p className="text-gray-600 mt-2">
                你的青蛙已成为{' '}
                <span className="font-bold">
                  {evolutionTypes.find((t) => t.id === selectedType)?.name}
                </span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Icons.Star />
          选择进化方向
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          进化后将获得永久特殊能力，且不可更改
        </p>

        {/* 进化选项 */}
        <div className="space-y-3">
          {evolutionTypes.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedType(type.id)}
                className={`
                  w-full p-4 rounded-2xl text-left transition-all duration-200
                  ${isSelected
                    ? `bg-gradient-to-br ${type.color} text-white shadow-lg`
                    : `bg-white hover:bg-gray-50 shadow-sm border border-gray-100`
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`
                      w-14 h-14 rounded-xl flex items-center justify-center
                      ${isSelected ? 'bg-white/20' : type.bgColor}
                      ${isSelected ? 'text-white' : type.textColor}
                    `}
                  >
                    <type.icon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                        {type.name}
                      </h4>
                      <span
                        className={`
                          text-xs px-2 py-0.5 rounded-full
                          ${isSelected ? 'bg-white/20 text-white' : `${type.bgColor} ${type.textColor}`}
                        `}
                      >
                        {type.trait}
                      </span>
                    </div>
                    <p
                      className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-500'} mt-1`}
                    >
                      {type.description}
                    </p>
                    <p
                      className={`text-sm font-medium mt-2 ${
                        isSelected ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      🎁 {type.bonus}
                    </p>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                    >
                      <Icons.Check />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* 确认按钮 */}
        <motion.button
          whileHover={{ scale: selectedType ? 1.02 : 1 }}
          whileTap={{ scale: selectedType ? 0.98 : 1 }}
          onClick={handleEvolve}
          disabled={!selectedType || isEvolving || actionLoading === 'evolve'}
          className={`
            w-full mt-4 py-4 rounded-2xl font-bold text-lg
            ${selectedType
              ? `${clayStyles.button} bg-gradient-to-br from-amber-400 to-orange-500 text-white`
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isEvolving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              进化中...
            </span>
          ) : (
            '确认进化'
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default EvolutionPanel;
