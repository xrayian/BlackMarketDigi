import { Card } from '@sheriff/shared';
import { drawCards } from '../deck';

export interface MarketPhaseState {
  sheriffId: string;
  merchantOrder: string[];
  currentMerchantIndex: number;
  completedMerchantIds: string[];
  setAsideCards: Card[];
  maxHandSize: number;
}

export interface InitMarketOptions {
  tableSeats: string[]; // Order of players seated at the table
  sheriffId: string;
  deputyIds?: string[];
  startingMerchantId?: string;
  maxHandSize?: number;
}

export interface ExchangeMarketParams {
  state: MarketPhaseState;
  playerId: string;
  cardIdsToDiscard: string[];
  hand: readonly Card[];
  drawPile: readonly Card[];
  discardPile: readonly Card[];
  rng?: () => number;
}

export interface ExchangeMarketResult {
  nextState: MarketPhaseState;
  newHand: Card[];
  newDrawPile: Card[];
  newDiscardPile: Card[];
  discardedCards: Card[];
  drawnCards: Card[];
  isMarketComplete: boolean;
}

/**
 * Calculates clockwise merchant turn order starting from designated merchant, skipping Sheriff and Deputies.
 */
export function calculateMerchantOrder(
  tableSeats: readonly string[],
  sheriffId: string,
  startingMerchantId?: string,
  deputyIds?: readonly string[]
): string[] {
  const authorities = deputyIds && deputyIds.length > 0 ? deputyIds : [sheriffId];
  const primaryAuthority = sheriffId || (deputyIds ? deputyIds[0] : '');
  const authorityIndex = tableSeats.indexOf(primaryAuthority);
  if (authorityIndex === -1) {
    throw new Error(`Sheriff or Deputy ${primaryAuthority} is not in table seats`);
  }

  const merchants = tableSeats.filter((id) => !authorities.includes(id));
  if (merchants.length === 0) {
    throw new Error('No merchants available for market phase');
  }

  let startId = startingMerchantId;
  if (!startId || authorities.includes(startId) || !merchants.includes(startId)) {
    // Default to the first merchant clockwise from primary authority
    for (let i = 1; i <= tableSeats.length; i++) {
      const candidate = tableSeats[(authorityIndex + i) % tableSeats.length];
      if (!authorities.includes(candidate)) {
        startId = candidate;
        break;
      }
    }
  }

  const startIndex = tableSeats.indexOf(startId!);
  const ordered: string[] = [];

  for (let i = 0; i < tableSeats.length; i++) {
    const candidate = tableSeats[(startIndex + i) % tableSeats.length];
    if (!authorities.includes(candidate) && !ordered.includes(candidate)) {
      ordered.push(candidate);
    }
  }

  return ordered;
}

/**
 * Initializes the Market Phase.
 */
export function initMarketPhase(options: InitMarketOptions): MarketPhaseState {
  const { tableSeats, sheriffId, deputyIds, startingMerchantId, maxHandSize = 6 } = options;
  const merchantOrder = calculateMerchantOrder(tableSeats, sheriffId, startingMerchantId, deputyIds);

  return {
    sheriffId,
    merchantOrder,
    currentMerchantIndex: 0,
    completedMerchantIds: [],
    setAsideCards: [],
    maxHandSize,
  };
}

/**
 * Returns current merchant whose turn it is to discard/redraw, or null if phase is done.
 */
export function getCurrentMarketMerchant(state: MarketPhaseState): string | null {
  if (state.currentMerchantIndex >= state.merchantOrder.length) {
    return null;
  }
  return state.merchantOrder[state.currentMerchantIndex];
}

/**
 * Executes a merchant's discard-and-redraw turn.
 */
export function exchangeMarketCards(params: ExchangeMarketParams): ExchangeMarketResult {
  const { state, playerId, cardIdsToDiscard, hand, drawPile, discardPile, rng } = params;

  const currentMerchant = getCurrentMarketMerchant(state);
  if (!currentMerchant) {
    throw new Error('Market phase is already complete');
  }
  if (playerId !== currentMerchant) {
    throw new Error(`It is not player ${playerId}'s turn (active merchant: ${currentMerchant})`);
  }
  if (playerId === state.sheriffId) {
    throw new Error('Sheriff cannot participate in the market phase');
  }

  if (cardIdsToDiscard.length > 5) {
    throw new Error('Cannot set aside more than 5 cards in market phase');
  }

  // Verify unique discard IDs
  const uniqueDiscardIds = new Set(cardIdsToDiscard);
  if (uniqueDiscardIds.size !== cardIdsToDiscard.length) {
    throw new Error('Duplicate card IDs provided in discard list');
  }

  // Find discarded cards and retained cards
  const discardedCards: Card[] = [];
  const retainedCards: Card[] = [];

  for (const card of hand) {
    if (uniqueDiscardIds.has(card.id)) {
      discardedCards.push(card);
    } else {
      retainedCards.push(card);
    }
  }

  if (discardedCards.length !== cardIdsToDiscard.length) {
    throw new Error('One or more discarded card IDs were not found in player hand');
  }

  // Calculate cards needed to refill hand to maxHandSize
  const cardsNeeded = Math.max(0, state.maxHandSize - retainedCards.length);
  const { drawn: drawnCards, drawPile: newDrawPile, discardPile: newDiscardPile } = drawCards(
    drawPile,
    discardPile,
    cardsNeeded,
    rng
  );

  const newHand = [...retainedCards, ...drawnCards];
  const newSetAside = [...state.setAsideCards, ...discardedCards];
  const newCompleted = [...state.completedMerchantIds, playerId];
  const nextIndex = state.currentMerchantIndex + 1;
  const isMarketComplete = nextIndex >= state.merchantOrder.length;

  const nextState: MarketPhaseState = {
    ...state,
    currentMerchantIndex: nextIndex,
    completedMerchantIds: newCompleted,
    setAsideCards: newSetAside,
  };

  return {
    nextState,
    newHand,
    newDrawPile,
    newDiscardPile,
    discardedCards,
    drawnCards,
    isMarketComplete,
  };
}

/**
 * Concludes the Market phase by gathering all set-aside cards into the faceup discard pile.
 */
export function finalizeMarketPhase(
  state: MarketPhaseState,
  discardPile: readonly Card[]
): { finalDiscardPile: Card[] } {
  return {
    finalDiscardPile: [...discardPile, ...state.setAsideCards],
  };
}
