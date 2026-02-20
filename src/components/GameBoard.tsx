import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MiniCard from './MiniCard';
import {
  GameState,
  getPlaySource,
  canPlayCard,
  playCards,
  pickUpPile,
  drawAndTryFromTalong,
  swapCards,
  confirmSwap,
  cardLabel,
  suitSymbols,
  dealGame,
} from '@/lib/gameEngine';
import { RotateCcw, ArrowUp, Hand } from 'lucide-react';

interface GameBoardProps {
  initialState: GameState;
  onReset: () => void;
}

const GameBoard = ({ initialState, onReset }: GameBoardProps) => {
  const [state, setState] = useState<GameState>(initialState);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [swapSource, setSwapSource] = useState<{ type: 'hand' | 'faceUp'; id: string } | null>(null);

  const currentPlayer = state.players[state.currentPlayerIndex];
  const source = getPlaySource(currentPlayer);
  const isSwapPhase = state.phase === 'swap';
  const isFinished = state.phase === 'finished';
  const mustCoverTwoNow =
    state.mustCoverTwo && state.mustCoverTwoPlayerIndex === state.currentPlayerIndex;

  const topDiscard = state.discardPile.length > 0
    ? state.discardPile[state.discardPile.length - 1]
    : null;

  const toggleSelect = (cardId: string) => {
    if (isSwapPhase) return;
    
    const card = [...currentPlayer.hand, ...currentPlayer.faceUp, ...currentPlayer.faceDown]
      .find(c => c.id === cardId);
    if (!card) return;

    if (source === 'faceDown') {
      // Blind play — just play immediately
      setState(playCards(state, [cardId]));
      return;
    }

    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      // Can only select cards of same value
      if (selectedCards.length > 0) {
        const firstCard = [...currentPlayer.hand, ...currentPlayer.faceUp]
          .find(c => c.id === selectedCards[0]);
        if (firstCard && firstCard.value !== card.value) {
          setSelectedCards([cardId]);
          return;
        }
      }
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handlePlay = () => {
    if (selectedCards.length === 0) return;
    const newState = playCards(state, selectedCards);
    setState(newState);
    setSelectedCards([]);
  };

  const handlePickUp = () => {
    setState(pickUpPile(state));
    setSelectedCards([]);
  };

  const handleSwapClick = (type: 'hand' | 'faceUp', id: string) => {
    if (!isSwapPhase) return;
    
    if (!swapSource) {
      setSwapSource({ type, id });
    } else if (swapSource.type !== type) {
      // Swap!
      const handId = type === 'hand' ? id : swapSource.id;
      const faceUpId = type === 'faceUp' ? id : swapSource.id;
      setState(swapCards(state, state.currentPlayerIndex, handId, faceUpId));
      setSwapSource(null);
    } else {
      // Same type, switch selection
      setSwapSource({ type, id });
    }
  };

  const handleConfirmSwap = () => {
    setState(confirmSwap(state, state.currentPlayerIndex));
    setSwapSource(null);
  };

  const handleRestart = () => {
    const names = state.players.map(p => p.name);
    setState(dealGame(names));
    setSelectedCards([]);
    setSwapSource(null);
  };

  // Check if selected cards can be played
  const canPlay = selectedCards.length > 0 && (() => {
    const cards = selectedCards.map(id =>
      [...currentPlayer.hand, ...currentPlayer.faceUp].find(c => c.id === id)
    ).filter(Boolean);
    if (cards.length === 0) return false;
    return canPlayCard(cards[0]!, state.discardPile);
  })();

  // Check if any card in hand/faceUp can be played
  const sourceCards = source === 'hand' ? currentPlayer.hand : source === 'faceUp' ? currentPlayer.faceUp : [];
  const hasPlayableCard = sourceCards.some(c => canPlayCard(c, state.discardPile));
  const canTryTalong =
    state.phase === 'play' &&
    state.discardPile.length > 0 &&
    state.drawPile.length > 0 &&
    source !== 'faceDown' &&
    !hasPlayableCard;

  useEffect(() => {
    const isRobotTurn = currentPlayer.name.toLowerCase() === 'robot';
    if (!isRobotTurn || isFinished) return;

    const timer = setTimeout(() => {
      if (state.phase === 'swap') {
        setState(confirmSwap(state, state.currentPlayerIndex));
        setSwapSource(null);
        return;
      }

      const robot = state.players[state.currentPlayerIndex];
      const robotSource = getPlaySource(robot);

      if (robotSource === 'faceDown') {
        const blindCard = robot.faceDown[0];
        if (blindCard) {
          setState(playCards(state, [blindCard.id]));
        }
        return;
      }

      const availableCards = robotSource === 'hand' ? robot.hand : robot.faceUp;
      const playableCards = availableCards.filter(card => canPlayCard(card, state.discardPile));

      if (playableCards.length > 0) {
        const lowestPlayable = playableCards.reduce((lowest, card) =>
          card.value < lowest.value ? card : lowest
        );
        const cardsToPlay = availableCards
          .filter(card => card.value === lowestPlayable.value)
          .map(card => card.id);
        setState(playCards(state, cardsToPlay));
        return;
      }

      const robotCanTryTalong =
        state.phase === 'play' &&
        state.discardPile.length > 0 &&
        state.drawPile.length > 0;

      if (robotCanTryTalong) {
        setState(drawAndTryFromTalong(state));
      } else {
        setState(pickUpPile(state));
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [currentPlayer, isFinished, state]);

  if (isFinished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="gradient-radial fixed inset-0 pointer-events-none" />
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center">
          <span className="text-6xl mb-4 block">🏆</span>
          <h2 className="text-3xl font-bold text-gold mb-2">{currentPlayer.name} vinner!</h2>
          <p className="text-muted-foreground mb-8">Grattis!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleRestart} className="px-6 py-3 rounded-xl bg-gold text-primary-foreground font-semibold glow-gold">Spela igen</button>
            <button onClick={onReset} className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold">Byt spelare</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 pt-14 pb-6 relative">
      <div className="gradient-radial fixed inset-0 pointer-events-none" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-3 flex items-center justify-between z-20 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="text-sm text-muted-foreground">
          📦 {state.drawPile.length} i talong
        </div>
        <motion.div key={state.currentPlayerIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold text-gold">
          {currentPlayer.name}s tur
        </motion.div>
        <button onClick={onReset} className="p-1.5 rounded-lg bg-secondary text-muted-foreground">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.message}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-center text-sm text-muted-foreground mb-4 px-4"
        >
          {state.message}
        </motion.div>
      </AnimatePresence>

      {/* Other players overview */}
      <div className="flex gap-3 justify-center mb-4 flex-wrap">
        {state.players.map((p, i) => {
          if (i === state.currentPlayerIndex) return null;
          const total = p.hand.length + p.faceUp.length + p.faceDown.length;
          return (
            <div key={i} className="bg-card rounded-lg px-3 py-2 text-xs border border-border">
              <span className="text-muted-foreground">{p.name}: </span>
              <span className="text-foreground font-medium">{total} kort</span>
            </div>
          );
        })}
      </div>

      {/* Center area: discard pile + draw pile */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {/* Draw pile */}
        <div className="text-center">
          <button
            type="button"
            disabled={!canTryTalong || currentPlayer.name.toLowerCase() === 'robot'}
            onClick={() => {
              if (!canTryTalong || currentPlayer.name.toLowerCase() === 'robot') return;
              setState(drawAndTryFromTalong(state));
              setSelectedCards([]);
            }}
            className={`w-14 h-20 rounded-lg bg-gradient-to-br from-primary/50 to-accent/50 border border-primary/20 flex items-center justify-center card-shadow ${
              canTryTalong ? 'cursor-pointer hover:scale-105 transition-transform' : 'opacity-60 cursor-default'
            }`}
          >
            <span className="text-xs font-bold text-primary-foreground/40">{state.drawPile.length}</span>
          </button>
          <span className={`text-[10px] mt-1 block transition-colors ${canTryTalong ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            Talong
          </span>
          <div className={`mx-auto mt-1 h-0.5 w-14 rounded-full transition-opacity ${canTryTalong ? 'bg-emerald-400 opacity-100' : 'bg-transparent opacity-0'}`} />
        </div>

        {/* Discard pile */}
        <div className="text-center">
          {topDiscard ? (
            <MiniCard card={topDiscard} />
          ) : (
            <div className="w-14 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Tom</span>
            </div>
          )}
          <span className="text-[10px] text-white mt-1 block">
            Hög ({state.discardPile.length})
          </span>
        </div>
      </div>

      {/* Current player's table cards */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2 text-center uppercase tracking-wider">Bordskort</p>
        <div className="flex justify-center gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              {/* Face-down */}
              {currentPlayer.faceDown[i] ? (
                <MiniCard
                  card={currentPlayer.faceDown[i]}
                  faceDown
                  small
                  disabled={currentPlayer.name.toLowerCase() === 'robot' || source !== 'faceDown'}
                  onClick={() => currentPlayer.name.toLowerCase() !== 'robot' && source === 'faceDown' && toggleSelect(currentPlayer.faceDown[i].id)}
                />
              ) : (
                <div className="w-12 h-[4.2rem] rounded-lg border border-dashed border-border/30" />
              )}
              {/* Face-up */}
              {currentPlayer.faceUp[i] ? (
                <MiniCard
                  card={currentPlayer.faceUp[i]}
                  small
                  selected={isSwapPhase ? swapSource?.id === currentPlayer.faceUp[i].id : selectedCards.includes(currentPlayer.faceUp[i].id)}
                  disabled={currentPlayer.name.toLowerCase() === 'robot' || (!isSwapPhase && source !== 'faceUp')}
                  onClick={() => {
                    if (isSwapPhase) handleSwapClick('faceUp', currentPlayer.faceUp[i].id);
                    else if (source === 'faceUp') toggleSelect(currentPlayer.faceUp[i].id);
                  }}
                />
              ) : (
                <div className="w-12 h-[4.2rem] rounded-lg border border-dashed border-border/30" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current player's hand */}
      <div className="mt-auto">
        <p className="text-xs text-muted-foreground mb-2 text-center uppercase tracking-wider">
          <Hand size={12} className="inline mr-1" />
          Hand ({currentPlayer.hand.length})
        </p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          {currentPlayer.hand.map(card => (
            <MiniCard
              key={card.id}
              card={card}
              selected={isSwapPhase ? swapSource?.id === card.id : selectedCards.includes(card.id)}
              disabled={currentPlayer.name.toLowerCase() === 'robot' || (!isSwapPhase && source !== 'hand')}
              onClick={() => {
                if (isSwapPhase) handleSwapClick('hand', card.id);
                else toggleSelect(card.id);
              }}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center mt-4">
        {isSwapPhase ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirmSwap}
            disabled={currentPlayer.name.toLowerCase() === 'robot'}
            className="px-6 py-3 rounded-xl bg-gold text-white font-semibold glow-gold"
          >
            ✓ Klar med byten
          </motion.button>
        ) : (
          <>
            {canPlay && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePlay}
                disabled={currentPlayer.name.toLowerCase() === 'robot'}
                className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2"
              >
                <ArrowUp size={16} /> Spela
              </motion.button>
            )}
            {state.discardPile.length > 0 && !hasPlayableCard && source !== 'faceDown' && !mustCoverTwoNow && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePickUp}
                disabled={currentPlayer.name.toLowerCase() === 'robot'}
                className="px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold flex items-center gap-2"
              >
                Ta upp högen
              </motion.button>
            )}
            
          </>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
