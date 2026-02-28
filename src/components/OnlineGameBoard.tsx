import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  GameState,
  getPlaySource,
  canPlayCard,
  playCards,
  pickUpPile,
  swapCards,
  confirmSwap,
  drawAndTryFromTalong,
  getFaceUpCards,
  getFaceUpTopCards,
  normalizeGameState,
} from '@/lib/gameEngine';
import { updateGameState } from '@/lib/roomService';
import MiniCard from './MiniCard';
import { ArrowUp, Hand, RotateCcw } from 'lucide-react';

interface OnlineGameBoardProps {
  roomId: string;
  sessionId: string;
  playerIndex: number;
  onReset: () => void;
}

const OnlineGameBoard = ({ roomId, sessionId, playerIndex, onReset }: OnlineGameBoardProps) => {
  const [state, setState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [swapSource, setSwapSource] = useState<{ type: 'hand' | 'faceUp'; id: string } | null>(null);
  const [showWinState, setShowWinState] = useState(false);
  const [disconnectNotice, setDisconnectNotice] = useState<string | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const roomPlayerCountRef = useRef<number | null>(null);
  const disconnectNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync for subscription callback
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    // Initial fetch
    supabase.from('rooms').select('game_state').eq('id', roomId).single().then(({ data }) => {
      if (data?.game_state) {
        setState(normalizeGameState(data.game_state as unknown as GameState));
      }
    });

    // Realtime updates
    const channel = supabase
      .channel(`game-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const gs = payload.new.game_state as unknown as GameState;
        if (gs) setState(normalizeGameState(gs));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    let active = true;

    const refreshPlayerCount = async () => {
      const { count, error } = await supabase
        .from('room_players')
        .select('session_id', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if (!active || error || count === null) return;

      const previousCount = roomPlayerCountRef.current;
      roomPlayerCountRef.current = count;

      if (previousCount !== null && count < previousCount) {
        setDisconnectNotice('En spelare lämnade rummet.');
        if (disconnectNoticeTimeoutRef.current) {
          clearTimeout(disconnectNoticeTimeoutRef.current);
        }
        disconnectNoticeTimeoutRef.current = setTimeout(() => {
          setDisconnectNotice(null);
        }, 3000);
      }
    };

    void refreshPlayerCount();

    const playersChannel = supabase
      .channel(`room-${roomId}-players-live`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => {
        void refreshPlayerCount();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(playersChannel);
      if (disconnectNoticeTimeoutRef.current) {
        clearTimeout(disconnectNoticeTimeoutRef.current);
      }
    };
  }, [roomId]);

  const isFinished = state?.phase === 'finished';
  const winner = isFinished && state && state.winner !== null ? state.players[state.winner] : null;

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

  if (!state) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground">Laddar spel...</p>
      </div>
    </div>
  );

  const isMyTurn = state.currentPlayerIndex === playerIndex;
  const isSwapPhase = state.phase === 'swap' && state.currentPlayerIndex === playerIndex;
  const me = state.players[playerIndex];
  const meFaceUpCards = me ? getFaceUpCards(me) : [];
  const meFaceUpTopCards = me ? getFaceUpTopCards(me) : [];
  const source = me ? getPlaySource(me) : 'hand';
  const topDiscard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;
  const mustCoverTwoNow =
    state.mustCoverTwo && state.mustCoverTwoPlayerIndex === state.currentPlayerIndex;

  const applyAndSync = async (newState: GameState) => {
    const normalizedState = normalizeGameState(newState);
    setState(normalizedState);
    await updateGameState(roomId, normalizedState);
  };

  const getFaceUpValueCardIds = (cardId: string) => {
    const clickedCard = meFaceUpCards.find((card) => card.id === cardId);
    if (!clickedCard) return [];
    return getFaceUpValueCardIdsForPlayer(me, clickedCard.value);
  };

  const getFaceUpValueCardIdsForPlayer = (player: GameState['players'][number], value: number) =>
    getFaceUpCards(player)
      .filter((card) => card.value === value)
      .map((card) => card.id);

  const toggleSelect = (cardId: string) => {
    if (!isMyTurn || !me) return;
    if (source === 'faceDown') {
      applyAndSync(playCards(state, [cardId]));
      return;
    }

    const nextCardIds = source === 'faceUp' ? getFaceUpValueCardIds(cardId) : [cardId];
    const card = [...me.hand, ...meFaceUpCards, ...me.faceDown].find((currentCard) => currentCard.id === nextCardIds[0]);
    if (!card) return;

    const isAlreadySelected = nextCardIds.every((id) => selectedCards.includes(id));

    if (isAlreadySelected) {
      setSelectedCards(selectedCards.filter(id => !nextCardIds.includes(id)));
    } else {
      if (selectedCards.length > 0) {
        const firstCard = [...me.hand, ...meFaceUpCards].find(c => c.id === selectedCards[0]);
        if (firstCard && firstCard.value !== card.value) {
          setSelectedCards(nextCardIds);
          return;
        }
      }
      setSelectedCards([...selectedCards.filter(id => !nextCardIds.includes(id)), ...nextCardIds]);
    }
  };

  const handlePlay = async () => {
    if (!selectedCards.length || !isMyTurn) return;
    const newState = playCards(state, selectedCards);
    if (newState.currentPlayerIndex === playerIndex && newState.mustPlayMatchingTableValue !== null) {
      setSelectedCards(
        getFaceUpValueCardIdsForPlayer(
          newState.players[playerIndex],
          newState.mustPlayMatchingTableValue,
        ),
      );
    } else {
      setSelectedCards([]);
    }
    await applyAndSync(newState);
  };

  const handlePickUp = async () => {
    if (!isMyTurn) return;
    await applyAndSync(pickUpPile(state));
    setSelectedCards([]);
  };

  const handleSwapClick = (type: 'hand' | 'faceUp', id: string) => {
    if (!isSwapPhase) return;
    if (!swapSource) { setSwapSource({ type, id }); return; }
    if (swapSource.type !== type) {
      const handId = type === 'hand' ? id : swapSource.id;
      const faceUpId = type === 'faceUp' ? id : swapSource.id;
      setState(swapCards(state, playerIndex, handId, faceUpId));
      setSwapSource(null);
    } else {
      setSwapSource({ type, id });
    }
  };

  const handleConfirmSwap = async () => {
    if (!me) return;
    const newState = confirmSwap(state, playerIndex);
    setState(newState);
    setSwapSource(null);
    await updateGameState(roomId, newState);
  };

  const sourceCards = source === 'hand' ? me?.hand ?? [] : source === 'faceUp' ? meFaceUpCards : [];
  const hasPlayableCard = sourceCards.some(c => canPlayCard(c, state.discardPile));
  const canPlay = selectedCards.length > 0 && (() => {
    const cards = selectedCards.map(id => [...(me?.hand ?? []), ...meFaceUpCards].find(c => c.id === id)).filter(Boolean);
    return cards.length > 0 && canPlayCard(cards[0]!, state.discardPile);
  })();
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
              {stackCount > 1 && (
                <div className="pointer-events-none absolute inset-x-1 top-1 bottom-0 rounded-lg border border-border/30 bg-card/40" />
              )}
              <MiniCard
                card={faceUpCard}
                small
                selected={options?.faceUpSelected}
                disabled={!options?.allowFaceUpSelection}
                onClick={options?.onFaceUpClick}
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
  

  return (
    <div className="flex flex-col min-h-screen p-4 pt-14 pb-6 relative">
      <div className="gradient-radial fixed inset-0 pointer-events-none" />

      <div className={showWinState ? 'opacity-35 pointer-events-none transition-opacity' : 'transition-opacity'}>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-3 flex items-center justify-between z-20 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="text-sm text-muted-foreground"> {state.drawPile.length} kvar</div>
        <button onClick={onReset} className="p-1.5 rounded-lg bg-secondary text-muted-foreground"><RotateCcw size={16} /></button>
      </div>

      <AnimatePresence>
        {disconnectNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mx-auto mb-2 mt-1 w-fit rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200"
          >
            {disconnectNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Other players */}
      <div className="flex gap-2 justify-center mb-2 flex-wrap">
        {state.players.map((p, i) => {
          if (i === playerIndex) return null;
          const total = p.hand.length + getFaceUpCards(p).length + p.faceDown.length;
          return (
            <div key={i} className={`bg-card rounded-lg px-3 py-1.5 text-xs border ${i === state.currentPlayerIndex ? 'border-primary text-gold' : 'border-border text-muted-foreground'}`}>
              {p.name}: {total} kort
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center mb-4 flex-wrap">
        {state.players.map((p, i) => {
          if (i === playerIndex) return null;

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

      {/* Message */}
      <AnimatePresence mode="wait">
        <motion.p key={state.message} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-muted-foreground mb-4">
          {state.message}
        </motion.p>
      </AnimatePresence>

      {/* Piles */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <div className="text-center">
          <button
            type="button"
            disabled={!isMyTurn || !canTryTalong}
            onClick={async () => {
              if (!isMyTurn || !canTryTalong) return;
              await applyAndSync(drawAndTryFromTalong(state));
              setSelectedCards([]);
            }}
            className={`w-14 h-20 rounded-lg bg-gradient-to-br from-primary/50 to-accent/50 border border-primary/20 flex items-center justify-center card-shadow ${
              isMyTurn && canTryTalong ? 'cursor-pointer hover:scale-105 transition-transform' : 'opacity-60 cursor-default'
            }`}
          >
            <span className="text-xs font-bold text-primary-foreground/40">{state.drawPile.length}</span>
          </button>
          <span className={`text-[10px] mt-1 block transition-colors ${isMyTurn && canTryTalong ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            Talong
          </span>
          <div className={`mx-auto mt-1 h-0.5 w-14 rounded-full transition-opacity ${isMyTurn && canTryTalong ? 'bg-emerald-400 opacity-100' : 'bg-transparent opacity-0'}`} />
        </div>
        <div className="text-center">
          {topDiscard ? <MiniCard card={topDiscard} /> : (
            <div className="w-14 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Tom</span>
            </div>
          )}
          <span className="text-[10px] text-white mt-1 block">Hög ({state.discardPile.length})</span>
        </div>
      </div>

      {/* My table cards */}
      {me && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 text-center uppercase tracking-wider">Bordskort</p>
          <div className="flex justify-center gap-3">
            {[0, 1, 2].map(i => {
              const topFaceUpCard = meFaceUpTopCards[i];
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
                  {renderTableStack(me.faceDown[i], me.faceUp[i], {
                    allowFaceDownPlay: isMyTurn && source === 'faceDown',
                    allowFaceUpSelection,
                    faceUpSelected: topFaceUpCard
                      ? (isSwapPhase ? swapSource?.id === topFaceUpCard.id : selectedCards.includes(topFaceUpCard.id))
                      : false,
                    onFaceDownClick: () => isMyTurn && source === 'faceDown' && me.faceDown[i] && toggleSelect(me.faceDown[i].id),
                    onFaceUpClick: () => {
                      if (!topFaceUpCard) return;
                      if (isSwapPhase) handleSwapClick('faceUp', topFaceUpCard.id);
                      else if (source === 'faceUp' && isMyTurn) toggleSelect(topFaceUpCard.id);
                    },
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My hand */}
      {me && (
        <div className="mt-auto">
          <p className="text-xs text-muted-foreground mb-2 text-center uppercase tracking-wider">
            <Hand size={12} className="inline mr-1" />Hand ({me.hand.length})
          </p>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {me.hand.map(card => (
              <MiniCard key={card.id} card={card}
                selected={isSwapPhase ? swapSource?.id === card.id : selectedCards.includes(card.id)}
                disabled={!isMyTurn || (!isSwapPhase && source !== 'hand')}
                onClick={() => {
                  if (isSwapPhase) handleSwapClick('hand', card.id);
                  else if (isMyTurn && source === 'hand') toggleSelect(card.id);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center mt-4">
        {isSwapPhase ? (
          <button onClick={handleConfirmSwap} className="px-6 py-3 rounded-xl bg-gold text-white font-semibold glow-gold">
            ✓ Klar med byten
          </button>
        ) : isMyTurn ? (
          <>
            {canPlay && (
              <button
                onClick={handlePlay}
                className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2"
              >
                <ArrowUp size={16} /> Spela
              </button>
            )}
            {canPickUpPile && (
              <button onClick={handlePickUp} className="px-5 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold">
                Ta upp högen
              </button>
            )}
            
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Väntar på {state.players[state.currentPlayerIndex]?.name}...</p>
        )}
      </div>
      </div>

      {showWinState && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-3xl font-bold text-gold mb-2">{winner?.name} vinner!</h2>
            <p className="text-muted-foreground mb-8">
              {state.winner === playerIndex ? 'Bra jobb förfään! 🎉' : 'Det sög ju..'}
            </p>
            <button onClick={onReset} className="px-6 py-3 rounded-xl bg-gold text-primary-foreground font-semibold glow-gold">
              Tillbaka till lobby
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OnlineGameBoard;
