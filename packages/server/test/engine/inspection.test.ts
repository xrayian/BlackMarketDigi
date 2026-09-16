import { describe, it, expect } from 'vitest';
import { resolveInspection, resolvePassUnopened } from '../../src/engine/phases/inspection';
import { Card } from '@sheriff/shared';

describe('inspection phase engine', () => {
  const makeLegalCard = (id: string, goodType: 'APPLE' | 'CHEESE' | 'BREAD' | 'CHICKEN', penalty = 2): Card => ({
    id,
    name: goodType,
    classification: 'LEGAL',
    goodType,
    value: goodType === 'CHICKEN' ? 4 : goodType === 'APPLE' ? 2 : 3,
    penalty,
  });

  const makeContrabandCard = (id: string, contrabandType: 'PEPPER' | 'MEAD' | 'SILK' | 'CROSSBOW'): Card => ({
    id,
    name: contrabandType,
    classification: 'CONTRABAND',
    contrabandType,
    value: 6,
    penalty: 4,
  });

  const makeRoyalCard = (id: string, name: string, baseGood: 'APPLE', penalty = 3): Card => ({
    id,
    name,
    classification: 'ROYAL',
    royalGoodType: 'GREEN_APPLE',
    baseGood,
    royalBonusCount: 2,
    value: 4,
    penalty,
  });

  describe('resolveInspection — Honest Merchant', () => {
    it('penalizes Sheriff for total penalty of honest bag (GDD Little John example: 4 Chickens)', () => {
      const bag = [
        makeLegalCard('ch1', 'CHICKEN', 2),
        makeLegalCard('ch2', 'CHICKEN', 2),
        makeLegalCard('ch3', 'CHICKEN', 2),
        makeLegalCard('ch4', 'CHICKEN', 2),
      ];

      const result = resolveInspection(bag, 'CHICKEN', 4);

      expect(result.isHonest).toBe(true);
      expect(result.confiscatedCards).toHaveLength(0);
      expect(result.merchantKeptCards).toHaveLength(4);
      expect(result.penaltyAmount).toBe(8);
      expect(result.debtor).toBe('SHERIFF');
      expect(result.creditor).toBe('MERCHANT');
    });

    it('handles single card honest inspection', () => {
      const bag = [makeLegalCard('ap1', 'APPLE', 2)];
      const result = resolveInspection(bag, 'APPLE', 1);

      expect(result.isHonest).toBe(true);
      expect(result.penaltyAmount).toBe(2);
      expect(result.debtor).toBe('SHERIFF');
    });
  });

  describe('resolveInspection — Dishonest Merchant & Partial Honesty', () => {
    it('resolves GDD Gilbert Whitehand example: declared 4 Apples; bag: 1 Apple, 1 Cheese, 2 Mead', () => {
      const bag = [
        makeLegalCard('ap1', 'APPLE', 2),
        makeLegalCard('ch1', 'CHEESE', 2),
        makeContrabandCard('m1', 'MEAD'), // penalty 4
        makeContrabandCard('m2', 'MEAD'), // penalty 4
      ];

      const result = resolveInspection(bag, 'APPLE', 4);

      expect(result.isHonest).toBe(false);
      expect(result.merchantKeptCards.map((c) => c.id)).toEqual(['ap1']);
      expect(result.confiscatedCards.map((c) => c.id)).toEqual(['ch1', 'm1', 'm2']);
      // Penalty = 2 (Cheese) + 4 (Mead) + 4 (Mead) = 10
      expect(result.penaltyAmount).toBe(10);
      expect(result.debtor).toBe('MERCHANT');
      expect(result.creditor).toBe('SHERIFF');
    });

    it('confiscates all cards when merchant lied about everything', () => {
      const bag = [
        makeContrabandCard('s1', 'SILK'),
        makeContrabandCard('s2', 'SILK'),
      ];

      const result = resolveInspection(bag, 'APPLE', 2);

      expect(result.isHonest).toBe(false);
      expect(result.merchantKeptCards).toHaveLength(0);
      expect(result.confiscatedCards).toHaveLength(2);
      expect(result.penaltyAmount).toBe(8);
      expect(result.debtor).toBe('MERCHANT');
    });

    it('confiscates Royal Goods when declared as legal goods (Royal Goods are Contraband)', () => {
      const bag = [
        makeLegalCard('ap1', 'APPLE', 2),
        makeRoyalCard('ra1', 'Green Apples', 'APPLE', 3),
      ];

      const result = resolveInspection(bag, 'APPLE', 2);

      expect(result.isHonest).toBe(false);
      expect(result.merchantKeptCards.map((c) => c.id)).toEqual(['ap1']);
      expect(result.confiscatedCards.map((c) => c.id)).toEqual(['ra1']);
      expect(result.penaltyAmount).toBe(3);
    });
  });

  describe('resolvePassUnopened', () => {
    it('separates legal goods and contraband without bribe', () => {
      const bag = [
        makeLegalCard('ch1', 'CHEESE', 2),
        makeContrabandCard('p1', 'PEPPER'),
      ];

      const result = resolvePassUnopened(bag);

      expect(result.merchantKeptLegalCards.map((c) => c.id)).toEqual(['ch1']);
      expect(result.merchantKeptContrabandCards.map((c) => c.id)).toEqual(['p1']);
      expect(result.merchantPaidGold).toBe(0);
    });

    it('transfers gold and stand cards per accepted bribe', () => {
      const bag = [makeLegalCard('ch1', 'CHEESE', 2)];
      const standCards = [
        makeLegalCard('st1', 'APPLE', 2),
        makeLegalCard('st2', 'BREAD', 3),
      ];

      const result = resolvePassUnopened(
        bag,
        { gold: 5, standCardIds: ['st1'] },
        standCards
      );

      expect(result.merchantPaidGold).toBe(5);
      expect(result.merchantTransferredStandCards.map((c) => c.id)).toEqual(['st1']);
    });

    it('honors thieves rule: transfers promised bag goods only if they exist', () => {
      const bag = [
        makeLegalCard('ap1', 'APPLE', 2),
        makeContrabandCard('p1', 'PEPPER'),
      ];

      // Merchant falsely promised 1 Silk from bag, and truthfully promised 1 Pepper
      const result = resolvePassUnopened(bag, {
        gold: 3,
        bagGoodsClaims: [
          { goodType: 'SILK', count: 1 },
          { goodType: 'PEPPER', count: 1 },
        ],
      });

      expect(result.sheriffReceivedBagCards.map((c) => c.id)).toEqual(['p1']);
      // Merchant kept Apple (Silk wasn't in bag so couldn't be given)
      expect(result.merchantKeptLegalCards.map((c) => c.id)).toEqual(['ap1']);
      expect(result.merchantKeptContrabandCards).toHaveLength(0);
    });
  });
});
