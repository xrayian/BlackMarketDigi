import { GoodType } from './types';

export const STARTING_GOLD = 50;
export const DEFAULT_HAND_SIZE = 6;
export const MIN_BAG_CARDS = 1;
export const MAX_BAG_CARDS = 5;
export const LEGAL_GOODS: GoodType[] = ['APPLE', 'CHEESE', 'BREAD', 'CHICKEN'];
export const SHERIFF_ROUNDS_BY_PLAYER_COUNT: Record<number, number> = { 3: 3, 4: 2, 5: 2 };
export const INSPECTION_HOLD_DURATION_MS = 1200;
export const BRIBE_REACTION_BUFFER_MS = 1500;

export const KING_QUEEN_BONUSES: Record<GoodType, { king: number; queen: number }> = {
  APPLE: { king: 20, queen: 10 },
  CHEESE: { king: 15, queen: 10 },
  BREAD: { king: 15, queen: 10 },
  CHICKEN: { king: 10, queen: 5 },
};
