import { describe, it, expect } from 'vitest';
import {
  getDeclarationOrder,
  validateDeclaration,
  applyDeclaration,
} from '../../src/engine/phases/declaration';
import { Card, SealedBag } from '@sheriff/shared';

describe('declaration phase engine', () => {
  const makeCards = (count: number): Card[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `c_${i}`,
      name: `Card ${i}`,
      classification: 'LEGAL',
      goodType: 'APPLE',
      value: 2,
      penalty: 2,
    }));

  describe('getDeclarationOrder', () => {
    it('orders players clockwise starting from Sheriff left', () => {
      const seats = ['p1', 'p2', 'p3', 'p4'];
      expect(getDeclarationOrder(seats, 'p1')).toEqual(['p2', 'p3', 'p4']);
      expect(getDeclarationOrder(seats, 'p3')).toEqual(['p4', 'p1', 'p2']);
      expect(getDeclarationOrder(seats, 'p4')).toEqual(['p1', 'p2', 'p3']);
    });

    it('throws if sheriff is not in seats', () => {
      expect(() => getDeclarationOrder(['p1', 'p2'], 'p3')).toThrow(/not found in table seats/);
    });
  });

  describe('validateDeclaration and applyDeclaration', () => {
    it('accepts valid declarations for all four legal goods matching card count', () => {
      const bagCards = makeCards(3);
      for (const good of ['APPLE', 'CHEESE', 'BREAD', 'CHICKEN'] as const) {
        const val = validateDeclaration(bagCards, 3, good);
        expect(val.valid).toBe(true);

        const sealedBag: SealedBag = {
          playerId: 'm1',
          cards: bagCards,
          isSnapped: true,
        };

        const declared = applyDeclaration(sealedBag, 3, good);
        expect(declared.declaredCount).toBe(3);
        expect(declared.declaredGood).toBe(good);
      }
    });

    it('rejects contraband or invalid good names', () => {
      const bagCards = makeCards(2);
      expect(validateDeclaration(bagCards, 2, 'PEPPER').valid).toBe(false);
      expect(validateDeclaration(bagCards, 2, 'SILK').valid).toBe(false);
      expect(validateDeclaration(bagCards, 2, 'GOLDEN_APPLE').valid).toBe(false);
      expect(validateDeclaration(bagCards, 2, 'GOLD').valid).toBe(false);
    });

    it('rejects count mismatch between declaration and bag', () => {
      const bagCards = makeCards(3);
      const val = validateDeclaration(bagCards, 4, 'APPLE');
      expect(val.valid).toBe(false);
      expect(val.error).toMatch(/does not match exact bag card count/);
    });

    it('rejects count out of range (0 or >5)', () => {
      expect(validateDeclaration([], 0, 'APPLE').valid).toBe(false);
      expect(validateDeclaration(makeCards(6), 6, 'APPLE').valid).toBe(false);
    });

    it('throws error when applyDeclaration fails validation', () => {
      const sealedBag: SealedBag = {
        playerId: 'm1',
        cards: makeCards(2),
        isSnapped: true,
      };

      expect(() => applyDeclaration(sealedBag, 3, 'APPLE')).toThrow(/does not match exact bag/);
    });
  });
});
