import { describe, it, expect } from 'vitest';
import { buildDeck, shuffleDeck, drawCards, dealStartingHands } from '../../src/engine/deck';
import { Card } from '@sheriff/shared';

describe('deck engine', () => {
  describe('buildDeck', () => {
    it('throws error for player counts below 3 or above 6', () => {
      expect(() => buildDeck({ playerCount: 2 })).toThrow(/Invalid player count/);
      expect(() => buildDeck({ playerCount: 7 })).toThrow(/Invalid player count/);
    });

    it('builds 3-player base deck with exactly 156 cards and zero bread', () => {
      const deck = buildDeck({ playerCount: 3, enableRoyalGoods: false });
      expect(deck.length).toBe(156);

      const legalCards = deck.filter((c) => c.classification === 'LEGAL');
      const contrabandCards = deck.filter((c) => c.classification === 'CONTRABAND');
      const royalCards = deck.filter((c) => c.classification === 'ROYAL');

      expect(legalCards.length).toBe(108);
      expect(contrabandCards.length).toBe(48);
      expect(royalCards.length).toBe(0);

      // Verify exact counts per GDD breakdown
      expect(deck.filter((c) => c.goodType === 'APPLE').length).toBe(48);
      expect(deck.filter((c) => c.goodType === 'CHEESE').length).toBe(36);
      expect(deck.filter((c) => c.goodType === 'BREAD').length).toBe(0);
      expect(deck.filter((c) => c.goodType === 'CHICKEN').length).toBe(24);

      expect(deck.filter((c) => c.contrabandType === 'PEPPER').length).toBe(18);
      expect(deck.filter((c) => c.contrabandType === 'MEAD').length).toBe(16);
      expect(deck.filter((c) => c.contrabandType === 'SILK').length).toBe(9);
      expect(deck.filter((c) => c.contrabandType === 'CROSSBOW').length).toBe(5);
    });

    it('builds 3-player deck with Royal Goods (162 cards)', () => {
      const deck = buildDeck({ playerCount: 3, enableRoyalGoods: true });
      expect(deck.length).toBe(162);

      const royalCards = deck.filter((c) => c.classification === 'ROYAL');
      expect(royalCards.length).toBe(6);

      // 3p Royal goods filtration (6 removed per GDD §2.1)
      expect(deck.filter((c) => c.royalGoodType === 'GREEN_APPLE').length).toBe(2);
      expect(deck.filter((c) => c.royalGoodType === 'GOLDEN_APPLE').length).toBe(1);
      expect(deck.filter((c) => c.royalGoodType === 'GOUDA_CHEESE').length).toBe(2);
      expect(deck.filter((c) => c.royalGoodType === 'BLUE_CHEESE').length).toBe(0);
      expect(deck.filter((c) => c.royalGoodType === 'RYE_BREAD').length).toBe(0);
      expect(deck.filter((c) => c.royalGoodType === 'PUMPERNICKEL_BREAD').length).toBe(0);
      expect(deck.filter((c) => c.royalGoodType === 'ROYAL_ROOSTER').length).toBe(1);
    });

    it('builds 4-6 player base deck with exactly 204 cards including 36 bread', () => {
      for (const playerCount of [4, 5, 6]) {
        const deck = buildDeck({ playerCount, enableRoyalGoods: false });
        expect(deck.length).toBe(204);

        const legalCards = deck.filter((c) => c.classification === 'LEGAL');
        const contrabandCards = deck.filter((c) => c.classification === 'CONTRABAND');
        const royalCards = deck.filter((c) => c.classification === 'ROYAL');

        expect(legalCards.length).toBe(144);
        expect(contrabandCards.length).toBe(60);
        expect(royalCards.length).toBe(0);

        expect(deck.filter((c) => c.goodType === 'APPLE').length).toBe(48);
        expect(deck.filter((c) => c.goodType === 'CHEESE').length).toBe(36);
        expect(deck.filter((c) => c.goodType === 'BREAD').length).toBe(36);
        expect(deck.filter((c) => c.goodType === 'CHICKEN').length).toBe(24);

        expect(deck.filter((c) => c.contrabandType === 'PEPPER').length).toBe(22);
        expect(deck.filter((c) => c.contrabandType === 'MEAD').length).toBe(21);
        expect(deck.filter((c) => c.contrabandType === 'SILK').length).toBe(12);
        expect(deck.filter((c) => c.contrabandType === 'CROSSBOW').length).toBe(5);
      }
    });

    it('builds 4-6 player deck with Royal Goods (216 cards)', () => {
      const deck = buildDeck({ playerCount: 4, enableRoyalGoods: true });
      expect(deck.length).toBe(216);

      const royalCards = deck.filter((c) => c.classification === 'ROYAL');
      expect(royalCards.length).toBe(12);

      expect(deck.filter((c) => c.royalGoodType === 'GREEN_APPLE').length).toBe(2);
      expect(deck.filter((c) => c.royalGoodType === 'GOLDEN_APPLE').length).toBe(2);
      expect(deck.filter((c) => c.royalGoodType === 'GOUDA_CHEESE').length).toBe(2);
      expect(deck.filter((c) => c.royalGoodType === 'BLUE_CHEESE').length).toBe(1);
      expect(deck.filter((c) => c.royalGoodType === 'RYE_BREAD').length).toBe(2);
      expect(deck.filter((c) => c.royalGoodType === 'PUMPERNICKEL_BREAD').length).toBe(1);
      expect(deck.filter((c) => c.royalGoodType === 'ROYAL_ROOSTER').length).toBe(2);
    });

    it('assigns correct values and penalties to each card type', () => {
      const deck = buildDeck({ playerCount: 4, enableRoyalGoods: true });

      const apple = deck.find((c) => c.goodType === 'APPLE')!;
      expect(apple.value).toBe(2);
      expect(apple.penalty).toBe(2);

      const pepper = deck.find((c) => c.contrabandType === 'PEPPER')!;
      expect(pepper.value).toBe(6);
      expect(pepper.penalty).toBe(4);

      const crossbow = deck.find((c) => c.contrabandType === 'CROSSBOW')!;
      expect(crossbow.value).toBe(9);
      expect(crossbow.penalty).toBe(4);

      const blueCheese = deck.find((c) => c.royalGoodType === 'BLUE_CHEESE')!;
      expect(blueCheese.value).toBe(9);
      expect(blueCheese.penalty).toBe(5);
      expect(blueCheese.royalBonusCount).toBe(3);
    });
  });

  describe('shuffleDeck', () => {
    it('returns a new array with all the same items without mutating original', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleDeck(original, () => 0.5);
      expect(shuffled.length).toBe(original.length);
      expect(shuffled.sort()).toEqual(original);
      expect(original).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('drawCards', () => {
    const makeCards = (count: number, prefix: string): Card[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `${prefix}_${i}`,
        name: `${prefix} ${i}`,
        classification: 'LEGAL',
        value: 2,
        penalty: 2,
      }));

    it('returns empty drawn if count is 0 or negative', () => {
      const pile = makeCards(5, 'c');
      const result = drawCards(pile, [], 0);
      expect(result.drawn).toEqual([]);
      expect(result.drawPile.length).toBe(5);
      expect(result.reshuffled).toBe(false);

      const negativeResult = drawCards(pile, [], -2);
      expect(negativeResult.drawn).toEqual([]);
    });

    it('draws directly from draw pile when enough cards exist', () => {
      const pile = makeCards(10, 'c');
      const result = drawCards(pile, [], 3);
      expect(result.drawn.length).toBe(3);
      expect(result.drawPile.length).toBe(7);
      expect(result.reshuffled).toBe(false);
    });

    it('reshuffles discard pile when draw pile is exhausted', () => {
      const drawPile = makeCards(2, 'draw');
      const discardPile = makeCards(5, 'discard');

      const result = drawCards(drawPile, discardPile, 4);
      expect(result.drawn.length).toBe(4);
      expect(result.drawPile.length).toBe(3);
      expect(result.discardPile.length).toBe(0);
      expect(result.reshuffled).toBe(true);

      // Verify the first 2 drawn cards came from initial draw pile
      expect(result.drawn[0].id).toBe('draw_0');
      expect(result.drawn[1].id).toBe('draw_1');
    });

    it('handles total deck exhaustion gracefully when draw + discard is less than requested', () => {
      const drawPile = makeCards(2, 'draw');
      const discardPile: Card[] = [];

      const result = drawCards(drawPile, discardPile, 5);
      expect(result.drawn.length).toBe(2);
      expect(result.drawPile.length).toBe(0);
      expect(result.discardPile.length).toBe(0);
      expect(result.reshuffled).toBe(false);
    });
  });

  describe('dealStartingHands', () => {
    it('deals 6 cards to each player', () => {
      const deck = buildDeck({ playerCount: 3 });
      const players = ['p1', 'p2', 'p3'];
      const { hands, remainingDeck } = dealStartingHands(deck, players, 6);

      expect(hands.p1.length).toBe(6);
      expect(hands.p2.length).toBe(6);
      expect(hands.p3.length).toBe(6);
      expect(remainingDeck.length).toBe(156 - 18);
    });

    it('throws error if deck does not have enough cards to deal hands', () => {
      const shortDeck = buildDeck({ playerCount: 3 }).slice(0, 10);
      expect(() => dealStartingHands(shortDeck, ['p1', 'p2'], 6)).toThrow(/Not enough cards/);
    });
  });
});
