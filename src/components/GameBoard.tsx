import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MiniCard from './MiniCard';
import {
  Card,
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
import { chooseRobotPlayDecision, chooseRobotSwapDecision } from '@/lib/robotAi';

interface GameBoardProps {
  initialState: GameState;
  onReset: () => void;
}

const ORJAN_LOSING_LINES = [
  'Örjan Lax: “Jaha. Kul. Då var det alltså riggat.”',
  '“Det där räknas inte. Reglerna är ju helt fel.”',
  '“Vem kom på det här spelet ens? Det är ju trasigt.”',
  '“Snyggt. Man ska alltså vinna på tur nu. Fantastiskt.”',
  '“Nej, stopp. Du flyttade fel. Jag såg det.”',
  '“Om du ska fuska kan vi lika gärna lägga ner.”',
  '“Okej, grattis då. Men det här säger mer om spelet än om mig.”',
  '“Jag förlorade inte. Jag avbröt.”',
  '“Det där är inte ett ‘spel’, det är ett irritationsmoment.”',
];


const ORJAN_WIN_IMAGE = {
  primary: '/orjan-winning.jpg',
  fallback: '/orjan-winning.svg',
};

const ORJAN_LOSS_IMAGE = {
  primary: '/orjan-losing.jpg',
  fallback: '/orjan-losing.svg',
};

const ORJAN_WINNING_LINES = [
  '“Det var inte ens svårt. Det svåra var att stå ut med processen.”',
  '“Okej, nu kan vi sluta. Jag har bevisat poängen.”',
  '“Grattis till din insats. Du var… närvarande.”',
  '“Du märker skillnaden när man tänker innan man gör.”',
  '“Snyggt. Och då menar jag: av mig.”',
  '“Alltså, jag säger inte att du var helt usel… men du gjorde ditt bästa för att bevisa motsatsen.”',
  '“Det är nästan rörande hur du försökte. Nästan.”',
  '“Ja. Det här är exakt varför jag inte gillar spel. Man tvingas vinna åt andra.”',
  '“Nu kommer du säga ‘tur’. Absolut. Allt som inte är din framgång är ‘tur’.”',
  '“Bra. Då kan vi gå vidare till något vuxet.”',
];

const GameBoard = ({ initialState, onReset }: GameBoardProps) => {
  const [state, setState] = useState<GameState>(initialState);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [swapSource, setSwapSource] = useState<{ type: 'hand' | 'faceUp'; id: string } | null>(null);
  const [finalLine, setFinalLine] = useState('');
  const [resultImageSrc, setResultImageSrc] = useState('');

  const isRobotPlayer = (name: string) => name.toLowerCase().startsWith('örjan');

  const currentPlayer = state.players[state.currentPlayerIndex];
  const humanPlayerIndex = state.players.findIndex((player) => !isRobotPlayer(player.name));
  const myPlayerIndex = humanPlayerIndex === -1 ? 0 : humanPlayerIndex;
  const myPlayer = state.players[myPlayerIndex];
  const source = getPlaySource(myPlayer);
  const isMyTurn = state.currentPlayerIndex === myPlayerIndex;

  const isSwapPhase = state.phase === 'swap';
  const isFinished = state.phase === 'finished';
  const winnerIndex = state.winner;
  const winner = winnerIndex !== null ? state.players[winnerIndex] : currentPlayer;
  const orjanIndex = state.players.findIndex((player) => isRobotPlayer(player.name));
  const orjanWon = winnerIndex !== null && winnerIndex === orjanIndex;
  const humanWonAgainstOrjan = winnerIndex !== null && winnerIndex === myPlayerIndex && orjanIndex !== -1;
  const mustCoverTwoNow =
    state.mustCoverTwo && state.mustCoverTwoPlayerIndex === state.currentPlayerIndex;

  const topDiscard = state.discardPile.length > 0
    ? state.discardPile[state.discardPile.length - 1]
    : null;

  const toggleSelect = (cardId: string) => {
    if (isSwapPhase) return;
    
    if (!isMyTurn) return;

    const card = [...myPlayer.hand, ...myPlayer.faceUp, ...myPlayer.faceDown]

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
        const firstCard = [...myPlayer.hand, ...myPlayer.faceUp]
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
    if (!isMyTurn || selectedCards.length === 0) return;
    const newState = playCards(state, selectedCards);
    setState(newState);
    setSelectedCards([]);
  };

  const handlePickUp = () => {
    if (!isMyTurn) return;
    setState(pickUpPile(state));
    setSelectedCards([]);
  };

  const handleSwapClick = (type: 'hand' | 'faceUp', id: string) => {
    if (!isSwapPhase || !isMyTurn) return;
    
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
    if (!isMyTurn) return;
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
      [...myPlayer.hand, ...myPlayer.faceUp].find(c => c.id === id)
    ).filter(Boolean);
    if (cards.length === 0) return false;
    return canPlayCard(cards[0]!, state.discardPile);
  })();

  // Check if any card in hand/faceUp can be played
  const sourceCards = source === 'hand' ? myPlayer.hand : source === 'faceUp' ? myPlayer.faceUp : [];
  const hasPlayableCard = sourceCards.some(c => canPlayCard(c, state.discardPile));
  const canTryTalong =
    state.phase === 'play' &&
    state.discardPile.length > 0 &&
    state.drawPile.length > 0 &&
    source !== 'faceDown' &&
    !hasPlayableCard;

  

    const renderTableStack = (
      faceDownCard: Card | undefined,
      faceUpCard: Card | undefined,
      options?: {
        allowFaceDownPlay?: boolean;
        allowFaceUpSelection?: boolean;
        faceUpSelected?: boolean;
        onFaceDownClick?: () => void;
        onFaceUpClick?: () => void;
      },
    ) => {
      const showFaceDown = !!faceDownCard;
      const showFaceUp = !!faceUpCard;
  
      if (!showFaceDown && !showFaceUp) {
        return <div className="w-12 h-[4.2rem] rounded-lg border border-dashed border-border/30" />;
      }
  
      return (
        <div className="relative w-12 h-[4.2rem]">
          {showFaceDown && (
            <div className="absolute inset-0">
              <MiniCard
                card={faceDownCard}
                faceDown
                small
                disabled={!options?.allowFaceDownPlay}
                onClick={options?.onFaceDownClick}
              />
            </div>
          )}
          {showFaceUp && (
            <div className="absolute inset-0 z-10">
              <MiniCard
                card={faceUpCard}
                small
                selected={options?.faceUpSelected}
                disabled={!options?.allowFaceUpSelection}
                onClick={options?.onFaceUpClick}
              />
            </div>
          )}
        </div>
      );
    };
  
  
  useEffect(() => {
    const isRobotTurn = isRobotPlayer(currentPlayer.name);
    if (!isRobotTurn || isFinished) return;

    const timer = setTimeout(() => {
      if (state.phase === 'swap') {
        const swapDecision = chooseRobotSwapDecision(state, state.currentPlayerIndex);
        if (swapDecision.type === 'swap') {
          setState(swapCards(state, state.currentPlayerIndex, swapDecision.handCardId, swapDecision.faceUpCardId));
        } else {
          setState(confirmSwap(state, state.currentPlayerIndex));
          setSwapSource(null);
        }
        return;
      }

      const playDecision = chooseRobotPlayDecision(state, state.currentPlayerIndex);
      if (playDecision.type === 'faceDown') {
        setState(playCards(state, [playDecision.cardId]));
        return;
      }
      if (playDecision.type === 'play') {
        setState(playCards(state, playDecision.cardIds));
        return;
      }
      if (playDecision.type === 'drawAndTry') {
        setState(drawAndTryFromTalong(state));
        return;
      }
      setState(pickUpPile(state));
    }, 900);

    return () => clearTimeout(timer);
  }, [currentPlayer, isFinished, state]);

  useEffect(() => {
    if (!isFinished) {
      setFinalLine('');
      setResultImageSrc('');
      return;
    }

    const lines = orjanWon ? ORJAN_WINNING_LINES : humanWonAgainstOrjan ? ORJAN_LOSING_LINES : [];
    if (lines.length === 0) {
      setFinalLine('');
      setResultImageSrc('');
      return;
    }

    const randomIndex = Math.floor(Math.random() * lines.length);
    setFinalLine(lines[randomIndex]);
    setResultImageSrc(orjanWon ? ORJAN_WIN_IMAGE.primary : ORJAN_LOSS_IMAGE.primary);
  }, [humanWonAgainstOrjan, isFinished, orjanWon]);

  return (
    <div className="flex flex-col min-h-screen p-4 pt-14 pb-6 relative">
      <div className="gradient-radial fixed inset-0 pointer-events-none" />

      <div className={isFinished ? 'opacity-35 pointer-events-none transition-opacity' : 'transition-opacity'}>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-3 flex items-center justify-between z-20 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="text-sm text-muted-foreground">
          {state.drawPile.length} i talong
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
      <div className="flex gap-2 justify-center mb-2 flex-wrap">
        {state.players.map((p, i) => {
          if (i === myPlayerIndex) return null;
          const total = p.hand.length + p.faceUp.length + p.faceDown.length;
          return (
            <div key={i} className={`bg-card rounded-lg px-3 py-1.5 text-xs border ${i === state.currentPlayerIndex ? 'border-primary text-gold' : 'border-border text-muted-foreground'}`}>
              {p.name}: {total} kort
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center mb-4 flex-wrap">
        {state.players.map((p, i) => {
          if (i === myPlayerIndex) return null;

          return (
            <div key={`table-${i}`} className="rounded-lg border border-border/40 bg-card/40 p-2">
              <p className="text-[10px] text-muted-foreground mb-1 text-center uppercase tracking-wider">{p.name} bordskort</p>
              <div className="flex gap-2">
                {[0, 1, 2].map(slot => (
                  <div key={slot}>{renderTableStack(p.faceDown[slot], p.faceUp[slot])}</div>
                ))}
              </div>

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
            disabled={!canTryTalong || !isMyTurn}
            onClick={() => {
              if (!canTryTalong || !isMyTurn) return;
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
           <div key={i}>
           {renderTableStack(myPlayer.faceDown[i], myPlayer.faceUp[i], {
             allowFaceDownPlay: isMyTurn && source === 'faceDown',
             allowFaceUpSelection: isMyTurn && (isSwapPhase || source === 'faceUp'),
             faceUpSelected: myPlayer.faceUp[i]
               ? (isSwapPhase ? swapSource?.id === myPlayer.faceUp[i].id : selectedCards.includes(myPlayer.faceUp[i].id))
               : false,
             onFaceDownClick: () => isMyTurn && source === 'faceDown' && myPlayer.faceDown[i] && toggleSelect(myPlayer.faceDown[i].id),
             onFaceUpClick: () => {
               if (!myPlayer.faceUp[i]) return;
               if (isSwapPhase) handleSwapClick('faceUp', myPlayer.faceUp[i].id);
               else if (source === 'faceUp') toggleSelect(myPlayer.faceUp[i].id);
             },
           })}


            </div>
          ))}
        </div>
      </div>

      {/* Current player's hand */}
      <div className="mt-auto">
        <p className="text-xs text-muted-foreground mb-2 text-center uppercase tracking-wider">
          <Hand size={12} className="inline mr-1" />
          Hand ({myPlayer.hand.length})
        </p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          {myPlayer.hand.map(card => (
            <MiniCard
              key={card.id}
              card={card}
              selected={isSwapPhase ? swapSource?.id === card.id : selectedCards.includes(card.id)}
              disabled={!isMyTurn || (!isSwapPhase && source !== 'hand')}              onClick={() => {
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
            disabled={!isMyTurn}
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
                disabled={!isMyTurn}
                className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2"
              >
                <ArrowUp size={16} /> Spela
              </motion.button>
            )}
            {state.discardPile.length > 0 && !hasPlayableCard && source !== 'faceDown' && !mustCoverTwoNow && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePickUp}
                disabled={!isMyTurn}
                className="px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold flex items-center gap-2"
              >
                Ta upp högen
              </motion.button>
            )}
            
          </>
        )}
      </div>
      </div>

      {isFinished && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-lg"
          >
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-3xl font-bold text-gold mb-2">{winner.name} vinner!</h2>
            <p className="text-muted-foreground mb-4">Grattis!</p>
            {(orjanWon || humanWonAgainstOrjan) && (
              <img
                src={resultImageSrc}
                alt={orjanWon ? 'Örjan när han vinner' : 'Örjan när han förlorar'}
                className="mx-auto mb-4 w-full max-w-sm rounded-xl border border-border/50"
                onError={(event) => {
                  const fallbackSrc = orjanWon ? ORJAN_WIN_IMAGE.fallback : ORJAN_LOSS_IMAGE.fallback;
                  if (event.currentTarget.src.endsWith(fallbackSrc)) return;
                  setResultImageSrc(fallbackSrc);
                }}
              />
            )}
            {finalLine && <p className="text-sm italic text-muted-foreground mb-8">{finalLine}</p>}
            <div className="flex gap-3 justify-center">
              <button onClick={handleRestart} className="px-6 py-3 rounded-xl bg-gold text-primary-foreground font-semibold glow-gold">Spela igen</button>
              <button onClick={onReset} className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold">Byt spelare</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
