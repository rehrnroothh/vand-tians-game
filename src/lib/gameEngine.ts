export interface Card {
  value: number; // 2-14 (11=J, 12=Q, 13=K, 14=A)
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  id: string;
}

export interface Player {
  name: string;
  hand: Card[];
  faceUp: Card[];   // 3 face-up cards on table
  faceDown: Card[]; // 3 face-down cards on table
}

export interface GameState {
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  phase: 'swap' | 'play' | 'finished';
  swapConfirmed: boolean[]; // track which players confirmed swaps
  winner: number | null;
  message: string;
  lastPlayedCards: Card[];
}

export const suitSymbols: Record<Card['suit'], string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const isRedSuit = (suit: Card['suit']) =>
  suit === 'hearts' || suit === 'diamonds';

export const cardLabel = (value: number): string => {
  switch (value) {
    case 14: return 'A';
    case 13: return 'K';
    case 12: return 'Q';
    case 11: return 'J';
    default: return String(value);
  }
};

export const cardSortValue = (card: Card): number => card.value;

const createDeck = (): Card[] => {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];
  let id = 0;
  for (const suit of suits) {
    for (let value = 2; value <= 14; value++) {
      deck.push({ value, suit, id: `card-${id++}` });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const dealGame = (playerNames: string[]): GameState => {
  const deck = createDeck();
  const players: Player[] = playerNames.map((name) => ({
    name,
    hand: [],
    faceUp: [],
    faceDown: [],
  }));

  // Deal 3 face-down per player
  for (let i = 0; i < 3; i++) {
    for (const p of players) {
      p.faceDown.push(deck.pop()!);
    }
  }
  // Deal 3 face-up per player
  for (let i = 0; i < 3; i++) {
    for (const p of players) {
      p.faceUp.push(deck.pop()!);
    }
  }
  // Deal 3 hand cards per player
  for (let i = 0; i < 3; i++) {
    for (const p of players) {
      p.hand.push(deck.pop()!);
    }
  }

  // Sort hands
  for (const p of players) {
    p.hand.sort((a, b) => a.value - b.value);
  }

  return {
    players,
    drawPile: deck,
    discardPile: [],
    currentPlayerIndex: 0,
    phase: 'swap',
    swapConfirmed: playerNames.map(() => false),
    winner: null,
    message: `${playerNames[0]}: Byt kort mellan hand och uppvända kort, eller bekräfta.`,
    lastPlayedCards: [],
  };
};

// Get the effective top value of the discard pile (skipping 2s on top)
export const getTopValue = (discardPile: Card[]): number | null => {
  if (discardPile.length === 0) return null;
  // The top card's value matters
  return discardPile[discardPile.length - 1].value;
};

// Check if a card can be played on the discard pile
export const canPlayCard = (card: Card, discardPile: Card[]): boolean => {
  // 2 can always be played
  if (card.value === 2) return true;
  // 10 can always be played
  if (card.value === 10) return true;
  
  const topVal = getTopValue(discardPile);
  if (topVal === null) return true; // empty pile
  // If top is a 2, anything can be played on it
  if (topVal === 2) return true;
  
  return card.value >= topVal;
};

// Check if 4 of the same value are on top of the discard pile
const checkFourOfAKind = (pile: Card[]): boolean => {
  if (pile.length < 4) return false;
  const topVal = pile[pile.length - 1].value;
  return (
    pile[pile.length - 2].value === topVal &&
    pile[pile.length - 3].value === topVal &&
    pile[pile.length - 4].value === topVal
  );
};

// Draw cards from the draw pile to maintain minimum hand size
const refillHand = (player: Player, drawPile: Card[]): void => {
  while (player.hand.length < 3 && drawPile.length > 0) {
    player.hand.push(drawPile.pop()!);
  }
  player.hand.sort((a, b) => a.value - b.value);
};

// Get available cards for the current player
export const getPlayableCards = (player: Player, discardPile: Card[]): Card[] => {
  if (player.hand.length > 0) {
    return player.hand;
  }
  if (player.faceUp.length > 0) {
    return player.faceUp;
  }
  return player.faceDown; // blind play
};

export const getPlaySource = (player: Player): 'hand' | 'faceUp' | 'faceDown' => {
  if (player.hand.length > 0) return 'hand';
  if (player.faceUp.length > 0) return 'faceUp';
  return 'faceDown';
};

// Check if a player has won
const hasWon = (player: Player): boolean => {
  return player.hand.length === 0 && player.faceUp.length === 0 && player.faceDown.length === 0;
};

// Advance to next player who hasn't won
const nextPlayer = (state: GameState): number => {
  let next = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;
  while (hasWon(state.players[next]) && attempts < state.players.length) {
    next = (next + 1) % state.players.length;
    attempts++;
  }
  return next;
};

// Swap a hand card with a face-up card during swap phase
export const swapCards = (
  state: GameState,
  playerIndex: number,
  handCardId: string,
  faceUpCardId: string
): GameState => {
  const newState = structuredClone(state);
  const player = newState.players[playerIndex];
  
  const handIdx = player.hand.findIndex(c => c.id === handCardId);
  const faceUpIdx = player.faceUp.findIndex(c => c.id === faceUpCardId);
  
  if (handIdx === -1 || faceUpIdx === -1) return state;
  
  [player.hand[handIdx], player.faceUp[faceUpIdx]] = [player.faceUp[faceUpIdx], player.hand[handIdx]];
  player.hand.sort((a, b) => a.value - b.value);
  
  return newState;
};

export const confirmSwap = (state: GameState, playerIndex: number): GameState => {
  const newState = structuredClone(state);
  newState.swapConfirmed[playerIndex] = true;
  
  // Check if all confirmed
  if (newState.swapConfirmed.every(Boolean)) {
    newState.phase = 'play';
    newState.message = `${newState.players[0].name}s tur — spela ett kort!`;
  } else {
    // Move to next unconfirmed player
    let next = (playerIndex + 1) % newState.players.length;
    while (newState.swapConfirmed[next]) {
      next = (next + 1) % newState.players.length;
    }
    newState.currentPlayerIndex = next;
    newState.message = `${newState.players[next].name}: Byt kort eller bekräfta.`;
  }
  
  return newState;
};

// Play selected cards
export const playCards = (
  state: GameState,
  cardIds: string[]
): GameState => {
  if (cardIds.length === 0) return state;
  
  const newState = structuredClone(state);
  const player = newState.players[newState.currentPlayerIndex];
  const source = getPlaySource(player);
  
  let cards: Card[];
  
  if (source === 'faceDown') {
    // Blind play - only one card at a time
    const idx = player.faceDown.findIndex(c => c.id === cardIds[0]);
    if (idx === -1) return state;
    const card = player.faceDown.splice(idx, 1)[0];
    
    // Check if the blind card can be played
    if (!canPlayCard(card, newState.discardPile)) {
      // Must pick up pile + the card
      player.hand = [...newState.discardPile, card];
      player.hand.sort((a, b) => a.value - b.value);
      newState.discardPile = [];
      newState.lastPlayedCards = [];
      newState.currentPlayerIndex = nextPlayer(newState);
      newState.message = `${player.name} vände ett ${cardLabel(card.value)} — fick ta upp högen! ${newState.players[newState.currentPlayerIndex].name}s tur.`;
      return newState;
    }
    
    cards = [card];
  } else {
    const sourceArr = source === 'hand' ? player.hand : player.faceUp;
    cards = cardIds.map(id => sourceArr.find(c => c.id === id)!).filter(Boolean);
    
    // Validate: all same value
    if (!cards.every(c => c.value === cards[0].value)) return state;
    // Validate: can play
    if (!canPlayCard(cards[0], newState.discardPile)) return state;
    
    // Remove from source
    for (const card of cards) {
      const idx = (source === 'hand' ? player.hand : player.faceUp).findIndex(c => c.id === card.id);
      if (idx !== -1) (source === 'hand' ? player.hand : player.faceUp).splice(idx, 1);
    }
  }
  
  // Add to discard pile
  newState.discardPile.push(...cards);
  newState.lastPlayedCards = cards;
  
  // Check for 10 or four-of-a-kind → clear pile
  const isTen = cards[0].value === 10;
  const isFour = checkFourOfAKind(newState.discardPile);
  
  if (isTen || isFour) {
    newState.discardPile = [];
    // Refill hand
    if (source === 'hand') {
      refillHand(player, newState.drawPile);
    }
    
    // Check win
    if (hasWon(player)) {
      newState.winner = newState.currentPlayerIndex;
      newState.phase = 'finished';
      newState.message = `🎉 ${player.name} vinner!`;
      return newState;
    }
    
    // Same player goes again after clearing
    newState.message = `${isTen ? '🔥 Tia!' : '💥 Fyra lika!'} Högen rensad! ${player.name} spelar igen.`;
    return newState;
  }
  
  // Refill hand from draw pile
  if (source === 'hand') {
    refillHand(player, newState.drawPile);
  }
  
  // Check win
  if (hasWon(player)) {
    newState.winner = newState.currentPlayerIndex;
    newState.phase = 'finished';
    newState.message = `🎉 ${player.name} vinner!`;
    return newState;
  }
  
  // Next player
  newState.currentPlayerIndex = nextPlayer(newState);
  newState.message = `${newState.players[newState.currentPlayerIndex].name}s tur.`;
  
  return newState;
};

// Pick up the entire discard pile
export const pickUpPile = (state: GameState): GameState => {
  const newState = structuredClone(state);
  const player = newState.players[newState.currentPlayerIndex];
  
  player.hand = [...player.hand, ...newState.discardPile];
  player.hand.sort((a, b) => a.value - b.value);
  newState.discardPile = [];
  newState.lastPlayedCards = [];
  
  newState.currentPlayerIndex = nextPlayer(newState);
  newState.message = `${player.name} tog upp högen. ${newState.players[newState.currentPlayerIndex].name}s tur.`;
  
  return newState;
};
