import { Card } from '@sheriff/shared';
import { shuffleDeck } from '../deck';

export interface BootyTile {
  gold: number;
  goods: Card[];
}

export interface DeputiesState {
  playerIds: string[];
  deputyDeck: string[];
  activeDeputies: [string, string] | null;
  deckDepletions: number;
  bootyTile: BootyTile;
}

export interface DeputiesConfig {
  enableDeputies: boolean;
  playerCount: number;
}

/**
 * Checks if 6th player Deputies module is active.
 */
export function isDeputiesEnabled(config?: DeputiesConfig): boolean {
  return config?.enableDeputies === true && config.playerCount === 6;
}

/**
 * Initializes the Deputies module for a 6-player game.
 */
export function initDeputiesState(
  playerIds: readonly string[],
  rng: () => number = Math.random
): DeputiesState {
  if (playerIds.length !== 6) {
    throw new Error(`Deputies module requires exactly 6 players (got ${playerIds.length})`);
  }

  return {
    playerIds: [...playerIds],
    deputyDeck: shuffleDeck(playerIds, rng),
    activeDeputies: null,
    deckDepletions: 0,
    bootyTile: { gold: 0, goods: [] },
  };
}

/**
 * Draws 2 deputies from the deputy deck for the round.
 * Reshuffles after every 3 rounds (6 cards).
 * Returns isGameOver: true when deputy deck has run out for the 3rd time (9 rounds).
 */
export function drawDeputiesForRound(
  state: Readonly<DeputiesState>,
  rng: () => number = Math.random
): { nextState: DeputiesState; deputies: [string, string]; isGameOver: boolean } {
  let deck = [...state.deputyDeck];
  let depletions = state.deckDepletions;

  if (deck.length < 2) {
    // Deck depleted, reshuffle full 6 cards
    deck = shuffleDeck(state.playerIds, rng);
    depletions += 1;
  }

  const deputy1 = deck.shift()!;
  const deputy2 = deck.shift()!;

  if (deck.length === 0) {
    depletions += 1;
  }

  const isGameOver = depletions >= 3 && deck.length === 0;

  const nextState: DeputiesState = {
    ...state,
    deputyDeck: deck,
    activeDeputies: [deputy1, deputy2],
    deckDepletions: depletions,
    bootyTile: { gold: 0, goods: [] }, // Cleared at start of each round
  };

  return {
    nextState,
    deputies: [deputy1, deputy2],
    isGameOver,
  };
}

/**
 * Outcome 1: Both deputies agree to let merchant pass.
 * Bribe gold and goods go onto Booty Tile.
 */
export function resolveJointPass(
  booty: Readonly<BootyTile>,
  bribeGold: number,
  bribeGoods: readonly Card[] = []
): BootyTile {
  return {
    gold: booty.gold + bribeGold,
    goods: [...booty.goods, ...bribeGoods],
  };
}

/**
 * Outcome 2: Both deputies agree to inspect bag.
 * - Honest merchant: Each deputy pays half penalty from own gold.
 * - Dishonest merchant: Confiscation fine placed onto Booty Tile.
 */
export function resolveJointInspect(
  booty: Readonly<BootyTile>,
  isHonest: boolean,
  totalPenalty: number
): {
  updatedBooty: BootyTile;
  deputy1PenaltyOwed: number;
  deputy2PenaltyOwed: number;
} {
  if (isHonest) {
    // Each deputy pays half of penalty from their own gold
    const half = Math.floor(totalPenalty / 2);
    const remainder = totalPenalty % 2;
    return {
      updatedBooty: { ...booty },
      deputy1PenaltyOwed: half + remainder,
      deputy2PenaltyOwed: half,
    };
  }

  // Dishonest: Fines paid by merchant are placed on Booty Tile
  return {
    updatedBooty: {
      ...booty,
      gold: booty.gold + totalPenalty,
    },
    deputy1PenaltyOwed: 0,
    deputy2PenaltyOwed: 0,
  };
}

/**
 * Outcome 3: Solo deputy inspects bag or settles bribe alone.
 * Deputy pays or receives penalty alone; Booty Tile is untouched.
 */
export function resolveSoloInspect(
  deputyId: string,
  isHonest: boolean,
  totalPenalty: number
): {
  deputyPenaltyOwed: number;
  deputyRewardEarned: number;
} {
  if (isHonest) {
    return {
      deputyPenaltyOwed: totalPenalty,
      deputyRewardEarned: 0,
    };
  }

  return {
    deputyPenaltyOwed: 0,
    deputyRewardEarned: totalPenalty,
  };
}

/**
 * At round end, the 2 deputies evenly split all gold and goods from Booty Tile.
 * Leftovers (e.g. odd gold coin) are discarded.
 */
export function distributeBootyTile(
  booty: Readonly<BootyTile>
): {
  deputy1Gold: number;
  deputy2Gold: number;
  deputy1Goods: Card[];
  deputy2Goods: Card[];
  discardedGold: number;
  discardedGoods: Card[];
} {
  const goldPerDeputy = Math.floor(booty.gold / 2);
  const discardedGold = booty.gold % 2;

  const halfGoods = Math.floor(booty.goods.length / 2);
  const deputy1Goods = booty.goods.slice(0, halfGoods);
  const deputy2Goods = booty.goods.slice(halfGoods, halfGoods * 2);
  const discardedGoods = booty.goods.slice(halfGoods * 2);

  return {
    deputy1Gold: goldPerDeputy,
    deputy2Gold: goldPerDeputy,
    deputy1Goods,
    deputy2Goods,
    discardedGold,
    discardedGoods,
  };
}
