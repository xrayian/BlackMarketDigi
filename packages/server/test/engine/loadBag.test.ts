import { describe, it, expect } from 'vitest';
import { validateBagCards, loadAndSnapBag } from '../../src/engine/phases/loadBag';
import { Card } from '@sheriff/shared';

describe('loadBag phase engine', () => {
  const makeHand = (ids: string[]): Card[] =>
    ids.map((id) => ({
      id,
      name: `Card ${id}`,
      classification: 'LEGAL',
      goodType: 'APPLE',
      value: 2,
      penalty: 2,
    }));

  it('validates 1 to 5 cards from hand successfully', () => {
    const hand = makeHand(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);

    for (let count = 1; count <= 5; count++) {
      const selected = hand.slice(0, count).map((c) => c.id);
      const validation = validateBagCards(selected, hand);
      expect(validation.valid).toBe(true);

      const result = loadAndSnapBag({
        playerId: 'p1',
        hand,
        cardIdsToLoad: selected,
      });

      expect(result.sealedBag.cards.length).toBe(count);
      expect(result.sealedBag.isSnapped).toBe(true);
      expect(result.sealedBag.playerId).toBe('p1');
      expect(result.remainingHand.length).toBe(6 - count);
    }
  });

  it('rejects empty bag (0 cards) or undefined selection', () => {
    const hand = makeHand(['c1', 'c2']);
    const validation = validateBagCards([], hand);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/between 1 and 5/);
    expect(() => loadAndSnapBag({ playerId: 'p1', hand, cardIdsToLoad: [] })).toThrow(/between 1 and 5/);

    const undefValidation = validateBagCards(undefined as unknown as string[], hand);
    expect(undefValidation.valid).toBe(false);
  });

  it('rejects more than 5 cards', () => {
    const hand = makeHand(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
    const selected = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
    const validation = validateBagCards(selected, hand);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/between 1 and 5/);
    expect(() => loadAndSnapBag({ playerId: 'p1', hand, cardIdsToLoad: selected })).toThrow(/between 1 and 5/);
  });

  it('rejects duplicate card IDs', () => {
    const hand = makeHand(['c1', 'c2', 'c3']);
    const selected = ['c1', 'c1'];
    const validation = validateBagCards(selected, hand);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/duplicate card IDs/);
    expect(() => loadAndSnapBag({ playerId: 'p1', hand, cardIdsToLoad: selected })).toThrow(/duplicate card IDs/);
  });

  it('rejects cards not present in player hand', () => {
    const hand = makeHand(['c1', 'c2']);
    const selected = ['c1', 'c99'];
    const validation = validateBagCards(selected, hand);
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/not present in player hand/);
    expect(() => loadAndSnapBag({ playerId: 'p1', hand, cardIdsToLoad: selected })).toThrow(/not present in player hand/);
  });
});
