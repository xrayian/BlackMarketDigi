import { Card, DebtResolutionResult } from '@sheriff/shared';

export interface StandParticipant {
  id: string;
  gold: number;
  standLegal: Card[];
  standContraband: Card[];
}

export interface ResolveDebtOptions {
  preferredLegalCardIds?: string[];
  preferredContrabandCardIds?: string[];
}

export interface DetailedDebtResolutionResult extends DebtResolutionResult {
  initialDebt: number;
  debtor: StandParticipant;
  creditor: StandParticipant;
}

/**
 * Resolves a penalty debt between a debtor and creditor strictly following GDD §2.2:
 * 1. Cash on hand: Debtor pays up to available gold coins.
 * 2. Legal Goods from stand: Debtor surrenders legal goods (value >= amount owed).
 *    Overpayment does NOT return change!
 * 3. Contraband from stand: Debtor surrenders contraband (revealed).
 *    Overpayment does NOT return change!
 * 4. Empty stand wipes debt: If all goods & contraband exhausted, leftover debt is forgiven.
 */
export function resolveDebt(
  debtorInput: Readonly<StandParticipant>,
  creditorInput: Readonly<StandParticipant>,
  debtAmount: number,
  options?: ResolveDebtOptions
): DetailedDebtResolutionResult {
  if (debtAmount <= 0) {
    return {
      initialDebt: 0,
      paidGold: 0,
      transferredLegalCards: [],
      transferredContrabandCards: [],
      forgivenDebt: 0,
      remainingDebt: 0,
      settled: true,
      debtor: {
        id: debtorInput.id,
        gold: debtorInput.gold,
        standLegal: [...debtorInput.standLegal],
        standContraband: [...debtorInput.standContraband],
      },
      creditor: {
        id: creditorInput.id,
        gold: creditorInput.gold,
        standLegal: [...creditorInput.standLegal],
        standContraband: [...creditorInput.standContraband],
      },
    };
  }

  let remainingDebt = debtAmount;
  let debtorGold = debtorInput.gold;
  let creditorGold = creditorInput.gold;

  const debtorLegal = [...debtorInput.standLegal];
  const debtorContraband = [...debtorInput.standContraband];
  const creditorLegal = [...creditorInput.standLegal];
  const creditorContraband = [...creditorInput.standContraband];

  const transferredLegalCards: Card[] = [];
  const transferredContrabandCards: Card[] = [];

  // Step 1: Cash on Hand
  const goldToPay = Math.min(debtorGold, remainingDebt);
  if (goldToPay > 0) {
    debtorGold -= goldToPay;
    creditorGold += goldToPay;
    remainingDebt -= goldToPay;
  }

  // Helper to find next card to liquidate based on optional preferred order
  const findAndRemoveNextCard = (
    pool: Card[],
    preferredIds?: string[]
  ): Card => {
    if (preferredIds && preferredIds.length > 0) {
      for (const id of preferredIds) {
        const index = pool.findIndex((c) => c.id === id);
        if (index !== -1) {
          return pool.splice(index, 1)[0];
        }
      }
    }
    return pool.shift()!;
  };

  // Step 2: Legal Goods from Stand
  while (remainingDebt > 0 && debtorLegal.length > 0) {
    const card = findAndRemoveNextCard(debtorLegal, options?.preferredLegalCardIds);
    transferredLegalCards.push(card);
    creditorLegal.push(card);

    // Overpayment does NOT return change: leftover debt reduces to at most 0
    remainingDebt = Math.max(0, remainingDebt - card.value);
  }

  // Step 3: Contraband from Stand
  while (remainingDebt > 0 && debtorContraband.length > 0) {
    const card = findAndRemoveNextCard(debtorContraband, options?.preferredContrabandCardIds);
    transferredContrabandCards.push(card);
    creditorContraband.push(card);

    // Overpayment does NOT return change
    remainingDebt = Math.max(0, remainingDebt - card.value);
  }

  // Step 4: Empty Stand wipes remaining debt
  let forgivenDebt = 0;
  if (remainingDebt > 0) {
    forgivenDebt = remainingDebt;
    remainingDebt = 0;
  }

  return {
    initialDebt: debtAmount,
    paidGold: goldToPay,
    transferredLegalCards,
    transferredContrabandCards,
    forgivenDebt,
    remainingDebt,
    settled: remainingDebt === 0,
    debtor: {
      id: debtorInput.id,
      gold: debtorGold,
      standLegal: debtorLegal,
      standContraband: debtorContraband,
    },
    creditor: {
      id: creditorInput.id,
      gold: creditorGold,
      standLegal: creditorLegal,
      standContraband: creditorContraband,
    },
  };
}
