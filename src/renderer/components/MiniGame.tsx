import React, { useState, useEffect, useCallback } from 'react';

// --- Type Definitions ---
type Game = 'menu' | 'guess-direction' | 'catch-items' | 'memory-cards';
type Direction = 'up' | 'down' | 'left' | 'right';
type Card = { id: number; value: string; isFlipped: boolean; isMatched: boolean };
type Item = { id: number; x: number; y: number; speed: number };

// --- Styling (can be moved to a separate CSS file) ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    height: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '2px solid #333',
    borderRadius: '15px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    padding: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  button: {
    backgroundColor: '#4CAF50',
    border: 'none',
    color: 'white',
    padding: '15px 32px',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: '16px',
    margin: '4px 2px',
    cursor: 'pointer',
    borderRadius: '8px',
  },
  gameArea: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  card: {
    width: 70,
    height: 70,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    border: '2px solid #333',
    borderRadius: '5px',
    backgroundColor: '#f0f0f0',
    transition: 'transform 0.5s',
    transformStyle: 'preserve-3d',
  },
};

// --- Sub-components for each game ---

const GuessDirectionGame = ({ onGameEnd }: { onGameEnd: (won: boolean) => void }) => {
  const [correctDirection, setCorrectDirection] = useState<Direction | null>(null);

  useEffect(() => {
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const randomIndex = Math.floor(Math.random() * directions.length);
    setCorrectDirection(directions[randomIndex]);
  }, []);

  const handleGuess = (guess: Direction) => {
    onGameEnd(guess === correctDirection);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h3 style={styles.title}>Guess the Direction!</h3>
      <p>Where will the pet go?</p>
      <div>
        {(['up', 'down', 'left', 'right'] as Direction[]).map((dir) => (
          <button key={dir} style={styles.button} onClick={() => handleGuess(dir)}>
            {dir.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

const CatchItemsGame = ({ onGameEnd }: { onGameEnd: (score: number) => void }) => {
    const [petX, setPetX] = useState(150);
    const [items, setItems] = useState<Item[]>([]);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const gameAreaRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setPetX((prev) => Math.max(0, prev - 20));
            } else if (e.key === 'ArrowRight') {
                setPetX((prev) => Math.min(350, prev + 20));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (gameOver) return;

        const gameLoop = setInterval(() => {
            setItems(prevItems => {
                const newItems = prevItems
                    .map(item => ({ ...item, y: item.y + item.speed }))
                    .filter(item => item.y < 380);

                const caughtItems = newItems.filter(item =>
                    item.y > 340 && item.x > petX && item.x < petX + 50
                );

                if (caughtItems.length > 0) {
                    setScore(s => s + caughtItems.length);
                }
                
                return newItems.filter(item => !caughtItems.some(c => c.id === item.id));
            });
        }, 50);

        const itemSpawner = setInterval(() => {
            const newItem: Item = {
                id: Date.now(),
                x: Math.random() * 350,
                y: 0,
                speed: 2 + Math.random() * 3
            };
            setItems(prev => [...prev, newItem]);
        }, 1000);

        const gameTimer = setTimeout(() => {
            setGameOver(true);
            onGameEnd(score);
        }, 20000); // 20-second game

        return () => {
            clearInterval(gameLoop);
            clearInterval(itemSpawner);
            clearTimeout(gameTimer);
        };
    }, [gameOver, onGameEnd, petX, score]);

    return (
        <div style={{ textAlign: 'center' }}>
            <h3 style={styles.title}>Catch Falling Items!</h3>
            <p>Score: {score}</p>
            <div ref={gameAreaRef} style={{ ...styles.gameArea, backgroundColor: '#87CEEB', border: '1px solid black' }}>
                {/* Pet */}
                <div style={{ position: 'absolute', bottom: 10, left: petX, width: 50, height: 30, backgroundColor: 'green', borderRadius: '5px' }}></div>
                {/* Items */}
                {items.map(item => (
                    <div key={item.id} style={{ position: 'absolute', top: item.y, left: item.x, width: 20, height: 20, backgroundColor: 'red', borderRadius: '50%' }}></div>
                ))}
            </div>
             {gameOver && <p>Game Over! Final Score: {score}</p>}
        </div>
    );
};


const MemoryCardsGame = ({ onGameEnd }: { onGameEnd: (won: boolean) => void }) => {
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [isChecking, setIsChecking] = useState(false);

    const generateCards = useCallback(() => {
        const symbols = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🍑'];
        const deck = [...symbols.slice(0, 8), ...symbols.slice(0, 8)];
        const shuffledDeck = deck.sort(() => Math.random() - 0.5);
        setCards(shuffledDeck.map((val, i) => ({
            id: i,
            value: val,
            isFlipped: false,
            isMatched: false,
        })));
    }, []);

    useEffect(() => {
        generateCards();
    }, [generateCards]);

    useEffect(() => {
        if (flippedCards.length === 2) {
            setIsChecking(true);
            const [firstId, secondId] = flippedCards;
            const firstCard = cards.find(c => c.id === firstId);
            const secondCard = cards.find(c => c.id === secondId);

            if (firstCard && secondCard && firstCard.value === secondCard.value) {
                setCards(prev => prev.map(c => 
                    (c.id === firstId || c.id === secondId) ? { ...c, isMatched: true } : c
                ));
                setFlippedCards([]);
                setIsChecking(false);
            } else {
                setTimeout(() => {
                    setCards(prev => prev.map(c => 
                        (c.id === firstId || c.id === secondId) ? { ...c, isFlipped: false } : c
                    ));
                    setFlippedCards([]);
                    setIsChecking(false);
                }, 1000);
            }
        }
    }, [flippedCards, cards]);

    useEffect(() => {
        if (cards.length > 0 && cards.every(c => c.isMatched)) {
            onGameEnd(true);
        }
    }, [cards, onGameEnd]);

    const handleCardClick = (id: number) => {
        if (isChecking || flippedCards.length === 2) return;
        const cardToFlip = cards.find(c => c.id === id);
        if (cardToFlip && !cardToFlip.isFlipped && !cardToFlip.isMatched) {
            setFlippedCards(prev => [...prev, id]);
            setCards(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));
        }
    };

    return (
        <div style={{ textAlign: 'center' }}>
            <h3 style={styles.title}>Memory Cards</h3>
            <div style={styles.cardGrid}>
                {cards.map(card => (
                    <div 
                        key={card.id} 
                        style={{...styles.card, transform: card.isFlipped || card.isMatched ? 'rotateY(180deg)' : ''}}
                        onClick={() => handleCardClick(card.id)}
                    >
                       <div style={{ backfaceVisibility: 'hidden', position: 'absolute' }}>?</div>
                       <div style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', position: 'absolute' }}>
                           {card.value}
                       </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main MiniGame Component ---
export const MiniGame = ({ onClose }: { onClose: () => void }) => {
  const [activeGame, setActiveGame] = useState<Game>('menu');
  const [gameResult, setGameResult] = useState<string | null>(null);

  const handleGameEnd = (result: any) => {
      let message = '';
      if (activeGame === 'guess-direction') message = result ? "You Won! Correct guess!" : "You Lost! Wrong direction.";
      if (activeGame === 'catch-items') message = `Game Over! You scored ${result} points.`;
      if (activeGame === 'memory-cards') message = result ? "You Won! Excellent memory!" : "You ran out of time!";
      
      setGameResult(message);
      setActiveGame('menu'); // Go back to menu after a delay
      setTimeout(() => {
          setGameResult(null);
      }, 3000);
  };

  const renderGame = () => {
    switch (activeGame) {
      case 'guess-direction':
        return <GuessDirectionGame onGameEnd={handleGameEnd} />;
      case 'catch-items':
        return <CatchItemsGame onGameEnd={handleGameEnd} />;
      case 'memory-cards':
        return <MemoryCardsGame onGameEnd={handleGameEnd} />;
      case 'menu':
      default:
        return (
          <>
            <h2 style={styles.title}>Mini-Games</h2>
            {gameResult && <p style={{ color: 'blue', marginBottom: '15px' }}>{gameResult}</p>}
            <button style={styles.button} onClick={() => setActiveGame('guess-direction')}>Guess Direction</button>
            <button style={styles.button} onClick={() => setActiveGame('catch-items')}>Catch Items</button>
            <button style={styles.button} onClick={() => setActiveGame('memory-cards')}>Memory Cards</button>
            <button style={{ ...styles.button, backgroundColor: '#f44336', marginTop: 20 }} onClick={onClose}>Close</button>
          </>
        );
    }
  };

  return <div style={styles.container}>{renderGame()}</div>;
};

export default MiniGame;