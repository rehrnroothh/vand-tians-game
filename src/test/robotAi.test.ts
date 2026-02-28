import { describe, expect, it } from 'vitest';
import type { Card, GameState } from '@/lib/gameEngine';
import { chooseRobotPlayDecision, chooseRobotSwapDecision } from '@/lib/robotAi';

const card = (id: string, value: number): Card => ({ id, value, suit: 'spades' });

const createState = (overrides?: Partial<GameState>): GameState => ({
  players: [
    {
      name: 'Örjan',
      hand: [card('h-3', 3), card('h-2', 2), card('h-10', 10)],
      faceUp: [[card('u-5', 5)], [card('u-7', 7)], [card('u-8', 8)]],
      faceDown: [card('d-9', 9)],
    },
    {
      name: 'You',
      hand: [card('p-4', 4)],
      faceUp: [[], [], []],
      faceDown: [],
    },
  ],
  drawPile: [card('draw-11', 11)],
  discardPile: [card('top-6', 6)],
  currentPlayerIndex: 0,
  phase: 'play',
  swapConfirmed: [true, true],
  winner: null,
  message: '',
  lastPlayedCards: [],
  mustCoverTwo: false,
  mustCoverTwoPlayerIndex: null,
  ...overrides,
});

describe('chooseRobotSwapDecision', () => {
  it('promotes power cards (2 and 10) to face-up before confirming', () => {
    const state = createState({ phase: 'swap', swapConfirmed: [false, false] });
    const decision = chooseRobotSwapDecision(state, 0);

    expect(decision.type).toBe('swap');
    if (decision.type === 'swap') {
      expect(['h-2', 'h-10']).toContain(decision.handCardId);
    }
  });
});

describe('chooseRobotPlayDecision', () => {
  it('prefers clearing with a 10 when possible', () => {
    const state = createState({
      players: [
        {
          name: 'Robot',
          hand: [card('h-7', 7), card('h-10', 10)],
          faceUp: [[], [], []],
          faceDown: [],
        },
        createState().players[1],
      ],
    });

    const decision = chooseRobotPlayDecision(state, 0);
    expect(decision).toEqual({ type: 'play', cardIds: ['h-10'] });
  });

  it('draws from talong when no playable cards exist', () => {
    const state = createState({
      players: [
        {
          name: 'Robot',
          hand: [card('h-3', 3), card('h-4', 4)],
          faceUp: [[], [], []],
          faceDown: [],
        },
        createState().players[1],
      ],
      discardPile: [card('top-k', 13)],
      drawPile: [card('draw-a', 14)],
    });

    const decision = chooseRobotPlayDecision(state, 0);
    expect(decision.type).toBe('drawAndTry');
  });
});
