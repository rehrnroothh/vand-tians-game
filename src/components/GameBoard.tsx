import { DragEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
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
  dealGame,
  getFaceUpCards,
  getFaceUpTopCards,
  normalizeGameState,
} from '@/lib/gameEngine';
import { setCardDragPreview } from '@/lib/dragPreview';
import { RotateCcw, ArrowUp, Hand, Download } from 'lucide-react';
import { chooseRobotPlayDecision, chooseRobotSwapDecision } from '@/lib/robotAi';

interface GameBoardProps {
  initialState: GameState;
  onReset: () => void;
}

interface TouchDragState {
  pointerId: number;
  cardIds: string[];
  leadCard: Card;
  sourceId: string;
  sourceType: 'hand' | 'faceUp' | 'faceDown';
  faceDown: boolean;
  small: boolean;
  started: boolean;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

const ORJAN_LOSING_LINES = [
  'Örjan Lax: “Jaha. Kul. Då var det alltså riggat, kukkannen!”',
  'Örjan Lax: "Din jävla Viktor-till-kassa-5-kopia, det där räknas inte. Reglerna är ju felprogrammerade”',
  'Örjan Lax: "Om du ska fuska kan vi lika gärna lägga ned denna skit med en gång.”',
  'Örjan Lax: "Okej, grattis då förfan. Men det här säger mer om spelet än om mig.”',
  'Örjan Lax: "Jag förlorade inte. Jag avbröt.”',
  'Örjan Lax: "Det där är inte ett ‘spel’, det är ett jävla irritationsmoment.”',
];


const ORJAN_WIN_IMAGE = {
  primary: '/orjan-winning.png',
  
};

const ORJAN_LOSS_IMAGE = {
  primary: '/orjan-losing.png',
  
};

const ORJAN_WINNING_LINES = [
  'Örjan Lax: "Det var inte så svårt. Det svåra var att stå ut med dig och processen.”',
  'Örjan Lax: "Grattis till din insats. Du var… närvarande.”',
  'Örjan Lax: "Du märker skillnaden när man tänker innan man gör.”',
  'Örjan Lax: "Snyggt. Och då menar jag: av mig, idiot.”',
  'Örjan Lax: "Alltså, jag säger inte att du var helt usel… men du gjorde ditt bästa för att bevisa motsatsen.”',
  'Örjan Lax: "Det är nästan rörande hur du försökte.”',
  'Örjan Lax: "Ja, det här är exakt varför jag inte gillar spel. Man tvingas vinna åt andra.”',
  'Örjan Lax: "Bra. Då kan vi gå vidare till något vuxet för en gångs jävla skull.”',
];

const GameBoard = ({ initialState, onReset }: GameBoardProps) => {
  const [state, setState] = useState<GameState>(() => normalizeGameState(initialState));
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [swapSource, setSwapSource] = useState<{ type: 'hand' | 'faceUp'; id: string } | null>(null);
  const [draggedCardIds, setDraggedCardIds] = useState<string[]>([]);
  const [touchDrag, setTouchDrag] = useState<TouchDragState | null>(null);
  const [showWinState, setShowWinState] = useState(false);
  const [finalLine, setFinalLine] = useState('');
  const [resultImageSrc, setResultImageSrc] = useState('');
  const touchDragRef = useRef<TouchDragState | null>(null);
  const discardPileRef = useRef<HTMLDivElement | null>(null);
  const suppressTouchClickUntilRef = useRef(0);

  const isRobotPlayer = (name: string) => name.toLowerCase().startsWith('örjan');

  const currentPlayer = state.players[state.currentPlayerIndex];
  const humanPlayerIndex = state.players.findIndex((player) => !isRobotPlayer(player.name));
  const myPlayerIndex = humanPlayerIndex === -1 ? 0 : humanPlayerIndex;
  const myPlayer = state.players[myPlayerIndex];
  const myFaceUpCards = getFaceUpCards(myPlayer);
  const myFaceUpTopCards = getFaceUpTopCards(myPlayer);
  const source = getPlaySource(myPlayer);
  const isMyTurn = state.currentPlayerIndex === myPlayerIndex;

  const isSwapPhase = state.phase === 'swap';
  const isFinished = state.phase === 'finished';
  const winnerIndex = state.winner;
  const winner = winnerIndex !== null ? state.players[winnerIndex] : currentPlayer;
  const hasRobotPlayers = state.players.some((player) => isRobotPlayer(player.name));
  const orjanWon = winnerIndex !== null && isRobotPlayer(state.players[winnerIndex].name);
  const humanWonAgainstOrjan = winnerIndex !== null && winnerIndex === myPlayerIndex && hasRobotPlayers;
  const mustCoverTwoNow =
    state.mustCoverTwo && state.mustCoverTwoPlayerIndex === state.currentPlayerIndex;

  const topDiscard = state.discardPile.length > 0
    ? state.discardPile[state.discardPile.length - 1]
    : null;

  const setTouchDragState = (nextState: TouchDragState | null) => {
    touchDragRef.current = nextState;
    setTouchDrag(nextState);
  };

  const suppressNextTouchClick = () => {
    suppressTouchClickUntilRef.current = Date.now() + 400;
  };

  const shouldIgnoreTouchClick = () => Date.now() < suppressTouchClickUntilRef.current;

  const findMyCardById = (cardId: string) =>
    [...myPlayer.hand, ...myFaceUpCards, ...myPlayer.faceDown].find((card) => card.id === cardId);

  const getFaceUpValueCardIds = (cardId: string) => {
    const clickedCard = myFaceUpCards.find((card) => card.id === cardId);
    if (!clickedCard) return [];
    return getFaceUpValueCardIdsForPlayer(myPlayer, clickedCard.value);
  };

  const getFaceUpValueCardIdsForPlayer = (player: GameState['players'][number], value: number) =>
    getFaceUpCards(player)
      .filter((card) => card.value === value)
      .map((card) => card.id);

  const toggleSelect = (cardId: string) => {
    if (isSwapPhase) return;
    
    if (!isMyTurn) return;

    const nextCardIds = source === 'faceUp' ? getFaceUpValueCardIds(cardId) : [cardId];
    const card = [...myPlayer.hand, ...myFaceUpCards, ...myPlayer.faceDown]
      .find(c => c.id === nextCardIds[0]);
    if (!card) return;

    if (source === 'faceDown') {
      // Blind play — just play immediately
      setState(playCards(state, [cardId]));
      return;
    }

    const isAlreadySelected = nextCardIds.every((id) => selectedCards.includes(id));

    if (isAlreadySelected) {
      setSelectedCards(selectedCards.filter(id => !nextCardIds.includes(id)));
    } else {
      // Can only select cards of same value
      if (selectedCards.length > 0) {
        const firstCard = [...myPlayer.hand, ...myFaceUpCards]
          .find(c => c.id === selectedCards[0]);
        if (firstCard && firstCard.value !== card.value) {
          setSelectedCards(nextCardIds);
          return;
        }
      }
      setSelectedCards([...selectedCards.filter(id => !nextCardIds.includes(id)), ...nextCardIds]);
    }
  };

  const handlePlay = () => {
    if (!isMyTurn || selectedCards.length === 0) return;
    const newState = playCards(state, selectedCards);
    setState(newState);
    if (newState.currentPlayerIndex === myPlayerIndex && newState.mustPlayMatchingTableValue !== null) {
      setSelectedCards(
        getFaceUpValueCardIdsForPlayer(
          newState.players[myPlayerIndex],
          newState.mustPlayMatchingTableValue,
        ),
      );
      return;
    }

    setSelectedCards([]);
    setDraggedCardIds([]);
    setTouchDragState(null);
  };

  const handlePickUp = () => {
    if (!isMyTurn) return;
    setState(pickUpPile(state));
    setSelectedCards([]);
    setDraggedCardIds([]);
    setTouchDragState(null);
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

  const performSwap = (sourceType: 'hand' | 'faceUp', sourceId: string, targetType: 'hand' | 'faceUp', targetId: string) => {
    const handId = sourceType === 'hand' ? sourceId : targetId;
    const faceUpId = sourceType === 'faceUp' ? sourceId : targetId;
    setState(swapCards(state, state.currentPlayerIndex, handId, faceUpId));
    setSwapSource(null);
  };

  const handleConfirmSwap = () => {
    if (!isMyTurn) return;
    setState(confirmSwap(state, state.currentPlayerIndex));
    setSwapSource(null);
    setTouchDragState(null);
  };

  const handleRestart = () => {
    const names = state.players.map(p => p.name);
    setState(dealGame(names));
    setSelectedCards([]);
    setSwapSource(null);
    setDraggedCardIds([]);
    setTouchDragState(null);
  };

  const resolveDraggedCardIds = (cardId: string) => {
    const sourceCards = source === 'hand' ? myPlayer.hand : source === 'faceUp' ? myFaceUpCards : myPlayer.faceDown;
    const baseCardIds = source === 'faceUp' ? getFaceUpValueCardIds(cardId) : [cardId];

    if (selectedCards.includes(cardId)) {
      return selectedCards;
    }

    if (selectedCards.length > 0) {
      const selectedLeadCard = sourceCards.find((card) => card.id === selectedCards[0]);
      const draggedLeadCard = sourceCards.find((card) => card.id === baseCardIds[0]);

      if (
        selectedLeadCard &&
        draggedLeadCard &&
        selectedLeadCard.value === draggedLeadCard.value
      ) {
        return [...new Set([...selectedCards, ...baseCardIds])];
      }
    }

    return baseCardIds;
  };

  const handleCardDragStart = (event: DragEvent<HTMLDivElement>, cardId: string) => {
    if (!isMyTurn) return;
    const cardIds = resolveDraggedCardIds(cardId);
    if (cardIds.length === 0) return;

    const draggedCards = cardIds
      .map((id) => findMyCardById(id))
      .filter(Boolean) as Card[];

    setDraggedCardIds(cardIds);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);
    setCardDragPreview(event, draggedCards[0], cardIds.length, source === 'faceDown');
  };

  const handleCardDragEnd = () => {
    setDraggedCardIds([]);
  };

  const handleCardDropOnCard = (event: DragEvent<HTMLDivElement>, onClick?: () => void) => {
    event.preventDefault();
    if (!isMyTurn) return;
    onClick?.();
    setDraggedCardIds([]);
  };

  const playCardIds = (cardsToPlay: string[]) => {
    if (!isMyTurn || isSwapPhase) return;
    if (cardsToPlay.length === 0) return;

    const newState = playCards(state, cardsToPlay);
    setState(newState);
    if (newState.currentPlayerIndex === myPlayerIndex && newState.mustPlayMatchingTableValue !== null) {
      setSelectedCards(
        getFaceUpValueCardIdsForPlayer(
          newState.players[myPlayerIndex],
          newState.mustPlayMatchingTableValue,
        ),
      );
    } else {
      setSelectedCards([]);
    }
    setDraggedCardIds([]);
    setTouchDragState(null);
  };

  const playDraggedOrSelectedCards = () => {
    const cardsToPlay = draggedCardIds.length > 0 ? draggedCardIds : selectedCards;
    playCardIds(cardsToPlay);
  };

  const isPointOverDiscardPile = (x: number, y: number) => {
    const rect = discardPileRef.current?.getBoundingClientRect();
    return !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };

  const handleTouchCardPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    cardId: string,
    card: Card,
    options?: {
      enabled?: boolean;
      faceDown?: boolean;
      small?: boolean;
      sourceType?: 'hand' | 'faceUp' | 'faceDown';
    },
  ) => {
    if (event.pointerType === 'mouse' || !isMyTurn || options?.enabled === false) return;

    const sourceType = options?.sourceType ?? 'hand';
    const cardIds = isSwapPhase ? [cardId] : resolveDraggedCardIds(cardId);
    if (cardIds.length === 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setTouchDragState({
      pointerId: event.pointerId,
      cardIds,
      leadCard: card,
      sourceId: cardId,
      sourceType,
      faceDown: options?.faceDown ?? false,
      small: options?.small ?? false,
      started: false,
      originX: event.clientX,
      originY: event.clientY,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleTouchCardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const currentDrag = touchDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const distance = Math.hypot(event.clientX - currentDrag.originX, event.clientY - currentDrag.originY);
    const started = currentDrag.started || distance > 8;

    if (started && !currentDrag.started) {
      setDraggedCardIds(currentDrag.cardIds);
      if (isSwapPhase && currentDrag.sourceType !== 'faceDown') {
        setSwapSource({ type: currentDrag.sourceType, id: currentDrag.sourceId });
      } else if (!currentDrag.faceDown) {
        setSelectedCards(currentDrag.cardIds);
      }
    }

    setTouchDragState({
      ...currentDrag,
      started,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleTouchCardPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const currentDrag = touchDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    event.preventDefault();
    suppressNextTouchClick();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const swapTargetElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-swap-card-id]');
    const swapTargetId = swapTargetElement?.dataset.swapCardId;
    const swapTargetType = swapTargetElement?.dataset.swapCardType as 'hand' | 'faceUp' | undefined;
    const shouldPlay = !isSwapPhase && currentDrag.started && isPointOverDiscardPile(event.clientX, event.clientY);
    setDraggedCardIds([]);

    if (!currentDrag.started) {
      if (isSwapPhase && currentDrag.sourceType !== 'faceDown') {
        handleSwapClick(currentDrag.sourceType, currentDrag.sourceId);
      } else {
        toggleSelect(currentDrag.sourceId);
      }
      setTouchDragState(null);
      return;
    }

    if (
      isSwapPhase &&
      currentDrag.sourceType !== 'faceDown'
    ) {
      if (
        swapTargetId &&
        swapTargetType &&
        swapTargetType !== currentDrag.sourceType
      ) {
        performSwap(currentDrag.sourceType, currentDrag.sourceId, swapTargetType, swapTargetId);
      } else {
        setSwapSource({ type: currentDrag.sourceType, id: currentDrag.sourceId });
      }
      setTouchDragState(null);
      return;
    }

    if (shouldPlay) {
      playCardIds(currentDrag.cardIds);
      return;
    }

    if (currentDrag.started && !currentDrag.faceDown) {
      setSelectedCards(currentDrag.cardIds);
    }

    setTouchDragState(null);
  };

  const handleDropOnDiscardPile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    playDraggedOrSelectedCards();
  };


  // Check if selected cards can be played
  const canPlay = selectedCards.length > 0 && (() => {
    const cards = selectedCards.map(id =>
      [...myPlayer.hand, ...myFaceUpCards].find(c => c.id === id)
    ).filter(Boolean);
    if (cards.length === 0) return false;
    return canPlayCard(cards[0]!, state.discardPile);
  })();

  // Check if any card in hand/faceUp can be played
  const sourceCards = source === 'hand' ? myPlayer.hand : source === 'faceUp' ? myFaceUpCards : [];
  const hasPlayableCard = sourceCards.some(c => canPlayCard(c, state.discardPile));
  const canTryTalong =
    state.phase === 'play' &&
    state.discardPile.length > 0 &&
    state.drawPile.length > 0 &&
    source !== 'faceDown' &&
    !hasPlayableCard;
  const canPickUpPile =
    state.phase === 'play' &&
    isMyTurn &&
    state.discardPile.length > 0 &&
    source !== 'faceDown' &&
    !mustCoverTwoNow &&
    state.mustPlayMatchingTableValue === null;

  

    const renderTableStack = (
      faceDownCard: Card | undefined,
      faceUpStack: Card[],
      options?: {
        allowFaceDownPlay?: boolean;
        allowFaceUpSelection?: boolean;
        faceUpSelected?: boolean;
        onFaceDownClick?: () => void;
        onFaceUpClick?: () => void;
      },
    ) => {
      const faceUpCard = faceUpStack[faceUpStack.length - 1];
      const stackCount = faceUpStack.length;
      const showFaceDown = !!faceDownCard && !faceUpCard;
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
                draggable={!!options?.allowFaceDownPlay}
                onNativeDragStart={(event) => faceDownCard && handleCardDragStart(event, faceDownCard.id)}
                onNativeDragEnd={handleCardDragEnd}
                onNativeDragOver={(event) => event.preventDefault()}
                onNativeDrop={(event) => handleCardDropOnCard(event, options?.onFaceDownClick)}
                onNativePointerDown={(event) =>
                  faceDownCard && handleTouchCardPointerDown(event, faceDownCard.id, faceDownCard, {
                    enabled: !!options?.allowFaceDownPlay,
                    faceDown: true,
                    small: true,
                    sourceType: 'faceDown',
                  })
                }
                onNativePointerMove={handleTouchCardPointerMove}
                onNativePointerUp={handleTouchCardPointerEnd}
                onNativePointerCancel={handleTouchCardPointerEnd}

              />
            </div>
          )}
          {showFaceUp && (
            <div className="absolute inset-0 z-10">
              <MiniCard
                card={faceUpCard}
                small
                shadowless={stackCount > 1}
                selected={options?.faceUpSelected}
                disabled={!options?.allowFaceUpSelection}
                onClick={options?.onFaceUpClick}
                draggable={!!options?.allowFaceUpSelection}
                onNativeDragStart={(event) => faceUpCard && handleCardDragStart(event, faceUpCard.id)}
                onNativeDragEnd={handleCardDragEnd}
                onNativeDragOver={(event) => event.preventDefault()}
                onNativeDrop={(event) => handleCardDropOnCard(event, options?.onFaceUpClick)}
                onNativePointerDown={(event) =>
                  faceUpCard && handleTouchCardPointerDown(event, faceUpCard.id, faceUpCard, {
                    enabled: !!options?.allowFaceUpSelection,
                    small: true,
                    sourceType: 'faceUp',
                  })
                }
                onNativePointerMove={handleTouchCardPointerMove}
                onNativePointerUp={handleTouchCardPointerEnd}
                onNativePointerCancel={handleTouchCardPointerEnd}
                swapDropCardId={isSwapPhase ? faceUpCard.id : undefined}
                swapDropType={isSwapPhase ? 'faceUp' : undefined}

              />
              {stackCount > 1 && (
                <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {stackCount}
                </span>
              )}
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
      setShowWinState(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowWinState(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isFinished]);

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
      {touchDrag?.started && (
        <div
          className="pointer-events-none fixed z-40"
          style={{
            left: touchDrag.x,
            top: touchDrag.y,
            transform: 'translate(-50%, -62%)',
          }}
        >
          <div className="relative">
            {touchDrag.cardIds.length > 1 && (
              <div className="absolute left-2 top-1 opacity-25">
                <MiniCard
                  card={touchDrag.leadCard}
                  faceDown={touchDrag.faceDown}
                  small={touchDrag.small}
                  shadowless
                />
              </div>
            )}
            <MiniCard
              card={touchDrag.leadCard}
              faceDown={touchDrag.faceDown}
              small={touchDrag.small}
              shadowless
            />
            {touchDrag.cardIds.length > 1 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-lg">
                {touchDrag.cardIds.length}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={showWinState ? 'opacity-35 pointer-events-none transition-opacity' : 'transition-opacity'}>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-3 flex items-center justify-between z-20 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="text-sm text-foreground/70">
          {state.drawPile.length} i talong
        </div>
        <button onClick={onReset} className="p-1.5 rounded-lg bg-secondary text-foreground/70">
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
          className="text-center text-sm text-foreground/70 mb-4 px-4"
        >
          {state.message}
        </motion.div>
      </AnimatePresence>

      {/* Other players overview */}
      <div className="flex gap-2 justify-center mb-2 flex-wrap">
        {state.players.map((p, i) => {
          if (i === myPlayerIndex) return null;
          const total = p.hand.length + getFaceUpCards(p).length + p.faceDown.length;
          return (
            <div key={i} className={`bg-card rounded-lg px-3 py-1.5 text-xs border ${i === state.currentPlayerIndex ? 'border-primary text-gold' : 'border-border text-foreground/70'}`}>
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
              <p className="text-[10px] text-foreground/70 mb-1 text-center uppercase tracking-wider">{p.name} bordskort</p>
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
          <span className={`text-[10px] mt-1 block transition-colors ${canTryTalong ? 'text-emerald-400' : 'text-foreground/70'}`}>
            Talong
          </span>
          <div className={`mx-auto mt-1 h-0.5 w-14 rounded-full transition-opacity ${canTryTalong ? 'bg-emerald-400 opacity-100' : 'bg-transparent opacity-0'}`} />
        </div>

        {/* Discard pile */}
        <div
          ref={discardPileRef}
          className="text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDropOnDiscardPile}
          onClick={() => {
            if (shouldIgnoreTouchClick()) return;
            playDraggedOrSelectedCards();
          }}
        >

          {topDiscard ? (
            <MiniCard card={topDiscard} />
          ) : (
            <div className="w-14 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
              <span className="text-xs text-foreground/70">Tom</span>
            </div>
          )}
          <span className="text-[10px] text-white mt-1 block">
            Hög ({state.discardPile.length})
          </span>
        </div>
      </div>

      {/* Current player's table cards */}
      <div className="mb-4">
        <p className="text-xs text-foreground/70 mb-2 text-center uppercase tracking-wider">Bordskort</p>
        <div className="flex justify-center gap-3">
          {[0, 1, 2].map(i => {
            const topFaceUpCard = myFaceUpTopCards[i];
            const allowFaceUpSelection = isMyTurn && (
              isSwapPhase ||
              (
                source === 'faceUp' &&
                (
                  state.mustPlayMatchingTableValue === null ||
                  topFaceUpCard?.value === state.mustPlayMatchingTableValue
                )
              )
            );
            return (
              <div key={i}>
                {renderTableStack(myPlayer.faceDown[i], myPlayer.faceUp[i], {
                  allowFaceDownPlay: isMyTurn && source === 'faceDown',
                  allowFaceUpSelection,
                  faceUpSelected: topFaceUpCard
                    ? (isSwapPhase ? swapSource?.id === topFaceUpCard.id : selectedCards.includes(topFaceUpCard.id))
                    : false,
                  onFaceDownClick: () => {
                    if (shouldIgnoreTouchClick()) return;
                    if (isMyTurn && source === 'faceDown' && myPlayer.faceDown[i]) {
                      toggleSelect(myPlayer.faceDown[i].id);
                    }
                  },
                  onFaceUpClick: () => {
                    if (shouldIgnoreTouchClick()) return;
                    if (!topFaceUpCard) return;
                    if (isSwapPhase) handleSwapClick('faceUp', topFaceUpCard.id);
                    else if (source === 'faceUp') toggleSelect(topFaceUpCard.id);
                  },
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current player's hand */}
      <div className="mt-auto">
        <p className="text-xs text-foreground/70 mb-2 text-center uppercase tracking-wider">
          <Hand size={12} className="inline mr-1" />
          Hand ({myPlayer.hand.length})
        </p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          {myPlayer.hand.map(card => (
            <MiniCard
              key={card.id}
              card={card}
              selected={isSwapPhase ? swapSource?.id === card.id : selectedCards.includes(card.id)}
              disabled={!isMyTurn || (!isSwapPhase && source !== 'hand')}
              draggable={isMyTurn && (isSwapPhase || source === 'hand')}
              onNativeDragStart={(event) => handleCardDragStart(event, card.id)}
              onNativeDragEnd={handleCardDragEnd}
              onNativeDragOver={(event) => event.preventDefault()}
              onNativeDrop={(event) => handleCardDropOnCard(event, () => {
                if (isSwapPhase) handleSwapClick('hand', card.id);
                else toggleSelect(card.id);
              })}
              onNativePointerDown={(event) => handleTouchCardPointerDown(event, card.id, card, {
                enabled: isMyTurn && (isSwapPhase || source === 'hand'),
                sourceType: 'hand',
              })}
              onNativePointerMove={handleTouchCardPointerMove}
              onNativePointerUp={handleTouchCardPointerEnd}
              onNativePointerCancel={handleTouchCardPointerEnd}
              swapDropCardId={isSwapPhase ? card.id : undefined}
              swapDropType={isSwapPhase ? 'hand' : undefined}
              onClick={() => {
                if (shouldIgnoreTouchClick()) return;

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
          isMyTurn ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirmSwap}
              className="px-6 py-3 rounded-xl bg-gold text-white font-semibold glow-gold"
            >
              Klar med byten
            </motion.button>
          ) : (
            <p className="text-foreground/70 text-sm">Väntar på {currentPlayer.name}...</p>
          )
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
            {canPickUpPile && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePickUp}
                disabled={!isMyTurn}
                className="px-5 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold flex items-center gap-2"
              >
                <Download size={16} /> Ta upp högen
              </motion.button>
            )}
            
          </>
        )}
      </div>
      </div>

      {showWinState && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-lg"
          >
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-3xl font-bold text-gold mb-2">{winner.name} vinner!</h2>
            
            {(orjanWon || humanWonAgainstOrjan) && (
              <img
                src={resultImageSrc}
                alt={orjanWon ? 'Örjan när han vinner' : 'Örjan när han förlorar'}
                className="mx-auto mb-4 w-full max-w-sm rounded-xl border border-border/50"
                onError={(event) => {
                  const fallbackSrc = orjanWon ? ORJAN_WIN_IMAGE.primary : ORJAN_LOSS_IMAGE.primary;
                  if (event.currentTarget.src.endsWith(fallbackSrc)) return;
                  setResultImageSrc(fallbackSrc);
                }}
              />
            )}
            {finalLine && <p className="text-sm italic text-foreground/70 mb-8">{finalLine}</p>}
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
