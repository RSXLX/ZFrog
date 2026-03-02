import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniGameProps {
  visible: boolean;
  onClose: () => void;
  onScore: (score: number) => void;
}

// Simple tap game
const TapGame: React.FC<{ onComplete: (score: number) => void }> = ({ onComplete }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsPlaying(false);
          onComplete(score);
          return 0;
        }
        return prev - 1;
      });
      
      setTarget({
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      });
    }, 800);

    return () => clearInterval(timer);
  }, [isPlaying, score, onComplete]);

  const handleTap = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setScore(0);
      setTimeLeft(10);
    } else {
      setScore(prev => prev + 1);
      setTarget({
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      });
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>
        ⏱️ {timeLeft}s | 🎯 {score}分
      </div>
      
      <div 
        onClick={handleTap}
        style={{
          width: '100%',
          height: 200,
          background: '#f0f0f0',
          borderRadius: 12,
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {!isPlaying ? (
          <div style={{ 
            position: 'absolute', inset: 0, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#666' 
          }}>
            点击开始游戏
          </div>
        ) : (
          <motion.div
            animate={{ x: target.x + '%', y: target.y + '%' }}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#FF6B6B',
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
            }}
          >
            🎯
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Memory match game
const MemoryGame: React.FC<{ onComplete: (score: number) => void }> = ({ onComplete }) => {
  const [cards, setCards] = useState<{id: number; emoji: string; flipped: boolean; matched: boolean}[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🥝'];

  useEffect(() => {
    const deck = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setCards(deck);
  }, []);

  const handleFlip = (index: number) => {
    if (selected.length === 2 || cards[index].flipped || cards[index].matched) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);
    setSelected(prev => [...prev, index]);
    setMoves(prev => prev + 1);

    if (selected.length === 1) {
      const first = selected[0];
      if (cards[first].emoji === cards[index].emoji) {
        // Match!
        setTimeout(() => {
          const matched = cards.map(c => 
            c.emoji === cards[index].emoji ? { ...c, matched: true } : c
          );
          setCards(matched);
          
          if (matched.every(c => c.matched)) {
            onComplete(Math.max(0, 100 - moves * 2));
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const reset = cards.map(c => ({ ...c, flipped: false }));
          setCards(reset);
        }, 1000);
      }
      setSelected([]);
    }
  };

  return (
    <div style={{ padding: 10 }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        步数: {moves}
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 8 
      }}>
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={() => handleFlip(i)}
            style={{
              aspectRatio: '1',
              background: card.flipped || card.matched ? '#4ADE80' : '#ddd',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            {(card.flipped || card.matched) ? card.emoji : '❓'}
          </div>
        ))}
      </div>
    </div>
  );
};

const MiniGame: React.FC<MiniGameProps> = ({ visible, onClose, onScore }) => {
  const [gameType, setGameType] = useState<'tap' | 'memory' | null>(null);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="dialog-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="dialog-content"
            onClick={e => e.stopPropagation()}
            style={{ minWidth: 300 }}
          >
            <button className="dialog-close" onClick={onClose}>×</button>
            
            <h2 className="dialog-title">🎮 迷你游戏</h2>
            
            {!gameType ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={() => setGameType('tap')}
                  style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
                    border: 'none',
                    borderRadius: 12,
                    color: 'white',
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  🎯 点击大挑战
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    10秒内点击目标获取分数
                  </div>
                </button>
                
                <button
                  onClick={() => setGameType('memory')}
                  style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
                    border: 'none',
                    borderRadius: 12,
                    color: 'white',
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  🧠 记忆配对
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    翻开所有卡片，步数越少分数越高
                  </div>
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setGameType(null)}
                  style={{
                    marginBottom: 10,
                    padding: '6px 12px',
                    background: '#eee',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  ← 返回
                </button>
                
                {gameType === 'tap' && (
                  <TapGame onComplete={(score) => {
                    onScore(score);
                    setGameType(null);
                  }} />
                )}
                
                {gameType === 'memory' && (
                  <MemoryGame onComplete={(score) => {
                    onScore(score);
                    setGameType(null);
                  }} />
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MiniGame;
