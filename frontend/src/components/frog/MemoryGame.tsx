/**
 * 🐸 宠物蛋系统 - 记忆翻牌小游戏
 * 玩法：翻开两张相同的卡牌配对
 * 解锁条件：Lv.8
 * 奖励：幸福度+15, 40-100$LILY
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lifeFeatureApi } from '../../features/life/api';

interface MemoryGameProps {
  frogId: number;
  ownerAddress: string;
  onComplete?: () => void;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const CARD_EMOJIS = ['🐸', '🌸', '🍀', '⭐', '🌙', '🎀', '🍎', '🦋'];

export function MemoryGame({ frogId, ownerAddress, onComplete }: MemoryGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [reward, setReward] = useState<{ lily: number; happiness: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canFlip, setCanFlip] = useState(true);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 检查剩余游戏次数
  const checkRemaining = async () => {
    try {
      const response: any = await lifeFeatureApi.getLegacyGameRemaining(frogId, 'memory');
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

  // 计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !isGameOver) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, startTime]);

  // 初始化卡牌
  const initCards = useCallback(() => {
    const shuffled = [...CARD_EMOJIS, ...CARD_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setIsGameOver(false);
    setStartTime(Date.now());
    setElapsedTime(0);
  }, []);

  // 翻牌逻辑
  const flipCard = (cardId: number) => {
    if (!canFlip || !isPlaying) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    
    // 翻开卡牌
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));
    
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    
    // 如果翻开了两张
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setCanFlip(false);
      
      const [first, second] = newFlipped;
      const firstCard = cards.find(c => c.id === first)!;
      const secondCard = cards.find(c => c.id === second)!;
      
      if (firstCard.emoji === secondCard.emoji) {
        // 配对成功
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second 
              ? { ...c, isMatched: true } 
              : c
          ));
          setMatches(prev => prev + 1);
          setFlippedCards([]);
          setCanFlip(true);
          
          // 检查游戏是否结束
          if (matches + 1 === CARD_EMOJIS.length) {
            setIsGameOver(true);
            setIsPlaying(false);
          }
        }, 500);
      } else {
        // 配对失败，翻回去
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second 
              ? { ...c, isFlipped: false } 
              : c
          ));
          setFlippedCards([]);
          setCanFlip(true);
        }, 1000);
      }
    }
  };

  // 开始游戏
  const startGame = () => {
    if (remaining !== null && remaining <= 0) {
      setError('今日游戏次数已用完');
      return;
    }
    
    initCards();
    setIsPlaying(true);
    setShowModal(true);
    setError(null);
    setReward(null);
  };

  // 游戏结束处理
  useEffect(() => {
    if (isGameOver && moves > 0) {
      submitScore();
    }
  }, [isGameOver]);

  // 计算分数：步数越少分越高，时间越短分越高
  const calculateScore = () => {
    const baseScore = 1000;
    const movesPenalty = moves * 10;
    const timePenalty = elapsedTime * 2;
    return Math.max(100, baseScore - movesPenalty - timePenalty);
  };

  // 提交分数
  const submitScore = async () => {
    try {
      setLoading(true);
      const score = calculateScore();
      const response: any = await lifeFeatureApi.playMemoryLegacy(frogId, {
        score,
        moves,
        time: elapsedTime,
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
    setIsPlaying(false);
    setIsGameOver(false);
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 游戏入口卡片 */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 
                   border-2 border-purple-200 cursor-pointer
                   shadow-[4px_4px_8px_#e0e0e0,-4px_-4px_8px_#ffffff]"
        onClick={startGame}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎴</span>
          <div>
            <div className="font-medium text-gray-800">记忆翻牌</div>
            <div className="text-xs text-gray-500">
              配对相同图案
              {remaining !== null && (
                <span className="ml-1 text-purple-600">({remaining}次)</span>
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
                <h3 className="text-xl font-bold text-gray-800">🎴 记忆翻牌</h3>
                <div className="flex justify-center gap-6 mt-2 text-sm">
                  <span className="text-purple-600">步数: {moves}</span>
                  <span className="text-pink-600">配对: {matches}/{CARD_EMOJIS.length}</span>
                  <span className="text-blue-600">⏱️ {formatTime(elapsedTime)}</span>
                </div>
              </div>

              {/* 卡牌区域 */}
              <div className="grid grid-cols-4 gap-2 p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                {cards.map(card => (
                  <motion.div
                    key={card.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => flipCard(card.id)}
                    className={`
                      aspect-square rounded-lg cursor-pointer
                      flex items-center justify-center text-2xl
                      transition-all duration-300
                      ${card.isFlipped || card.isMatched
                        ? 'bg-white shadow-lg'
                        : 'bg-gradient-to-br from-purple-400 to-pink-400 shadow-md'
                      }
                      ${card.isMatched ? 'opacity-50' : ''}
                    `}
                    style={{
                      transform: card.isFlipped || card.isMatched 
                        ? 'rotateY(180deg)' 
                        : 'rotateY(0deg)',
                      perspective: '1000px',
                    }}
                  >
                    {(card.isFlipped || card.isMatched) ? (
                      <span style={{ transform: 'rotateY(180deg)' }}>{card.emoji}</span>
                    ) : (
                      <span className="text-white text-lg">?</span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* 游戏结束覆盖层 */}
              {isGameOver && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl text-center"
                >
                  <div className="text-xl font-bold text-green-600 mb-2">🎉 恭喜完成!</div>
                  <div className="text-sm text-gray-600">
                    用时 {formatTime(elapsedTime)} | {moves} 步
                  </div>
                  {loading && (
                    <div className="mt-2 text-gray-500">提交中...</div>
                  )}
                  {reward && (
                    <div className="mt-2">
                      <span className="text-green-600">+{reward.happiness} 幸福度</span>
                      <span className="mx-2">|</span>
                      <span className="text-yellow-600">+{reward.lily} $LILY</span>
                    </div>
                  )}
                  {error && (
                    <div className="mt-2 text-red-500">{error}</div>
                  )}
                </motion.div>
              )}

              {/* 开始提示 */}
              {!isPlaying && !isGameOver && (
                <div className="mt-4 text-center">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      startGame();
                    }}
                    className="px-6 py-2 bg-purple-500 text-white rounded-full font-medium
                               hover:bg-purple-600 transition-colors"
                  >
                    开始游戏
                  </button>
                </div>
              )}

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

export default MemoryGame;
