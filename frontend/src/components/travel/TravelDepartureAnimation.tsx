import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Frog } from '../../types';

interface TravelDepartureAnimationProps {
  frogs: Frog[];           // 1-2 只青蛙
  targetChain: string;
  isPlaying: boolean;
  onComplete: () => void;
}

/**
 * 结伴旅行出发动画
 * 
 * 动画流程：
 * 1. 两只青蛙从两侧进入并聚集到中央
 * 2. 背起小书包（跳动动画）
 * 3. 挥手告别
 * 4. 一起蹦跳着跳出画面（往右上角）
 * 5. 显示 "出发啦！" 文字
 */
export const TravelDepartureAnimation: React.FC<TravelDepartureAnimationProps> = ({
  frogs,
  targetChain,
  isPlaying,
  onComplete,
}) => {
  const isTwoFrogs = frogs.length === 2;

  // 动画完成后回调
  React.useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        onComplete();
      }, 4000); // 4秒动画
      return () => clearTimeout(timer);
    }
  }, [isPlaying, onComplete]);

  if (!isPlaying) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-b from-sky-200 to-green-200 z-50 flex flex-col items-center justify-center overflow-hidden"
      >
        {/* 背景装饰 - 云朵 */}
        <motion.div
          className="absolute top-10 left-10 text-6xl"
          animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          ☁️
        </motion.div>
        <motion.div
          className="absolute top-20 right-20 text-4xl"
          animate={{ x: [0, -15, 0], y: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          ☁️
        </motion.div>

        {/* 青蛙容器 */}
        <div className="relative flex items-end justify-center gap-8 mb-8">
          {/* 第一只青蛙（主角） */}
          <motion.div
            initial={{ x: -200, opacity: 0 }}
            animate={{
              x: 300,
              y: -300,
              opacity: 0,
            }}
            transition={{
              duration: 4,
              times: [0, 0.3, 1],
            }}
            className="flex flex-col items-center"
          >
            <motion.div
              className="text-8xl"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 4 }}
            >
              🐸
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl -mt-2"
            >
              🎒
            </motion.div>
            <p className="text-sm font-semibold text-green-800 mt-2">
              {frogs[0]?.name || '青蛙'}
            </p>
          </motion.div>

          {/* 第二只青蛙（同伴） */}
          {isTwoFrogs && (
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 350, y: -350, opacity: 0 }}
              transition={{
                duration: 4,
                times: [0, 0.35, 1],
                delay: 0.2,
              }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="text-8xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 4, delay: 0.1 }}
              >
                🐸
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="text-3xl -mt-2"
              >
                🎒
              </motion.div>
              <p className="text-sm font-semibold text-green-800 mt-2">
                {frogs[1]?.name || '好友'}
              </p>
            </motion.div>
          )}
        </div>

        {/* 出发文字 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, type: 'spring' }}
          className="text-center"
        >
          <motion.h2
            className="text-4xl font-bold text-green-700 mb-2"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            {isTwoFrogs ? '🐸🐸 一起出发啦！' : '🐸 出发啦！'}
          </motion.h2>
          <p className="text-lg text-green-600">
            目标: {targetChain || 'ZetaChain'}
          </p>
        </motion.div>

        {/* 装饰 - 彩虹 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 0.5, y: 0 }}
          transition={{ delay: 2 }}
          className="absolute bottom-20 text-8xl"
        >
          🌈
        </motion.div>

        {/* 装饰 - 星星 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="absolute top-1/4 right-1/4"
        >
          <motion.span
            className="text-4xl"
            animate={{ scale: [1, 1.5, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ✨
          </motion.span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TravelDepartureAnimation;
