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

  it('refills from the talong before the forced follow-up after playing a 2', () => {
    const stateWithDraw: GameState = {
      ...createState(),
      players: [
        {
          name: 'Alice',
          hand: [card('two', 2), card('seven', 7), card('eight', 8)],
          faceUp: [],
          faceDown: [],
        },
        createState().players[1],
      ],
      drawPile: [card('draw-9', 9)],
    };

    const afterTwo = playCards(stateWithDraw, ['two']);

    expect(afterTwo.mustCoverTwo).toBe(true);
    expect(afterTwo.players[0].hand).toHaveLength(3);
    expect(afterTwo.players[0].hand.map((currentCard) => currentCard.id)).toContain('draw-9');
    expect(afterTwo.drawPile).toHaveLength(0);
  });

  it('does not finish the game if a played 2 is replaced from the talong', () => {
    const stateWithReplacement: GameState = {
      ...createState(),
      players: [
        {
          name: 'Alice',
          hand: [card('last-two', 2)],
          faceUp: [],
          faceDown: [],
        },
        createState().players[1],
      ],
      drawPile: [card('draw-6', 6)],
    };

    const afterTwo = playCards(stateWithReplacement, ['last-two']);

    expect(afterTwo.phase).toBe('play');
    expect(afterTwo.winner).toBeNull();
    expect(afterTwo.mustCoverTwo).toBe(true);
    expect(afterTwo.players[0].hand.map((currentCard) => currentCard.id)).toEqual(['draw-6']);
  });
});
