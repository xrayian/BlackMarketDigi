import { Card, GoodType, ContrabandType } from '@sheriff/shared';

export interface BribeAgreement {
  gold: number;
  standCardIds?: string[];
  bagGoodsClaims?: { goodType: GoodType | ContrabandType; count: number }[];
}

export interface InspectionResolution {
  isHonest: boolean;
  declaredGood: GoodType;
  declaredCount: number;
  merchantKeptCards: Card[];
  confiscatedCards: Card[];
  penaltyAmount: number;
  debtor: 'SHERIFF' | 'MERCHANT' | 'NONE';
  creditor: 'SHERIFF' | 'MERCHANT' | 'NONE';
}

export interface PassUnopenedResult {
  merchantKeptLegalCards: Card[];
  merchantKeptContrabandCards: Card[];
  merchantPaidGold: number;
  merchantTransferredStandCards: Card[];
  sheriffReceivedBagCards: Card[];
}

/**
 * Resolves opening and inspecting a merchant bag.
 * - Honest: Sheriff pays total penalty of ALL cards in bag to Merchant. Merchant keeps all cards.
 * - Dishonest: Merchant keeps only cards matching declaredGood. Confiscated cards go to discard.
 *   Merchant pays penalty on ALL confiscated cards to Sheriff.
 */
export function resolveInspection(
  bagCards: readonly Card[],
  declaredGood: GoodType,
  declaredCount: number
): InspectionResolution {
  const keptCards: Card[] = [];
  const confiscatedCards: Card[] = [];

  for (const card of bagCards) {
    const isDeclaredLegalGood =
      card.classification === 'LEGAL' && card.goodType === declaredGood;

    if (isDeclaredLegalGood) {
      keptCards.push(card);
    } else {
      confiscatedCards.push(card);
    }
  }

  const isHonest = confiscatedCards.length === 0 && keptCards.length === declaredCount;

  if (isHonest) {
    // Sheriff pays penalty for every card in the bag
    const penaltyAmount = bagCards.reduce((sum, card) => sum + card.penalty, 0);
    return {
      isHonest: true,
      declaredGood,
      declaredCount,
      merchantKeptCards: [...bagCards],
      confiscatedCards: [],
      penaltyAmount,
      debtor: 'SHERIFF',
      creditor: 'MERCHANT',
    };
  }

  // Dishonest: Merchant pays penalty for confiscated cards only
  const penaltyAmount = confiscatedCards.reduce((sum, card) => sum + card.penalty, 0);
  return {
    isHonest: false,
    declaredGood,
    declaredCount,
    merchantKeptCards: keptCards,
    confiscatedCards,
    penaltyAmount,
    debtor: 'MERCHANT',
    creditor: 'SHERIFF',
  };
}

/**
 * Resolves passing a merchant bag unopened (with or without an accepted bribe).
 * Honors Honor Among Thieves: bag goods promised are transferred only if they actually exist in the bag!
 */
export function resolvePassUnopened(
  bagCards: readonly Card[],
  bribe?: BribeAgreement,
  merchantStandCards: readonly Card[] = []
): PassUnopenedResult {
  const remainingBagCards = [...bagCards];
  const sheriffReceivedBagCards: Card[] = [];

  // Transfer promised bag goods that actually exist in the bag
  if (bribe?.bagGoodsClaims && bribe.bagGoodsClaims.length > 0) {
    for (const claim of bribe.bagGoodsClaims) {
      let needed = claim.count;
      for (let i = remainingBagCards.length - 1; i >= 0 && needed > 0; i--) {
        const card = remainingBagCards[i];
        const match =
          (card.goodType && card.goodType === claim.goodType) ||
          (card.contrabandType && card.contrabandType === claim.goodType);

        if (match) {
          sheriffReceivedBagCards.push(card);
          remainingBagCards.splice(i, 1);
          needed--;
        }
      }
    }
  }

  // Sort remaining bag cards into legal (faceup) and contraband/royal (facedown)
  const merchantKeptLegalCards: Card[] = [];
  const merchantKeptContrabandCards: Card[] = [];

  for (const card of remainingBagCards) {
    if (card.classification === 'LEGAL') {
      merchantKeptLegalCards.push(card);
    } else {
      merchantKeptContrabandCards.push(card);
    }
  }

  // Transfer promised stand cards
  const merchantTransferredStandCards: Card[] = [];
  if (bribe?.standCardIds && bribe.standCardIds.length > 0) {
    const standCardMap = new Map(merchantStandCards.map((c) => [c.id, c]));
    for (const id of bribe.standCardIds) {
      const card = standCardMap.get(id);
      if (card) {
        merchantTransferredStandCards.push(card);
      }
    }
  }

  return {
    merchantKeptLegalCards,
    merchantKeptContrabandCards,
    merchantPaidGold: bribe?.gold ?? 0,
    merchantTransferredStandCards,
    sheriffReceivedBagCards,
  };
}
