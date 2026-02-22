/**
 * 🐸 宠物蛋系统 - 跳荷叶小游戏
 * 玩法：点击跳跃，躲避障碍物
 * 解锁条件：Lv.5
 * 奖励：幸福度+20, 30-80$LILY
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';

interface LilyPadGameProps {
  frogId: number;
  ownerAddress: string;
  onComplete?: () => void;
}

interface Obstacle {
  id: number;
  x: number;
  type: 'log' | 'bird' | 'coin';
}

interface GameState {
  score: number;
  isPlaying: boolean;
  isGameOver: boolean;
  frogY: number;
  isJumping: boolean;
  obstacles: Obstacle[];
  speed: number;
}

const GAME_WIDTH = 300;
const GAME_HEIGHT = 400;
const GROUND_Y = 320;
const JUMP_HEIGHT = 120;
const OBSTACLE_WIDTH = 40;

export function LilyPadGame({ frogId, ownerAddress, onComplete }: LilyPadGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    isPlaying: false,
    isGameOver: false,
    frogY: GROUND_Y,
    isJumping: false,
    obstacles: [],
    speed: 3,
  });
  
  const [showModal, setShowModal] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [reward, setReward] = useState<{ lily: number; happiness: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const animationRef = useRef<number | null>(null);
  const obstacleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  // 检查剩余游戏次数
  const checkRemaining = async () => {
    try {
      const response: any = await apiService.get(`/nurture/${frogId}/game-remaining?game=lily_pad`);
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

  // 跳跃逻辑
  const jump = useCallback(() => {
    if (!gameState.isPlaying || gameState.isJumping || gameState.isGameOver) return;
    
    setGameState(prev => ({ ...prev, isJumping: true }));
    
    // 上升动画
    let jumpProgress = 0;
    const jumpUp = () => {
      jumpProgress += 10;
      const newY = GROUND_Y - Math.sin(jumpProgress * Math.PI / 100) * JUMP_HEIGHT;
      
      setGameState(prev => ({ ...prev, frogY: newY }));
      
      if (jumpProgress < 100) {
        requestAnimationFrame(jumpUp);
      } else {
        setGameState(prev => ({ ...prev, frogY: GROUND_Y, isJumping: false }));
      }
    };
    
    requestAnimationFrame(jumpUp);
  }, [gameState.isPlaying, gameState.isJumping, gameState.isGameOver]);

  // 键盘/触摸控制
  useEffect(() => {
    if (!gameState.isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isPlaying, jump]);

  // 游戏循环
  const gameLoop = useCallback(() => {
    const now = Date.now();
    
    setGameState(prev => {
      if (!prev.isPlaying || prev.isGameOver) return prev;
      
      let newScore = prev.score;
      const newObstacles: Obstacle[] = [];
      
      // 生成障碍物
      if (now - lastSpawnRef.current > 1500) {
        const type = Math.random() < 0.2 ? 'coin' : Math.random() < 0.5 ? 'bird' : 'log';
        newObstacles.push(...prev.obstacles);
        newObstacles.push({
          id: obstacleIdRef.current++,
          x: GAME_WIDTH,
          type,
        });
        lastSpawnRef.current = now;
      } else {
        newObstacles.push(...prev.obstacles);
      }
      
      // 移动障碍物
      const movedObstacles = newObstacles
        .map(obs => ({ ...obs, x: obs.x - prev.speed }))
        .filter(obs => obs.x > -OBSTACLE_WIDTH);
      
      // 碰撞检测
      const frogLeft = 60;
      const frogRight = 100;
      const frogTop = prev.frogY - 30;
      const frogBottom = prev.frogY;
      
      for (const obs of movedObstacles) {
        const obsLeft = obs.x;
        const obsRight = obs.x + OBSTACLE_WIDTH;
        const obsTop = obs.type === 'bird' ? 200 : GROUND_Y - 40;
        const obsBottom = obs.type === 'bird' ? 240 : GROUND_Y;
        
        // 检测碰撞
        const collision = frogRight > obsLeft && 
                         frogLeft < obsRight &&
                         frogBottom > obsTop &&
                         frogTop < obsBottom;
        
        if (collision) {
          if (obs.type === 'coin') {
            newScore += 20;
            obs.x = -100; // 移除金币
          } else {
            // 游戏结束
            return {
              ...prev,
              score: newScore,
              isGameOver: true,
              isPlaying: false,
              obstacles: [],
            };
          }
        }
      }
      
      // 分数增加（每存活一段时间）
      newScore += 1;
      
      // 速度随分数增加
      const newSpeed = 3 + Math.floor(newScore / 100) * 0.5;
      
      return {
        ...prev,
        score: newScore,
        obstacles: movedObstacles.filter(o => o.x > -50),
        speed: Math.min(newSpeed, 8),
      };
    });
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // 开始游戏
  const startGame = () => {
    if (remaining !== null && remaining <= 0) {
      setError('今日游戏次数已用完');
      return;
    }
    
    setGameState({
      score: 0,
      isPlaying: true,
      isGameOver: false,
      frogY: GROUND_Y,
      isJumping: false,
      obstacles: [],
      speed: 3,
    });
    setShowModal(true);
    setError(null);
    setReward(null);
    obstacleIdRef.current = 0;
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
      const response: any = await apiService.post(`/nurture/${frogId}/play/lily-pad`, {
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
        className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 
                   border-2 border-green-200 cursor-pointer
                   shadow-[4px_4px_8px_#e0e0e0,-4px_-4px_8px_#ffffff]"
        onClick={startGame}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍃</span>
          <div>
            <div className="font-medium text-gray-800">跳荷叶</div>
            <div className="text-xs text-gray-500">
              跳跃躲避障碍
              {remaining !== null && (
                <span className="ml-1 text-green-600">({remaining}次)</span>
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
                <h3 className="text-xl font-bold text-gray-800">🍃 跳荷叶</h3>
                <div className="flex justify-center gap-6 mt-2 text-sm">
                  <span className="text-green-600">分数: {gameState.score}</span>
                </div>
              </div>

              {/* 游戏区域 */}
              <div
                className="relative mx-auto bg-gradient-to-b from-sky-300 to-green-400 
                           rounded-xl overflow-hidden cursor-pointer"
                style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
                onClick={jump}
                onTouchStart={jump}
              >
                {/* 背景装饰 */}
                <div className="absolute inset-0">
                  {/* 云朵 */}
                  <div className="absolute top-8 left-10 text-4xl opacity-70">☁️</div>
                  <div className="absolute top-16 right-12 text-3xl opacity-60">☁️</div>
                  
                  {/* 地面 */}
                  <div 
                    className="absolute left-0 right-0 bg-gradient-to-t from-green-600 to-green-500"
                    style={{ top: GROUND_Y, bottom: 0 }}
                  >
                    {/* 荷叶纹理 */}
                    {[0, 50, 100, 150, 200, 250].map(x => (
                      <span 
                        key={x} 
                        className="absolute text-2xl" 
                        style={{ left: x, top: 10 }}
                      >
                        🌿
                      </span>
                    ))}
                  </div>
                </div>

                {/* 障碍物 */}
                {gameState.obstacles.map(obs => (
                  <motion.div
                    key={obs.id}
                    className="absolute text-3xl"
                    style={{
                      left: obs.x,
                      top: obs.type === 'bird' ? 200 : GROUND_Y - 40,
                    }}
                  >
                    {obs.type === 'log' && '🪵'}
                    {obs.type === 'bird' && '🦅'}
                    {obs.type === 'coin' && '🪙'}
                  </motion.div>
                ))}

                {/* 青蛙 */}
                <motion.div
                  className="absolute text-4xl"
                  style={{
                    left: 60,
                    top: gameState.frogY - 40,
                  }}
                  animate={{ 
                    rotate: gameState.isJumping ? -15 : 0,
                  }}
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
                      <div className="text-lg font-bold mb-2">跳荷叶</div>
                      <div className="text-sm mb-4">
                        点击/空格键跳跃<br/>
                        🪵 木头 - 躲避<br/>
                        🦅 飞鸟 - 躲避<br/>
                        🪙 金币 - 收集
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
                点击屏幕或按空格键跳跃
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

export default LilyPadGame;
