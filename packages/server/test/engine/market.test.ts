import { describe, it, expect } from 'vitest';
import {
  calculateMerchantOrder,
  initMarketPhase,
  getCurrentMarketMerchant,
  exchangeMarketCards,
  finalizeMarketPhase,
} from '../../src/engine/phases/market';
import { Card } from '@sheriff/shared';

describe('market phase engine', () => {
  const makeHand = (ids: string[]): Card[] =>
    ids.map((id) => ({
      id,
      name: `Card ${id}`,
      classification: 'LEGAL',
      goodType: 'APPLE',
      value: 2,
      penalty: 2,
    }));

  describe('calculateMerchantOrder', () => {
    it('defaults to player clockwise from sheriff and skips sheriff', () => {
      const seats = ['p1', 'p2', 'p3', 'p4'];
      const order = calculateMerchantOrder(seats, 'p2');
      expect(order).toEqual(['p3', 'p4', 'p1']);
    });

    it('respects designated starting merchant if provided', () => {
      const seats = ['p1', 'p2', 'p3', 'p4'];
      const order = calculateMerchantOrder(seats, 'p2', 'p4');
      expect(order).toEqual(['p4', 'p1', 'p3']);
    });

    it('falls back to default if designated merchant is invalid or is sheriff', () => {
      const seats = ['p1', 'p2', 'p3', 'p4'];
      const order1 = calculateMerchantOrder(seats, 'p2', 'p2');
      expect(order1).toEqual(['p3', 'p4', 'p1']);

      const order2 = calculateMerchantOrder(seats, 'p2', 'p99');
      expect(order2).toEqual(['p3', 'p4', 'p1']);
    });

    it('throws error if sheriff is not in table seats', () => {
      expect(() => calculateMerchantOrder(['p1', 'p2'], 'p3')).toThrow(/not in table seats/);
    });

    it('throws error if no merchants available', () => {
      expect(() => calculateMerchantOrder(['p1'], 'p1')).toThrow(/No merchants available/);
    });
  });

  describe('initMarketPhase and progression', () => {
    it('initializes state with correct order and hand size', () => {
      const seats = ['p1', 'p2', 'p3', 'p4'];
      const state = initMarketPhase({ tableSeats: seats, sheriffId: 'p1' });

      expect(state.sheriffId).toBe('p1');
      expect(state.merchantOrder).toEqual(['p2', 'p3', 'p4']);
      expect(state.currentMerchantIndex).toBe(0);
      expect(getCurrentMarketMerchant(state)).toBe('p2');
      expect(state.maxHandSize).toBe(6);
    });

    it('executes exchange, refills hand, sets aside cards, and completes phase', () => {
      const seats = ['p1', 'p2', 'p3'];
      let state = initMarketPhase({ tableSeats: seats, sheriffId: 'p1' });

      const p2Hand = makeHand(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
      const p3Hand = makeHand(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']);
      const drawPile = makeHand(['draw1', 'draw2', 'draw3', 'draw4']);
      const discardPile: Card[] = [];

      // P2 exchanges 2 cards
      const res1 = exchangeMarketCards({
        state,
        playerId: 'p2',
        cardIdsToDiscard: ['c1', 'c2'],
        hand: p2Hand,
        drawPile,
        discardPile,
      });

      expect(res1.newHand.length).toBe(6);
      expect(res1.discardedCards.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(res1.drawnCards.map((c) => c.id)).toEqual(['draw1', 'draw2']);
      expect(res1.newDrawPile.length).toBe(2);
      expect(res1.isMarketComplete).toBe(false);

      state = res1.nextState;
      expect(getCurrentMarketMerchant(state)).toBe('p3');

      // P3 exchanges 0 cards (keeps hand)
      const res2 = exchangeMarketCards({
        state,
        playerId: 'p3',
        cardIdsToDiscard: [],
        hand: p3Hand,
        drawPile: res1.newDrawPile,
        discardPile: res1.newDiscardPile,
      });

      expect(res2.newHand.length).toBe(6);
      expect(res2.drawnCards.length).toBe(0);
      expect(res2.isMarketComplete).toBe(true);
      expect(getCurrentMarketMerchant(res2.nextState)).toBeNull();

      // Finalize sweeps set-aside cards to discard pile
      const finalized = finalizeMarketPhase(res2.nextState, res2.newDiscardPile);
      expect(finalized.finalDiscardPile.map((c) => c.id)).toEqual(['c1', 'c2']);
    });

    it('throws errors on invalid inputs', () => {
      const seats = ['p1', 'p2', 'p3'];
      const state = initMarketPhase({ tableSeats: seats, sheriffId: 'p1' });
      const hand = makeHand(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);

      // Wrong player
      expect(() =>
        exchangeMarketCards({
          state,
          playerId: 'p3',
          cardIdsToDiscard: ['c1'],
          hand,
          drawPile: [],
          discardPile: [],
        })
      ).toThrow(/It is not player p3's turn/);

      // Sheriff cannot play
      expect(() =>
        exchangeMarketCards({
          state: { ...state, merchantOrder: ['p1'] },
          playerId: 'p1',
          cardIdsToDiscard: [],
          hand,
          drawPile: [],
          discardPile: [],
        })
      ).toThrow(/Sheriff cannot participate/);

      // Discarding >5 cards
      expect(() =>
        exchangeMarketCards({
          state,
          playerId: 'p2',
          cardIdsToDiscard: ['1', '2', '3', '4', '5', '6'],
          hand: makeHand(['1', '2', '3', '4', '5', '6', '7']),
          drawPile: [],
          discardPile: [],
        })
      ).toThrow(/Cannot set aside more than 5 cards/);

      // Duplicate card IDs
      expect(() =>
        exchangeMarketCards({
          state,
          playerId: 'p2',
          cardIdsToDiscard: ['c1', 'c1'],
          hand,
          drawPile: [],
          discardPile: [],
        })
      ).toThrow(/Duplicate card IDs/);

      // Card not in hand
      expect(() =>
        exchangeMarketCards({
          state,
          playerId: 'p2',
          cardIdsToDiscard: ['c99'],
          hand,
          drawPile: [],
          discardPile: [],
        })
      ).toThrow(/not found in player hand/);

      // Exchange after phase complete
      expect(() =>
        exchangeMarketCards({
          state: { ...state, currentMerchantIndex: 5 },
          playerId: 'p2',
          cardIdsToDiscard: [],
          hand,
          drawPile: [],
          discardPile: [],
        })
      ).toThrow(/already complete/);
    });
  });
});
