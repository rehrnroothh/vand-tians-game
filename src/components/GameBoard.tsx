import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import PlayingCard from './PlayingCard';
import { CardData, createDeck, rules } from '@/lib/gameRules';

interface GameBoardProps {
  players: string[];
  onReset: () => void;
}

const GameBoard = ({ players, onReset }: GameBoardProps) => {
  const [deck, setDeck] = useState<CardData[]>(createDeck);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState<CardData | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [kingsDrawn, setKingsDrawn] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const currentPlayer = players[currentPlayerIndex];
  const cardsLeft = deck.length;

  const drawCard = useCallback(() => {
    if (isFlipped || deck.length === 0) return;

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    setDeck(newDeck);
    setCurrentCard(card);
    setIsFlipped(true);

    if (card.value === 13) {
      const newKings = kingsDrawn + 1;
      setKingsDrawn(newKings);
      if (newKings >= 4) {
        setGameOver(true);
      }
    }
  }, [deck, isFlipped, kingsDrawn]);

  const nextTurn = () => {
    setIsFlipped(false);
    setCurrentCard(null);
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);

    if (deck.length === 0) {
      setGameOver(true);
    }
  };

  const restartGame = () => {
    setDeck(createDeck());
    setCurrentPlayerIndex(0);
    setCurrentCard(null);
    setIsFlipped(false);
    setKingsDrawn(0);
    setGameOver(false);
  };

  const rule = currentCard ? rules[currentCard.value] : null;

  if (gameOver) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="gradient-radial fixed inset-0 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center"
        >
          <span className="text-6xl mb-4 block">👑</span>
          <h2 className="text-3xl font-bold text-gold mb-2">Spelet är slut!</h2>
          <p className="text-muted-foreground mb-8">
            {kingsDrawn >= 4 ? 'Alla kungar är dragna!' : 'Korten är slut!'}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={restartGame} className="px-6 py-3 rounded-xl bg-gold text-primary-foreground font-semibold glow-gold">
              Spela igen
            </button>
            <button onClick={onReset} className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold">
              Byt spelare
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 relative">
      <div className="gradient-radial fixed inset-0 pointer-events-none" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
        <div className="text-sm text-muted-foreground">
          {cardsLeft} kort kvar • {kingsDrawn}/4 👑
        </div>
        <button onClick={onReset} className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Current player */}
      <motion.div
        key={currentPlayerIndex}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center z-10"
      >
        <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Din tur</p>
        <h2 className="text-2xl font-bold text-gold">{currentPlayer}</h2>
      </motion.div>

      {/* Card area */}
      <div className="z-10 mb-6">
        {currentCard ? (
          <PlayingCard card={currentCard} isFlipped={isFlipped} onFlip={() => {}} />
        ) : (
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={drawCard}
            className="w-56 h-80 rounded-2xl card-shadow bg-gradient-to-br from-primary/80 to-accent border-2 border-primary/40 flex items-center justify-center cursor-pointer"
          >
            <div className="w-[85%] h-[90%] rounded-xl border-2 border-primary-foreground/20 flex flex-col items-center justify-center gap-2">
              <span className="text-4xl font-bold text-primary-foreground/60 tracking-tighter">VT</span>
              <span className="text-sm text-primary-foreground/40">Tryck för att dra</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Rule display */}
      <AnimatePresence mode="wait">
        {rule && isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="z-10 w-full max-w-sm text-center mb-6"
          >
            <div className="bg-card border border-border rounded-2xl p-5">
              <span className="text-3xl mb-2 block">{rule.emoji}</span>
              <h3 className="text-xl font-bold text-gold mb-1">{rule.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{rule.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
      {isFlipped && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={nextTurn}
          className="z-10 px-8 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-lg"
        >
          Nästa spelare →
        </motion.button>
      )}
    </div>
  );
};

export default GameBoard;
