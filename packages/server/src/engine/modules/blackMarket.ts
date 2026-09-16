import { Card, ContrabandType } from '@sheriff/shared';

export interface BlackMarketCard {
  id: string;
  name: string;
  contrabandType: ContrabandType;
  requiredCount: number; // 3
  pointsValue: number; // endgame points
}

export interface BlackMarketState {
  pepperPile: BlackMarketCard[];
  meadPile: BlackMarketCard[];
  silkPile: BlackMarketCard[];
  claimedThisRoundPlayerIds: Set<string>;
}

export interface BlackMarketConfig {
  enableBlackMarket: boolean;
}

export const INITIAL_BLACK_MARKET_CARDS: Record<ContrabandType, BlackMarketCard[]> = {
  PEPPER: [
    { id: 'bm_pepper_high', name: 'Black Market Pepper (High)', contrabandType: 'PEPPER', requiredCount: 3, pointsValue: 14 },
    { id: 'bm_pepper_low', name: 'Black Market Pepper (Low)', contrabandType: 'PEPPER', requiredCount: 3, pointsValue: 10 },
  ],
  MEAD: [
    { id: 'bm_mead_high', name: 'Black Market Mead (High)', contrabandType: 'MEAD', requiredCount: 3, pointsValue: 16 },
    { id: 'bm_mead_low', name: 'Black Market Mead (Low)', contrabandType: 'MEAD', requiredCount: 3, pointsValue: 12 },
  ],
  SILK: [
    { id: 'bm_silk_high', name: 'Black Market Silk (High)', contrabandType: 'SILK', requiredCount: 3, pointsValue: 18 },
    { id: 'bm_silk_low', name: 'Black Market Silk (Low)', contrabandType: 'SILK', requiredCount: 3, pointsValue: 14 },
  ],
  CROSSBOW: [], // Rulebook does not include crossbow black market orders
};

/**
 * Checks if Black Market expansion is active.
 */
export function isBlackMarketEnabled(config?: BlackMarketConfig): boolean {
  return config?.enableBlackMarket === true;
}

/**
 * Initializes Black Market piles: 3 piles with 2 cards each, higher value on top.
 */
export function initBlackMarketState(): BlackMarketState {
  return {
    pepperPile: [...INITIAL_BLACK_MARKET_CARDS.PEPPER],
    meadPile: [...INITIAL_BLACK_MARKET_CARDS.MEAD],
    silkPile: [...INITIAL_BLACK_MARKET_CARDS.SILK],
    claimedThisRoundPlayerIds: new Set<string>(),
  };
}

/**
 * Gets the active pile for a given contraband type.
 */
function getPile(state: BlackMarketState, type: ContrabandType): BlackMarketCard[] {
  switch (type) {
    case 'PEPPER':
      return state.pepperPile;
    case 'MEAD':
      return state.meadPile;
    case 'SILK':
      return state.silkPile;
    default:
      return [];
  }
}

/**
 * Checks if a player can claim a Black Market card.
 */
export function canClaimBlackMarketOrder(
  state: Readonly<BlackMarketState>,
  playerId: string,
  contrabandType: ContrabandType,
  standContraband: readonly Card[]
): { canClaim: boolean; reason?: string; topCard?: BlackMarketCard } {
  if (state.claimedThisRoundPlayerIds.has(playerId)) {
    return { canClaim: false, reason: 'Player has already claimed a Black Market order this round' };
  }

  const pile = getPile(state as BlackMarketState, contrabandType);
  if (pile.length === 0) {
    return { canClaim: false, reason: `No Black Market orders remaining for ${contrabandType}` };
  }

  const matchingCards = standContraband.filter((c) => c.contrabandType === contrabandType);
  if (matchingCards.length < 3) {
    return {
      canClaim: false,
      reason: `Requires 3 ${contrabandType} in stand, but player only has ${matchingCards.length}`,
    };
  }

  return { canClaim: true, topCard: pile[0] };
}

/**
 * Claims a Black Market card by discarding 3 matching contraband from stand.
 */
export function claimBlackMarketOrder(
  state: Readonly<BlackMarketState>,
  playerId: string,
  contrabandType: ContrabandType,
  standContraband: readonly Card[]
): {
  nextState: BlackMarketState;
  claimedCard: BlackMarketCard;
  updatedStandContraband: Card[];
  discardedCards: Card[];
} {
  const check = canClaimBlackMarketOrder(state, playerId, contrabandType, standContraband);
  if (!check.canClaim || !check.topCard) {
    throw new Error(check.reason);
  }

  // Remove 3 matching contraband from stand
  const discardedCards: Card[] = [];
  const updatedStandContraband: Card[] = [];
  let neededToDiscard = 3;

  for (const card of standContraband) {
    if (card.contrabandType === contrabandType && neededToDiscard > 0) {
      discardedCards.push(card);
      neededToDiscard--;
    } else {
      updatedStandContraband.push(card);
    }
  }

  // Update pile
  const nextPepper = [...state.pepperPile];
  const nextMead = [...state.meadPile];
  const nextSilk = [...state.silkPile];

  let claimedCard: BlackMarketCard;
  if (contrabandType === 'PEPPER') {
    claimedCard = nextPepper.shift()!;
  } else if (contrabandType === 'MEAD') {
    claimedCard = nextMead.shift()!;
  } else {
    claimedCard = nextSilk.shift()!;
  }

  const nextClaimedSet = new Set(state.claimedThisRoundPlayerIds);
  nextClaimedSet.add(playerId);

  const nextState: BlackMarketState = {
    pepperPile: nextPepper,
    meadPile: nextMead,
    silkPile: nextSilk,
    claimedThisRoundPlayerIds: nextClaimedSet,
  };

  return {
    nextState,
    claimedCard,
    updatedStandContraband,
    discardedCards,
  };
}

/**
 * Resets per-round claims at the beginning of a new round.
 */
export function resetRoundBlackMarketClaims(state: Readonly<BlackMarketState>): BlackMarketState {
  return {
    ...state,
    claimedThisRoundPlayerIds: new Set<string>(),
  };
}
