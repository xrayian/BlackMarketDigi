import { Card, MIN_BAG_CARDS, MAX_BAG_CARDS, SealedBag } from '@sheriff/shared';

export interface LoadBagParams {
  playerId: string;
  hand: readonly Card[];
  cardIdsToLoad: readonly string[];
}

export interface LoadAndSnapResult {
  sealedBag: SealedBag;
  remainingHand: Card[];
}

/**
 * Validates card selection for loading into a merchant bag.
 */
export function validateBagCards(
  cardIdsToLoad: readonly string[],
  hand: readonly Card[]
): { valid: boolean; error?: string } {
  if (!cardIdsToLoad || cardIdsToLoad.length < MIN_BAG_CARDS || cardIdsToLoad.length > MAX_BAG_CARDS) {
    return {
      valid: false,
      error: `A bag must contain between ${MIN_BAG_CARDS} and ${MAX_BAG_CARDS} cards (received ${cardIdsToLoad?.length ?? 0})`,
    };
  }

  const uniqueIds = new Set(cardIdsToLoad);
  if (uniqueIds.size !== cardIdsToLoad.length) {
    return {
      valid: false,
      error: 'Cannot place duplicate card IDs into bag',
    };
  }

  const handCardIds = new Set(hand.map((c) => c.id));
  for (const id of cardIdsToLoad) {
    if (!handCardIds.has(id)) {
      return {
        valid: false,
        error: `Card ${id} is not present in player hand`,
      };
    }
  }

  return { valid: true };
}

/**
 * Loads selected cards from hand into merchant bag and immediately seals (snaps) it.
 * Once snapped, bag contents are immutable for the round.
 */
export function loadAndSnapBag(params: LoadBagParams): LoadAndSnapResult {
  const { playerId, hand, cardIdsToLoad } = params;

  const validation = validateBagCards(cardIdsToLoad, hand);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const bagIdSet = new Set(cardIdsToLoad);
  const bagCards: Card[] = [];
  const remainingHand: Card[] = [];

  for (const card of hand) {
    if (bagIdSet.has(card.id)) {
      bagCards.push(card);
    } else {
      remainingHand.push(card);
    }
  }

  const sealedBag: SealedBag = {
    playerId,
    cards: Object.freeze(bagCards) as unknown as Card[],
    isSnapped: true,
  };

  return {
    sealedBag,
    remainingHand,
  };
}
