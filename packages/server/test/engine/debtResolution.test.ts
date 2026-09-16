import { describe, it, expect } from 'vitest';
import { resolveDebt, StandParticipant } from '../../src/engine/debtResolution';
import { Card } from '@sheriff/shared';

describe('debtResolution engine', () => {
  const makeLegalCard = (id: string, value = 2): Card => ({
    id,
    name: `Legal ${id}`,
    classification: 'LEGAL',
    goodType: 'APPLE',
    value,
    penalty: 2,
  });

  const makeContrabandCard = (id: string, value = 6): Card => ({
    id,
    name: `Contraband ${id}`,
    classification: 'CONTRABAND',
    contrabandType: 'PEPPER',
    value,
    penalty: 4,
  });

  const createDebtor = (
    gold: number,
    standLegal: Card[] = [],
    standContraband: Card[] = []
  ): StandParticipant => ({
    id: 'debtor_1',
    gold,
    standLegal,
    standContraband,
  });

  const createCreditor = (
    gold: number,
    standLegal: Card[] = [],
    standContraband: Card[] = []
  ): StandParticipant => ({
    id: 'creditor_1',
    gold,
    standLegal,
    standContraband,
  });

  it('handles debt <= 0 gracefully (no payment or transfers)', () => {
    const debtor = createDebtor(20, [makeLegalCard('c1')]);
    const creditor = createCreditor(10);

    const res0 = resolveDebt(debtor, creditor, 0);
    expect(res0.settled).toBe(true);
    expect(res0.paidGold).toBe(0);
    expect(res0.debtor.gold).toBe(20);
    expect(res0.creditor.gold).toBe(10);

    const resNegative = resolveDebt(debtor, creditor, -5);
    expect(resNegative.settled).toBe(true);
    expect(resNegative.paidGold).toBe(0);
  });

  it('Step 1: resolves fully via cash on hand when debtor has sufficient gold', () => {
    const debtor = createDebtor(50, [makeLegalCard('c1')]);
    const creditor = createCreditor(10);

    const result = resolveDebt(debtor, creditor, 8);

    expect(result.paidGold).toBe(8);
    expect(result.debtor.gold).toBe(42);
    expect(result.creditor.gold).toBe(18);
    expect(result.transferredLegalCards).toHaveLength(0);
    expect(result.transferredContrabandCards).toHaveLength(0);
    expect(result.remainingDebt).toBe(0);
    expect(result.forgivenDebt).toBe(0);
    expect(result.settled).toBe(true);
  });

  it('Step 2: liquidates legal goods when gold is insufficient', () => {
    const debtor = createDebtor(2, [
      makeLegalCard('ap1', 2),
      makeLegalCard('ap2', 2),
    ]);
    const creditor = createCreditor(5);

    // Debt = 6. Debtor pays 2 gold. Remaining = 4. Surrenders ap1 (2) + ap2 (2). Remaining = 0.
    const result = resolveDebt(debtor, creditor, 6);

    expect(result.paidGold).toBe(2);
    expect(result.debtor.gold).toBe(0);
    expect(result.creditor.gold).toBe(7);
    expect(result.transferredLegalCards.map((c) => c.id)).toEqual(['ap1', 'ap2']);
    expect(result.debtor.standLegal).toHaveLength(0);
    expect(result.creditor.standLegal).toHaveLength(2);
    expect(result.remainingDebt).toBe(0);
    expect(result.settled).toBe(true);
  });

  it('Step 2: overpayment with legal goods does NOT return change', () => {
    const debtor = createDebtor(0, [makeLegalCard('ch1', 4)]); // Chicken value 4
    const creditor = createCreditor(10);

    // Debt = 3. Debtor surrenders card worth 4. Overpays by 1.
    const result = resolveDebt(debtor, creditor, 3);

    expect(result.paidGold).toBe(0);
    expect(result.debtor.gold).toBe(0); // NO CHANGE GIVEN!
    expect(result.creditor.gold).toBe(10);
    expect(result.transferredLegalCards.map((c) => c.id)).toEqual(['ch1']);
    expect(result.remainingDebt).toBe(0);
    expect(result.settled).toBe(true);
  });

  it('Step 3: liquidates contraband when legal goods are exhausted', () => {
    const debtor = createDebtor(
      0,
      [makeLegalCard('ap1', 2)],
      [makeContrabandCard('p1', 6)]
    );
    const creditor = createCreditor(0);

    // Debt = 7. Debtor has 0 gold. Surrenders ap1 (val 2) -> debt 5.
    // Legal exhausted. Surrenders p1 (val 6) -> debt 0.
    const result = resolveDebt(debtor, creditor, 7);

    expect(result.paidGold).toBe(0);
    expect(result.transferredLegalCards.map((c) => c.id)).toEqual(['ap1']);
    expect(result.transferredContrabandCards.map((c) => c.id)).toEqual(['p1']);
    expect(result.debtor.standLegal).toHaveLength(0);
    expect(result.debtor.standContraband).toHaveLength(0);
    expect(result.creditor.standLegal).toHaveLength(1);
    expect(result.creditor.standContraband).toHaveLength(1);
    expect(result.remainingDebt).toBe(0);
    expect(result.settled).toBe(true);
  });

  it('Step 3: overpayment with contraband does NOT return change', () => {
    const debtor = createDebtor(0, [], [makeContrabandCard('s1', 8)]); // Silk val 8
    const creditor = createCreditor(5);

    // Debt = 5. Debtor surrenders silk val 8.
    const result = resolveDebt(debtor, creditor, 5);

    expect(result.transferredContrabandCards.map((c) => c.id)).toEqual(['s1']);
    expect(result.debtor.gold).toBe(0);
    expect(result.creditor.gold).toBe(5);
    expect(result.remainingDebt).toBe(0);
    expect(result.settled).toBe(true);
  });

  it('Step 4: wipes remaining debt when all stand goods and contraband are exhausted', () => {
    const debtor = createDebtor(
      3,
      [makeLegalCard('ap1', 2)],
      [makeContrabandCard('p1', 6)]
    );
    const creditor = createCreditor(0);

    // Debt = 20.
    // 1) Cash: pays 3 -> debt 17.
    // 2) Legal: surrenders ap1 (2) -> debt 15.
    // 3) Contraband: surrenders p1 (6) -> debt 9.
    // 4) Stand completely empty -> leftover 9 wiped!
    const result = resolveDebt(debtor, creditor, 20);

    expect(result.paidGold).toBe(3);
    expect(result.debtor.gold).toBe(0);
    expect(result.creditor.gold).toBe(3);
    expect(result.transferredLegalCards).toHaveLength(1);
    expect(result.transferredContrabandCards).toHaveLength(1);
    expect(result.forgivenDebt).toBe(9);
    expect(result.remainingDebt).toBe(0);
    expect(result.settled).toBe(true);
  });

  it('Step 4: completely bankrupt player (0 gold, 0 legal, 0 contraband) has entire debt forgiven', () => {
    const debtor = createDebtor(0, [], []);
    const creditor = createCreditor(10);

    const result = resolveDebt(debtor, creditor, 12);

    expect(result.paidGold).toBe(0);
    expect(result.transferredLegalCards).toHaveLength(0);
    expect(result.transferredContrabandCards).toHaveLength(0);
    expect(result.forgivenDebt).toBe(12);
    expect(result.remainingDebt).toBe(0);
    expect(result.settled).toBe(true);
  });

  it('respects preferred card liquidation order if provided', () => {
    const debtor = createDebtor(
      0,
      [makeLegalCard('ap1', 2), makeLegalCard('ap2', 2), makeLegalCard('ch1', 4)],
      [makeContrabandCard('cb1', 6), makeContrabandCard('cb2', 8)]
    );
    const creditor = createCreditor(0);

    // Preferred legal order: ch1 first
    const result = resolveDebt(debtor, creditor, 4, {
      preferredLegalCardIds: ['ch1'],
    });

    expect(result.transferredLegalCards.map((c) => c.id)).toEqual(['ch1']);
    expect(result.debtor.standLegal.map((c) => c.id)).toEqual(['ap1', 'ap2']);
  });

  it('respects preferred contraband liquidation order if provided', () => {
    const debtor = createDebtor(
      0,
      [],
      [makeContrabandCard('cb1', 6), makeContrabandCard('cb2', 8)]
    );
    const creditor = createCreditor(0);

    // Preferred contraband order: cb2 first
    const result = resolveDebt(debtor, creditor, 7, {
      preferredContrabandCardIds: ['cb2'],
    });

    expect(result.transferredContrabandCards.map((c) => c.id)).toEqual(['cb2']);
    expect(result.debtor.standContraband.map((c) => c.id)).toEqual(['cb1']);
  });

  it('falls back to shift if preferred ID is not present in stand', () => {
    const debtor = createDebtor(0, [makeLegalCard('ap1', 2)]);
    const creditor = createCreditor(0);

    const result = resolveDebt(debtor, creditor, 2, {
      preferredLegalCardIds: ['non_existent_id'],
    });

    expect(result.transferredLegalCards.map((c) => c.id)).toEqual(['ap1']);
  });
});
