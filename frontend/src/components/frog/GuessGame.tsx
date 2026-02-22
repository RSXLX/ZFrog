/**
 * 🐸 宠物蛋系统 - 猜方向小游戏组件
 * 设计风格: Claymorphism
 * 玩法: 猜青蛙跳向左还是右，猜对获得 $LILY 奖励
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogNurtureActions, useLilyBalance } from '../../hooks/useFrogNurture';

interface GuessGameProps {
  frogId: number;
  ownerAddress: string;
  onComplete?: () => void;
}

// SVG 图标
const Icons = {
  ArrowLeft: () => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Lily: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.24 2 7 4.24 7 7c0 1.77.93 3.31 2.32 4.19C6.44 12.03 4.5 14.61 4.5 17.5c0 .28.02.55.05.82C5.5 21.16 8.5 23 12 23s6.5-1.84 7.45-4.68c.03-.27.05-.54.05-.82 0-2.89-1.94-5.47-4.82-6.31C16.07 10.31 17 8.77 17 7c0-2.76-2.24-5-5-5z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
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

type GameState = 'waiting' | 'playing' | 'result';

export function GuessGame({ frogId, ownerAddress, onComplete }: GuessGameProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [selectedGuess, setSelectedGuess] = useState<'left' | 'right' | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    actualDirection: string;
    reward: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const { playGuess } = useFrogNurtureActions(frogId);
  const { balance, refresh: refreshBalance } = useLilyBalance(ownerAddress);

  const handlePlay = async (guess: 'left' | 'right') => {
    setSelectedGuess(guess);
    setGameState('playing');
    setLoading(true);

    try {
      const response = await playGuess(guess);
      if (response?.success) {
        setResult({
          correct: response.correct,
          actualDirection: response.actualDirection,
          reward: response.reward,
        });
        setGameState('result');
        await refreshBalance();
        onComplete?.();
      }
    } catch (err) {
      console.error('游戏失败:', err);
      setGameState('waiting');
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setGameState('waiting');
    setSelectedGuess(null);
    setResult(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    resetGame();
  };

  return (
    <>
      {/* 入口按钮 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`
          ${clayStyles.button}
          bg-gradient-to-br from-purple-400 to-indigo-500
          text-white font-bold
          px-6 py-3 flex items-center gap-2
        `}
      >
        <span className="text-xl">🎮</span>
        <span>猜方向游戏</span>
      </motion.button>

      {/* 游戏弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`${clayStyles.card} p-6 w-full max-w-md`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题栏 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>🎮</span> 猜方向
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeModal}
                  className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:text-gray-700"
                >
                  <Icons.Close />
                </motion.button>
              </div>

              {/* 余额显示 */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700">
                  <Icons.Lily />
                  <span className="font-bold">{balance?.balance || 0}</span>
                  <span className="text-sm text-purple-500">$LILY</span>
                </div>
              </div>

              {/* 游戏区域 */}
              <div className="relative h-48 mb-6">
                {/* 青蛙 */}
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl"
                  animate={
                    gameState === 'playing'
                      ? { x: [0, -10, 10, -10, 10, 0], y: [0, -5, 0, -5, 0] }
                      : gameState === 'result' && result
                      ? { x: result.actualDirection === 'left' ? -80 : 80 }
                      : { y: [0, -5, 0] }
                  }
                  transition={
                    gameState === 'playing'
                      ? { duration: 0.8, repeat: Infinity }
                      : gameState === 'result'
                      ? { duration: 0.5, ease: 'easeOut' }
                      : { duration: 1.5, repeat: Infinity }
                  }
                >
                  🐸
                </motion.div>

                {/* 方向指示 */}
                {gameState === 'waiting' && (
                  <>
                    <motion.div
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                      animate={{ x: [0, -5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ⬅️
                    </motion.div>
                    <motion.div
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ➡️
                    </motion.div>
                  </>
                )}
              </div>

              {/* 状态内容 */}
              {gameState === 'waiting' && (
                <>
                  <p className="text-center text-gray-600 mb-6">
                    猜猜青蛙会跳向哪边？猜对可获得 10-30 $LILY！
                  </p>
                  
                  {/* 选择按钮 */}
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handlePlay('left')}
                      disabled={loading}
                      className={`
                        ${clayStyles.button}
                        bg-gradient-to-br from-blue-400 to-cyan-500
                        text-white font-bold py-4 flex items-center justify-center gap-2
                      `}
                    >
                      <Icons.ArrowLeft />
                      <span>左边</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handlePlay('right')}
                      disabled={loading}
                      className={`
                        ${clayStyles.button}
                        bg-gradient-to-br from-orange-400 to-rose-500
                        text-white font-bold py-4 flex items-center justify-center gap-2
                      `}
                    >
                      <span>右边</span>
                      <Icons.ArrowRight />
                    </motion.button>
                  </div>
                </>
              )}

              {gameState === 'playing' && (
                <div className="text-center">
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-600"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                    <span>青蛙在思考...</span>
                  </motion.div>
                </div>
              )}

              {gameState === 'result' && result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  {result.correct ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-5xl mb-4"
                      >
                        🎉
                      </motion.div>
                      <p className="text-2xl font-bold text-green-600 mb-2">恭喜猜对！</p>
                      <div className="flex items-center justify-center gap-2 text-lg text-purple-600">
                        <span>获得</span>
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="font-bold flex items-center gap-1"
                        >
                          <Icons.Lily />
                          {result.reward}
                        </motion.span>
                        <span>$LILY</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl mb-4">😅</div>
                      <p className="text-2xl font-bold text-gray-600 mb-2">猜错了~</p>
                      <p className="text-gray-500">
                        青蛙跳向了{result.actualDirection === 'left' ? '左边' : '右边'}
                      </p>
                    </>
                  )}

                  {/* 再玩一次 */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={resetGame}
                    className={`
                      ${clayStyles.button}
                      bg-gradient-to-br from-purple-400 to-indigo-500
                      text-white font-bold px-6 py-3 mt-6
                    `}
                  >
                    再玩一次
                  </motion.button>
                </motion.div>
              )}

              {/* 每日次数提示 */}
              <p className="text-center text-xs text-gray-400 mt-4">
                每日可玩 5 次，最多获得 150 $LILY
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default GuessGame;
