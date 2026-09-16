import { Card, CARD_DEFINITIONS, CardDefinition, GoodType } from '@sheriff/shared';

export interface RoyalGoodsConfig {
  enableRoyalGoods: boolean;
}

/**
 * Checks if Royal Goods expansion is active.
 */
export function isRoyalGoodsEnabled(config?: RoyalGoodsConfig): boolean {
  return config?.enableRoyalGoods === true;
}

/**
 * Returns royal goods definitions filtered for player count per GDD §2.1 & §3.1.
 */
export function getRoyalGoodsDefinitions(playerCount: number): CardDefinition[] {
  return CARD_DEFINITIONS.filter((def) => {
    if (def.classification !== 'ROYAL') return false;
    if (playerCount === 3 && def.fourPlusOnly) return false;
    return true;
  });
}

/**
 * Returns the effective base good and bonus count added by a Royal Good.
 */
export function getRoyalGoodBonus(
  card: Card
): { baseGood: GoodType; bonusCount: number } | null {
  if (card.classification !== 'ROYAL' || !card.baseGood) {
    return null;
  }

  return {
    baseGood: card.baseGood,
    bonusCount: card.royalBonusCount ?? 1,
  };
}
