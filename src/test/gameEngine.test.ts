import { describe, expect, it } from 'vitest';
import { playCards, swapCards, type Card, type GameState } from '@/lib/gameEngine';

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
      faceUp: [[], [], []],
      faceDown: [],
    },
    {
      name: 'Bob',
      hand: [card('bob-8', 8)],
      faceUp: [[], [], []],
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
          faceUp: [[], [], []],
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
          faceUp: [[], [], []],
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

  it('keeps the turn when the last hand card matches a face-up table card', () => {
    const stateWithMatchingTableCard: GameState = {
      ...createState(),
      players: [
        {
          name: 'Alice',
          hand: [card('last-seven', 7)],
          faceUp: [[card('table-seven', 7)], [], []],
          faceDown: [card('hidden', 9)],
        },
        createState().players[1],
      ],
    };

    const afterPlay = playCards(stateWithMatchingTableCard, ['last-seven']);

    expect(afterPlay.currentPlayerIndex).toBe(0);
    expect(afterPlay.players[0].hand).toHaveLength(0);
    expect(afterPlay.players[0].faceUp[0].map((currentCard) => currentCard.id)).toContain('table-seven');
    expect(afterPlay.message).toContain('matchande uppvänt bordskort');
  });

  it('passes the turn when the last hand card does not match a face-up table card', () => {
    const stateWithoutMatchingTableCard: GameState = {
      ...createState(),
      players: [
        {
          name: 'Alice',
          hand: [card('last-seven', 7)],
          faceUp: [[card('table-nine', 9)], [], []],
          faceDown: [card('hidden', 8)],
        },
        createState().players[1],
      ],
    };

    const afterPlay = playCards(stateWithoutMatchingTableCard, ['last-seven']);

    expect(afterPlay.currentPlayerIndex).toBe(1);
    expect(afterPlay.message).toBe('Bobs tur.');
  });
});

describe('swapCards', () => {
  it('stacks matching cards on the same face-up table slot during setup', () => {
    const state: GameState = {
      ...createState(),
      phase: 'swap',
      players: [
        {
          name: 'Alice',
          hand: [card('hand-seven', 7), card('other', 9)],
          faceUp: [[card('table-seven', 7)], [card('table-three', 3)], []],
          faceDown: [card('down-1', 4), card('down-2', 5), card('down-3', 6)],
        },
        createState().players[1],
      ],
    };

    const afterSwap = swapCards(state, 0, 'hand-seven', 'table-seven');

    expect(afterSwap.players[0].hand.map((currentCard) => currentCard.id)).toEqual(['other']);
    expect(afterSwap.players[0].faceUp[0].map((currentCard) => currentCard.id)).toEqual(['table-seven', 'hand-seven']);
  });
});
