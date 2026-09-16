import { describe, it, expect } from 'vitest';
import {
  isRoyalGoodsEnabled,
  getRoyalGoodsDefinitions,
  getRoyalGoodBonus,
} from '../../src/engine/modules/royalGoods';
import {
  isDeputiesEnabled,
  initDeputiesState,
  drawDeputiesForRound,
  resolveJointPass,
  resolveJointInspect,
  resolveSoloInspect,
  distributeBootyTile,
} from '../../src/engine/modules/deputies';
import {
  isBlackMarketEnabled,
  initBlackMarketState,
  canClaimBlackMarketOrder,
  claimBlackMarketOrder,
  resetRoundBlackMarketClaims,
} from '../../src/engine/modules/blackMarket';
import { Card } from '@sheriff/shared';

describe('expansion modules (behind feature flags)', () => {
  describe('royalGoods module', () => {
    it('checks feature flag correctly', () => {
      expect(isRoyalGoodsEnabled()).toBe(false);
      expect(isRoyalGoodsEnabled({ enableRoyalGoods: false })).toBe(false);
      expect(isRoyalGoodsEnabled({ enableRoyalGoods: true })).toBe(true);
    });

    it('returns filtered catalog for 3 players (6 cards) vs 4+ players (12 cards)', () => {
      const defs3p = getRoyalGoodsDefinitions(3);
      const totalCards3p = defs3p.reduce((sum, d) => sum + d.count3Player, 0);
      expect(totalCards3p).toBe(6);

      const defs4p = getRoyalGoodsDefinitions(4);
      const totalCards4p = defs4p.reduce((sum, d) => sum + d.count4PlusPlayer, 0);
      expect(totalCards4p).toBe(12);
    });

    it('extracts royal bonus from card', () => {
      const card: Card = {
        id: 'rg1',
        name: 'Gouda Cheese',
        classification: 'ROYAL',
        royalGoodType: 'GOUDA_CHEESE',
        baseGood: 'CHEESE',
        royalBonusCount: 2,
        value: 6,
        penalty: 4,
      };

      const bonus = getRoyalGoodBonus(card);
      expect(bonus).toEqual({ baseGood: 'CHEESE', bonusCount: 2 });

      // Royal card with default bonus count fallback
      const defaultCard: Card = {
        id: 'rg_def',
        name: 'Royal Card',
        classification: 'ROYAL',
        baseGood: 'APPLE',
        value: 4,
        penalty: 3,
      };
      expect(getRoyalGoodBonus(defaultCard)).toEqual({ baseGood: 'APPLE', bonusCount: 1 });

      const legalCard: Card = {
        id: 'c1',
        name: 'Apples',
        classification: 'LEGAL',
        goodType: 'APPLE',
        value: 2,
        penalty: 2,
      };
      expect(getRoyalGoodBonus(legalCard)).toBeNull();
    });
  });

  describe('deputies module (6th player rule)', () => {
    it('checks feature flag requiring enableDeputies and exactly 6 players', () => {
      expect(isDeputiesEnabled()).toBe(false);
      expect(isDeputiesEnabled({ enableDeputies: true, playerCount: 6 })).toBe(true);
      expect(isDeputiesEnabled({ enableDeputies: true, playerCount: 5 })).toBe(false);
      expect(isDeputiesEnabled({ enableDeputies: false, playerCount: 6 })).toBe(false);
    });

    it('initializes state and throws if player count is not 6', () => {
      expect(() => initDeputiesState(['p1', 'p2', 'p3'])).toThrow(/requires exactly 6 players/);

      const state = initDeputiesState(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
      expect(state.playerIds.length).toBe(6);
      expect(state.deputyDeck.length).toBe(6);
      expect(state.bootyTile.gold).toBe(0);
    });

    it('draws 2 deputies per round, reshuffles every 3 rounds, ends after 3 depletions', () => {
      const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
      let state = initDeputiesState(playerIds);

      // Round 1
      const r1 = drawDeputiesForRound(state);
      expect(r1.deputies.length).toBe(2);
      expect(r1.isGameOver).toBe(false);
      state = r1.nextState;

      // Round 2
      const r2 = drawDeputiesForRound(state);
      state = r2.nextState;

      // Round 3 (depletes deck first time)
      const r3 = drawDeputiesForRound(state);
      expect(r3.nextState.deckDepletions).toBe(1);
      state = r3.nextState;

      // Fast forward through rounds 4-9
      for (let i = 4; i <= 9; i++) {
        const roundRes = drawDeputiesForRound(state);
        state = roundRes.nextState;
        if (i === 9) {
          expect(roundRes.isGameOver).toBe(true);
        }
      }
    });

    it('resolves joint pass, joint inspect (honest vs dishonest), and solo inspect', () => {
      const booty = { gold: 5, goods: [] };

      // Joint pass adds bribe to booty
      const updatedBooty = resolveJointPass(booty, 10);
      expect(updatedBooty.gold).toBe(15);

      // Joint inspect honest: each deputy pays half penalty from own gold
      const honestInspect = resolveJointInspect(booty, true, 8);
      expect(honestInspect.deputy1PenaltyOwed).toBe(4);
      expect(honestInspect.deputy2PenaltyOwed).toBe(4);
      expect(honestInspect.updatedBooty.gold).toBe(5);

      // Joint inspect dishonest: fine placed on booty
      const dishonestInspect = resolveJointInspect(booty, false, 6);
      expect(dishonestInspect.updatedBooty.gold).toBe(11);
      expect(dishonestInspect.deputy1PenaltyOwed).toBe(0);

      // Solo inspect
      const soloHonest = resolveSoloInspect('d1', true, 4);
      expect(soloHonest.deputyPenaltyOwed).toBe(4);
      expect(soloHonest.deputyRewardEarned).toBe(0);

      const soloDishonest = resolveSoloInspect('d1', false, 8);
      expect(soloDishonest.deputyPenaltyOwed).toBe(0);
      expect(soloDishonest.deputyRewardEarned).toBe(8);
    });

    it('evenly distributes booty tile gold and goods at round end', () => {
      const makeCard = (id: string): Card => ({
        id,
        name: 'Card',
        classification: 'LEGAL',
        value: 2,
        penalty: 2,
      });

      const booty = {
        gold: 15, // 14 split (7 each), 1 discarded
        goods: [makeCard('g1'), makeCard('g2'), makeCard('g3')], // 2 split (1 each), 1 discarded
      };

      const dist = distributeBootyTile(booty);
      expect(dist.deputy1Gold).toBe(7);
      expect(dist.deputy2Gold).toBe(7);
      expect(dist.discardedGold).toBe(1);
      expect(dist.deputy1Goods.length).toBe(1);
      expect(dist.deputy2Goods.length).toBe(1);
      expect(dist.discardedGoods.length).toBe(1);
    });
  });

  describe('blackMarket module', () => {
    const makeContraband = (id: string, type: 'PEPPER' | 'MEAD' | 'SILK'): Card => ({
      id,
      name: type,
      classification: 'CONTRABAND',
      contrabandType: type,
      value: 6,
      penalty: 4,
    });

    it('checks feature flag correctly', () => {
      expect(isBlackMarketEnabled()).toBe(false);
      expect(isBlackMarketEnabled({ enableBlackMarket: false })).toBe(false);
      expect(isBlackMarketEnabled({ enableBlackMarket: true })).toBe(true);
    });

    it('initializes 3 piles of 2 cards each with higher value on top', () => {
      const state = initBlackMarketState();
      expect(state.pepperPile.length).toBe(2);
      expect(state.meadPile.length).toBe(2);
      expect(state.silkPile.length).toBe(2);

      expect(state.pepperPile[0].pointsValue).toBeGreaterThan(state.pepperPile[1].pointsValue);
      expect(state.meadPile[0].pointsValue).toBeGreaterThan(state.meadPile[1].pointsValue);
      expect(state.silkPile[0].pointsValue).toBeGreaterThan(state.silkPile[1].pointsValue);
    });

    it('validates claim requirements: requires 3 matching contraband and max 1 per round', () => {
      let state = initBlackMarketState();

      // Only 2 peppers in stand
      const stand2Peppers = [makeContraband('p1', 'PEPPER'), makeContraband('p2', 'PEPPER')];
      const checkFail = canClaimBlackMarketOrder(state, 'p1', 'PEPPER', stand2Peppers);
      expect(checkFail.canClaim).toBe(false);
      expect(checkFail.reason).toMatch(/Requires 3 PEPPER/);

      // 4 peppers in stand (3 discarded, 1 retained)
      const stand4Peppers = [
        makeContraband('p1', 'PEPPER'),
        makeContraband('p2', 'PEPPER'),
        makeContraband('p3', 'PEPPER'),
        makeContraband('p4', 'PEPPER'),
      ];
      const checkPass = canClaimBlackMarketOrder(state, 'p1', 'PEPPER', stand4Peppers);
      expect(checkPass.canClaim).toBe(true);
      expect(checkPass.topCard?.pointsValue).toBe(14);

      // Claim order
      const result = claimBlackMarketOrder(state, 'p1', 'PEPPER', stand4Peppers);
      expect(result.claimedCard.pointsValue).toBe(14);
      expect(result.updatedStandContraband.length).toBe(1); // 1 retained!
      expect(result.discardedCards.length).toBe(3);
      expect(result.nextState.pepperPile.length).toBe(1);

      state = result.nextState;

      // Second claim in same round should fail
      const checkSecond = canClaimBlackMarketOrder(state, 'p1', 'PEPPER', stand4Peppers);
      expect(checkSecond.canClaim).toBe(false);
      expect(checkSecond.reason).toMatch(/already claimed/);
      expect(() => claimBlackMarketOrder(state, 'p1', 'PEPPER', stand4Peppers)).toThrow(/already claimed/);

      // Reset round claims
      const resetState = resetRoundBlackMarketClaims(state);
      expect(resetState.claimedThisRoundPlayerIds.size).toBe(0);
    });

    it('supports claiming Mead and Silk orders', () => {
      const state = initBlackMarketState();

      // Mead claim
      const standMead = [
        makeContraband('m1', 'MEAD'),
        makeContraband('m2', 'MEAD'),
        makeContraband('m3', 'MEAD'),
      ];
      const meadRes = claimBlackMarketOrder(state, 'p2', 'MEAD', standMead);
      expect(meadRes.claimedCard.contrabandType).toBe('MEAD');
      expect(meadRes.claimedCard.pointsValue).toBe(16);

      // Silk claim
      const standSilk = [
        makeContraband('s1', 'SILK'),
        makeContraband('s2', 'SILK'),
        makeContraband('s3', 'SILK'),
      ];
      const silkRes = claimBlackMarketOrder(state, 'p3', 'SILK', standSilk);
      expect(silkRes.claimedCard.contrabandType).toBe('SILK');
      expect(silkRes.claimedCard.pointsValue).toBe(18);
    });

    it('returns empty/failure when pile is exhausted or CROSSBOW queried', () => {
      const state = initBlackMarketState();
      // Empty out pepper pile
      state.pepperPile = [];
      const standPeppers = [
        makeContraband('p1', 'PEPPER'),
        makeContraband('p2', 'PEPPER'),
        makeContraband('p3', 'PEPPER'),
      ];
      const checkEmpty = canClaimBlackMarketOrder(state, 'p1', 'PEPPER', standPeppers);
      expect(checkEmpty.canClaim).toBe(false);
      expect(checkEmpty.reason).toMatch(/No Black Market orders remaining/);

      const checkCrossbow = canClaimBlackMarketOrder(state, 'p1', 'CROSSBOW' as any, []);
      expect(checkCrossbow.canClaim).toBe(false);
    });
  });
});
