/**
 * 🐸 宠物蛋系统 - 接虫子小游戏
 * 玩法：控制青蛙左右移动，接住从天而降的虫子
 * 解锁条件：Lv.3
 * 奖励：幸福度+15, 20-50$LILY
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';

interface CatchBugGameProps {
  frogId: number;
  ownerAddress: string;
  onComplete?: () => void;
}

interface Bug {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: 'normal' | 'golden' | 'poison';
}

interface GameState {
  score: number;
  lives: number;
  level: number;
  isPlaying: boolean;
  isGameOver: boolean;
  bugs: Bug[];
  frogX: number;
}

const GAME_WIDTH = 300;
const GAME_HEIGHT = 400;
const FROG_WIDTH = 60;
const BUG_SIZE = 30;
const INITIAL_LIVES = 3;

export function CatchBugGame({ frogId, ownerAddress, onComplete }: CatchBugGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: INITIAL_LIVES,
    level: 1,
    isPlaying: false,
    isGameOver: false,
    bugs: [],
    frogX: GAME_WIDTH / 2 - FROG_WIDTH / 2,
  });
  
  const [showModal, setShowModal] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [reward, setReward] = useState<{ lily: number; happiness: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const gameRef = useRef<HTMLDivElement>(null);
  const bugIdRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);

  // 检查剩余游戏次数
  const checkRemaining = async () => {
    try {
      const response: any = await apiService.get(`/nurture/${frogId}/game-remaining?game=catch_bug`);
      if (response.success) {
        setRemaining(response.remaining);
      }
    } catch (err) {
      console.error('Failed to check remaining:', err);
    }
  };

  useEffect(() => {
    checkRemaining();
  }, [frogId]);

  // 键盘控制
  useEffect(() => {
    if (!gameState.isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setGameState(prev => ({
          ...prev,
          frogX: Math.max(0, prev.frogX - 20),
        }));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setGameState(prev => ({
          ...prev,
          frogX: Math.min(GAME_WIDTH - FROG_WIDTH, prev.frogX + 20),
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isPlaying]);

  // 触摸/鼠标控制
  const handleMove = useCallback((clientX: number) => {
    if (!gameRef.current || !gameState.isPlaying) return;
    
    const rect = gameRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const newX = Math.max(0, Math.min(GAME_WIDTH - FROG_WIDTH, relativeX - FROG_WIDTH / 2));
    
    setGameState(prev => ({ ...prev, frogX: newX }));
  }, [gameState.isPlaying]);

  // 生成虫子
  const spawnBug = useCallback(() => {
    const type: Bug['type'] = Math.random() < 0.1 ? 'golden' : 
                              Math.random() < 0.15 ? 'poison' : 'normal';
    
    const bug: Bug = {
      id: bugIdRef.current++,
      x: Math.random() * (GAME_WIDTH - BUG_SIZE),
      y: -BUG_SIZE,
      speed: 2 + gameState.level * 0.5 + Math.random() * 2,
      type,
    };
    
    setGameState(prev => ({
      ...prev,
      bugs: [...prev.bugs, bug],
    }));
  }, [gameState.level]);

  // 游戏循环
  const gameLoop = useCallback(() => {
    const now = Date.now();
    
    // 生成新虫子
    if (now - lastSpawnRef.current > (1500 - gameState.level * 100)) {
      spawnBug();
      lastSpawnRef.current = now;
    }
    
    setGameState(prev => {
      if (!prev.isPlaying || prev.isGameOver) return prev;
      
      let newScore = prev.score;
      let newLives = prev.lives;
      const frogLeft = prev.frogX;
      const frogRight = prev.frogX + FROG_WIDTH;
      
      // 更新虫子位置并检测碰撞
      const remainingBugs: Bug[] = [];
      
      for (const bug of prev.bugs) {
        const newY = bug.y + bug.speed;
        
        // 检测是否被接住
        const bugLeft = bug.x;
        const bugRight = bug.x + BUG_SIZE;
        const caught = newY >= GAME_HEIGHT - 60 && 
                       newY <= GAME_HEIGHT - 30 &&
                       bugRight >= frogLeft && 
                       bugLeft <= frogRight;
        
        if (caught) {
          if (bug.type === 'poison') {
            newLives -= 1;
          } else if (bug.type === 'golden') {
            newScore += 30;
          } else {
            newScore += 10;
          }
        } else if (newY > GAME_HEIGHT) {
          // 虫子掉出屏幕
          if (bug.type !== 'poison') {
            newLives -= 1;
          }
        } else {
          // 虫子继续下落
          remainingBugs.push({ ...bug, y: newY });
        }
      }
      
      // 检查游戏结束
      if (newLives <= 0) {
        return {
          ...prev,
          score: newScore,
          lives: 0,
          isGameOver: true,
          isPlaying: false,
          bugs: [],
        };
      }
      
      // 升级检查
      const newLevel = Math.floor(newScore / 100) + 1;
      
      return {
        ...prev,
        score: newScore,
        lives: newLives,
        level: Math.min(newLevel, 10),
        bugs: remainingBugs,
      };
    });
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [spawnBug, gameState.level]);

  // 开始游戏
  const startGame = () => {
    if (remaining !== null && remaining <= 0) {
      setError('今日游戏次数已用完');
      return;
    }
    
    setGameState({
      score: 0,
      lives: INITIAL_LIVES,
      level: 1,
      isPlaying: true,
      isGameOver: false,
      bugs: [],
      frogX: GAME_WIDTH / 2 - FROG_WIDTH / 2,
    });
    setShowModal(true);
    setError(null);
    setReward(null);
    bugIdRef.current = 0;
    lastSpawnRef.current = Date.now();
  };

  // 启动游戏循环
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isGameOver) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isGameOver, gameLoop]);

  // 游戏结束处理
  useEffect(() => {
    if (gameState.isGameOver && gameState.score > 0) {
      submitScore(gameState.score);
    }
  }, [gameState.isGameOver, gameState.score]);

  // 提交分数
  const submitScore = async (score: number) => {
    try {
      setLoading(true);
      const response: any = await apiService.post(`/nurture/${frogId}/play/catch-bug`, {
        score,
      });
      
      if (response.success) {
        setReward({
          lily: response.lilyEarned,
          happiness: response.happiness,
        });
        setRemaining(prev => prev !== null ? prev - 1 : null);
        onComplete?.();
      }
    } catch (err: any) {
      setError(err.message || '提交分数失败');
    } finally {
      setLoading(false);
    }
  };

  // 关闭弹窗
  const closeModal = () => {
    setShowModal(false);
    setGameState(prev => ({ ...prev, isPlaying: false, isGameOver: false }));
  };

  return (
    <>
      {/* 游戏入口卡片 */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 
                   border-2 border-amber-200 cursor-pointer
                   shadow-[4px_4px_8px_#e0e0e0,-4px_-4px_8px_#ffffff]"
        onClick={startGame}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐛</span>
          <div>
            <div className="font-medium text-gray-800">接虫子</div>
            <div className="text-xs text-gray-500">
              控制青蛙接住虫子 
              {remaining !== null && (
                <span className="ml-1 text-amber-600">({remaining}次)</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 游戏弹窗 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-4"
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">🐛 接虫子</h3>
                <div className="flex justify-center gap-6 mt-2 text-sm">
                  <span className="text-amber-600">分数: {gameState.score}</span>
                  <span className="text-red-500">❤️ x {gameState.lives}</span>
                  <span className="text-purple-600">Lv.{gameState.level}</span>
                </div>
              </div>

              {/* 游戏区域 */}
              <div
                ref={gameRef}
                className="relative mx-auto bg-gradient-to-b from-sky-200 to-green-200 
                           rounded-xl overflow-hidden cursor-pointer"
                style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
                onMouseMove={e => handleMove(e.clientX)}
                onTouchMove={e => handleMove(e.touches[0].clientX)}
              >
                {/* 虫子们 */}
                {gameState.bugs.map(bug => (
                  <motion.div
                    key={bug.id}
                    className="absolute text-2xl"
                    style={{
                      left: bug.x,
                      top: bug.y,
                      width: BUG_SIZE,
                      height: BUG_SIZE,
                    }}
                  >
                    {bug.type === 'golden' ? '✨' : bug.type === 'poison' ? '💀' : '🐛'}
                  </motion.div>
                ))}

                {/* 青蛙 */}
                <motion.div
                  className="absolute bottom-4 text-4xl"
                  style={{
                    left: gameState.frogX,
                    width: FROG_WIDTH,
                  }}
                  animate={{ x: 0 }}
                >
                  🐸
                </motion.div>

                {/* 游戏结束覆盖层 */}
                {gameState.isGameOver && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <div className="text-white text-2xl font-bold mb-2">游戏结束!</div>
                    <div className="text-yellow-400 text-lg">得分: {gameState.score}</div>
                    {loading && (
                      <div className="mt-4 text-white">提交中...</div>
                    )}
                    {reward && (
                      <div className="mt-4 text-center">
                        <div className="text-green-400">+{reward.happiness} 幸福度</div>
                        <div className="text-yellow-300">+{reward.lily} $LILY</div>
                      </div>
                    )}
                    {error && (
                      <div className="mt-4 text-red-400">{error}</div>
                    )}
                  </div>
                )}

                {/* 开始提示 */}
                {!gameState.isPlaying && !gameState.isGameOver && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-lg font-bold mb-2">接虫子</div>
                      <div className="text-sm mb-4">
                        🐛 普通虫 +10分<br/>
                        ✨ 金虫 +30分<br/>
                        💀 毒虫 -1生命
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          startGame();
                        }}
                        className="px-6 py-2 bg-green-500 text-white rounded-full font-medium
                                   hover:bg-green-600 transition-colors"
                      >
                        开始游戏
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 控制提示 */}
              <div className="text-center mt-4 text-sm text-gray-500">
                ← → 方向键或滑动控制青蛙
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={closeModal}
                className="mt-4 w-full py-2 bg-gray-100 text-gray-600 rounded-xl 
                           hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default CatchBugGame;
