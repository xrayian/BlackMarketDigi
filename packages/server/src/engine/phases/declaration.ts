import { Card, GoodType, LEGAL_GOODS, MIN_BAG_CARDS, MAX_BAG_CARDS, SealedBag } from '@sheriff/shared';

/**
 * Calculates declaration order: starting from player immediately to Sheriff's left (clockwise), skipping Sheriff.
 */
export function getDeclarationOrder(tableSeats: readonly string[], sheriffId: string): string[] {
  const sheriffIndex = tableSeats.indexOf(sheriffId);
  if (sheriffIndex === -1) {
    throw new Error(`Sheriff ${sheriffId} not found in table seats`);
  }

  const order: string[] = [];
  for (let i = 1; i < tableSeats.length; i++) {
    const nextPlayer = tableSeats[(sheriffIndex + i) % tableSeats.length];
    if (nextPlayer !== sheriffId) {
      order.push(nextPlayer);
    }
  }

  return order;
}

/**
 * Validates a merchant declaration.
 * - Must declare 1 type of Legal Good (APPLE, CHEESE, BREAD, CHICKEN).
 * - Must declare the EXACT number of cards in the bag (1 to 5).
 */
export function validateDeclaration(
  bagCards: readonly Card[],
  declaredCount: number,
  declaredGood: string
): { valid: boolean; error?: string } {
  if (!LEGAL_GOODS.includes(declaredGood as GoodType)) {
    return {
      valid: false,
      error: `Declared good "${declaredGood}" is not a valid legal good. Must be one of: ${LEGAL_GOODS.join(', ')}`,
    };
  }

  if (declaredCount < MIN_BAG_CARDS || declaredCount > MAX_BAG_CARDS) {
    return {
      valid: false,
      error: `Declared count must be between ${MIN_BAG_CARDS} and ${MAX_BAG_CARDS}`,
    };
  }

  if (declaredCount !== bagCards.length) {
    return {
      valid: false,
      error: `Declared count (${declaredCount}) does not match exact bag card count (${bagCards.length})`,
    };
  }

  return { valid: true };
}

/**
 * Attaches the validated declaration to the sealed bag.
 */
export function applyDeclaration(
  sealedBag: SealedBag,
  declaredCount: number,
  declaredGood: GoodType
): SealedBag {
  const validation = validateDeclaration(sealedBag.cards, declaredCount, declaredGood);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    ...sealedBag,
    declaredCount,
    declaredGood,
  };
}
