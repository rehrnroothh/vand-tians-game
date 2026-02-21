import { describe, expect, it } from 'vitest';
import { playCards, type Card, type GameState } from '@/lib/gameEngine';

const card = (id: string, value: number): Card => ({
  id,
  value,
  suit: 'hearts',
});

const createState = (): GameState => ({
  players: [
    {
      name: 'Alice',
      hand: [card('two-1', 2), card('two-2', 2), card('seven', 7)],
      faceUp: [],
      faceDown: [],
    },
    {
      name: 'Bob',
      hand: [card('bob-8', 8)],
      faceUp: [],
      faceDown: [],
    },
  ],
  drawPile: [],
  discardPile: [card('start', 5)],
  currentPlayerIndex: 0,
  phase: 'play',
  swapConfirmed: [true, true],
  winner: null,
  message: '',
  lastPlayedCards: [],
  mustCoverTwo: false,
  mustCoverTwoPlayerIndex: null,
});

describe('playCards - twos chain', () => {
  it('keeps requiring follow-up after a second 2', () => {
    const afterFirstTwo = playCards(createState(), ['two-1']);
    expect(afterFirstTwo.mustCoverTwo).toBe(true);

    const afterSecondTwo = playCards(afterFirstTwo, ['two-2']);

    expect(afterSecondTwo.mustCoverTwo).toBe(true);
    expect(afterSecondTwo.mustCoverTwoPlayerIndex).toBe(0);
    expect(afterSecondTwo.currentPlayerIndex).toBe(0);
  });

  it('allows any card to be played after consecutive 2s', () => {
    const afterFirstTwo = playCards(createState(), ['two-1']);
    const afterSecondTwo = playCards(afterFirstTwo, ['two-2']);
    const afterSeven = playCards(afterSecondTwo, ['seven']);

    expect(afterSeven.discardPile.at(-1)?.value).toBe(7);
    expect(afterSeven.mustCoverTwo).toBe(false);
    expect(afterSeven.phase).toBe('finished');
    expect(afterSeven.winner).toBe(0);
  });
});
