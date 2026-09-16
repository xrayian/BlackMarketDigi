import { CARD_DEFINITIONS, Card, CardClassification, GoodType, ContrabandType, RoyalGoodType } from '@sheriff/shared';

export interface BuildDeckOptions {
  playerCount: number;
  enableRoyalGoods?: boolean;
}

export interface DrawResult {
  drawn: Card[];
  drawPile: Card[];
  discardPile: Card[];
  reshuffled: boolean;
}

/**
 * Builds the standard deck according to the rulebook based on player count and Royal Goods expansion.
 * - 3 players: 156 base cards (162 with Royal Goods)
 * - 4-6 players: 204 base cards (216 with Royal Goods)
 */
export function buildDeck(options: BuildDeckOptions): Card[] {
  const { playerCount, enableRoyalGoods = false } = options;

  if (playerCount < 3 || playerCount > 6) {
    throw new Error(`Invalid player count: ${playerCount}. Must be between 3 and 6.`);
  }

  const cards: Card[] = [];

  for (const def of CARD_DEFINITIONS) {
    if (def.classification === 'ROYAL' && !enableRoyalGoods) {
      continue;
    }

    const count = playerCount === 3 ? def.count3Player : def.count4PlusPlayer;
    const slug = def.name.toLowerCase().replace(/\s+/g, '_');

    for (let i = 1; i <= count; i++) {
      const card: Card = {
        id: `${slug}_${playerCount}p_${i}`,
        name: def.name,
        classification: def.classification,
        value: def.value,
        penalty: def.penalty,
      };

      if (def.goodType) card.goodType = def.goodType;
      if (def.contrabandType) card.contrabandType = def.contrabandType;
      if (def.royalGoodType) card.royalGoodType = def.royalGoodType;
      if (def.baseGood) card.baseGood = def.baseGood;
      if (def.royalBonusCount !== undefined) card.royalBonusCount = def.royalBonusCount;

      cards.push(card);
    }
  }

  return cards;
}

/**
 * Immutable Fisher-Yates shuffle.
 */
export function shuffleDeck<T>(deck: readonly T[], rng: () => number = Math.random): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Draws `count` cards from the draw pile. If draw pile runs out, reshuffles discard pile into new draw pile.
 */
export function drawCards(
  drawPile: readonly Card[],
  discardPile: readonly Card[],
  count: number,
  rng: () => number = Math.random
): DrawResult {
  if (count <= 0) {
    return {
      drawn: [],
      drawPile: [...drawPile],
      discardPile: [...discardPile],
      reshuffled: false,
    };
  }

  if (drawPile.length >= count) {
    return {
      drawn: drawPile.slice(0, count),
      drawPile: drawPile.slice(count),
      discardPile: [...discardPile],
      reshuffled: false,
    };
  }

  // Draw all remaining from drawPile
  const drawnFromDrawPile = [...drawPile];
  const needed = count - drawnFromDrawPile.length;

  if (discardPile.length === 0) {
    return {
      drawn: drawnFromDrawPile,
      drawPile: [],
      discardPile: [],
      reshuffled: false,
    };
  }

  // Reshuffle discard pile into new draw pile
  const newDrawPile = shuffleDeck(discardPile, rng);
  const drawnFromReshuffled = newDrawPile.slice(0, needed);
  const remainingDrawPile = newDrawPile.slice(needed);

  return {
    drawn: [...drawnFromDrawPile, ...drawnFromReshuffled],
    drawPile: remainingDrawPile,
    discardPile: [],
    reshuffled: true,
  };
}

/**
 * Deals initial hand size (default 6) to all players from draw pile.
 */
export function dealStartingHands(
  deck: readonly Card[],
  playerIds: readonly string[],
  handSize = 6
): { hands: Record<string, Card[]>; remainingDeck: Card[] } {
  let currentDeck = [...deck];
  const hands: Record<string, Card[]> = {};

  for (const playerId of playerIds) {
    if (currentDeck.length < handSize) {
      throw new Error(`Not enough cards in deck to deal starting hand to player ${playerId}`);
    }
    hands[playerId] = currentDeck.slice(0, handSize);
    currentDeck = currentDeck.slice(handSize);
  }

  return { hands, remainingDeck: currentDeck };
}
