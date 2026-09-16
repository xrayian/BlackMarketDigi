import { describe, it, expect } from 'vitest';
import { calculateKingQueenBonuses, calculateScores, PlayerStandInput } from '../../src/engine/scoring';
import { Card } from '@sheriff/shared';

describe('scoring engine', () => {
  const makeLegalCard = (id: string, goodType: 'APPLE' | 'CHEESE' | 'BREAD' | 'CHICKEN'): Card => ({
    id,
    name: goodType,
    classification: 'LEGAL',
    goodType,
    value: goodType === 'APPLE' ? 2 : goodType === 'CHICKEN' ? 4 : 3,
    penalty: 2,
  });

  const makeContrabandCard = (
    id: string,
    contrabandType: 'PEPPER' | 'MEAD' | 'SILK' | 'CROSSBOW',
    value = 6
  ): Card => ({
    id,
    name: contrabandType,
    classification: 'CONTRABAND',
    contrabandType,
    value,
    penalty: 4,
  });

  const makeRoyalCard = (
    id: string,
    name: string,
    baseGood: 'APPLE' | 'CHEESE' | 'BREAD' | 'CHICKEN',
    bonusCount: number,
    value: number
  ): Card => ({
    id,
    name,
    classification: 'ROYAL',
    baseGood,
    royalBonusCount: bonusCount,
    value,
    penalty: 4,
  });

  describe('King and Queen bonus logic', () => {
    it('awards sole King and sole Queen correctly', () => {
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'Player 1',
        gold: 0,
        standLegal: [makeLegalCard('a1', 'APPLE'), makeLegalCard('a2', 'APPLE')],
        standContraband: [],
      };
      const p2: PlayerStandInput = {
        id: 'p2',
        name: 'Player 2',
        gold: 0,
        standLegal: [makeLegalCard('a3', 'APPLE')],
        standContraband: [],
      };
      const p3: PlayerStandInput = {
        id: 'p3',
        name: 'Player 3',
        gold: 0,
        standLegal: [],
        standContraband: [],
      };

      const bonuses = calculateKingQueenBonuses([p1, p2, p3]);

      const p1Bonuses = bonuses.get('p1')!;
      expect(p1Bonuses).toHaveLength(1);
      expect(p1Bonuses[0]).toEqual({ goodType: 'APPLE', title: 'KING', points: 20 });

      const p2Bonuses = bonuses.get('p2')!;
      expect(p2Bonuses).toHaveLength(1);
      expect(p2Bonuses[0]).toEqual({ goodType: 'APPLE', title: 'QUEEN', points: 10 });

      const p3Bonuses = bonuses.get('p3')!;
      expect(p3Bonuses).toHaveLength(0);
    });

    it('handles Tied King: splits King+Queen (floored) and skips Queen', () => {
      // 2 players tie for Apple King (20 + 10 = 30; 30 / 2 = 15 each)
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'Player 1',
        gold: 0,
        standLegal: [makeLegalCard('a1', 'APPLE'), makeLegalCard('a2', 'APPLE')],
        standContraband: [],
      };
      const p2: PlayerStandInput = {
        id: 'p2',
        name: 'Player 2',
        gold: 0,
        standLegal: [makeLegalCard('a3', 'APPLE'), makeLegalCard('a4', 'APPLE')],
        standContraband: [],
      };
      const p3: PlayerStandInput = {
        id: 'p3',
        name: 'Player 3',
        gold: 0,
        standLegal: [makeLegalCard('a5', 'APPLE')],
        standContraband: [],
      };

      const bonuses = calculateKingQueenBonuses([p1, p2, p3]);

      expect(bonuses.get('p1')!).toEqual([
        { goodType: 'APPLE', title: 'TIED_KING', points: 15 },
      ]);
      expect(bonuses.get('p2')!).toEqual([
        { goodType: 'APPLE', title: 'TIED_KING', points: 15 },
      ]);
      // P3 gets nothing because Queen is NOT paid out when King is tied!
      expect(bonuses.get('p3')!).toHaveLength(0);
    });

    it('handles 3-way Tied King with floored integer division', () => {
      // 3 players tie for Chicken King (10 + 5 = 15; 15 / 3 = 5 each)
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'P1',
        gold: 0,
        standLegal: [makeLegalCard('c1', 'CHICKEN')],
        standContraband: [],
      };
      const p2: PlayerStandInput = {
        id: 'p2',
        name: 'P2',
        gold: 0,
        standLegal: [makeLegalCard('c2', 'CHICKEN')],
        standContraband: [],
      };
      const p3: PlayerStandInput = {
        id: 'p3',
        name: 'P3',
        gold: 0,
        standLegal: [makeLegalCard('c3', 'CHICKEN')],
        standContraband: [],
      };

      const bonuses = calculateKingQueenBonuses([p1, p2, p3]);

      expect(bonuses.get('p1')![0].points).toBe(5);
      expect(bonuses.get('p2')![0].points).toBe(5);
      expect(bonuses.get('p3')![0].points).toBe(5);
    });

    it('handles Tied Queen: King gets full bonus, Queens split floored Queen bonus', () => {
      // Cheese King = 15. Queen = 10.
      // P1 has 3 Cheese (King: 15)
      // P2 and P3 tie with 2 Cheese each (Queen split: 10 / 2 = 5 each)
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'P1',
        gold: 0,
        standLegal: [
          makeLegalCard('ch1', 'CHEESE'),
          makeLegalCard('ch2', 'CHEESE'),
          makeLegalCard('ch3', 'CHEESE'),
        ],
        standContraband: [],
      };
      const p2: PlayerStandInput = {
        id: 'p2',
        name: 'P2',
        gold: 0,
        standLegal: [makeLegalCard('ch4', 'CHEESE'), makeLegalCard('ch5', 'CHEESE')],
        standContraband: [],
      };
      const p3: PlayerStandInput = {
        id: 'p3',
        name: 'P3',
        gold: 0,
        standLegal: [makeLegalCard('ch6', 'CHEESE'), makeLegalCard('ch7', 'CHEESE')],
        standContraband: [],
      };

      const bonuses = calculateKingQueenBonuses([p1, p2, p3]);

      expect(bonuses.get('p1')![0]).toEqual({
        goodType: 'CHEESE',
        title: 'KING',
        points: 15,
      });
      expect(bonuses.get('p2')![0]).toEqual({
        goodType: 'CHEESE',
        title: 'TIED_QUEEN',
        points: 5,
      });
      expect(bonuses.get('p3')![0]).toEqual({
        goodType: 'CHEESE',
        title: 'TIED_QUEEN',
        points: 5,
      });
    });

    it('incorporates Royal Goods bonus counts into King/Queen determination', () => {
      // GDD example: Will Scarlet has 10 Cheese + 1 Gouda (+2 Cheese) = 12 Cheese
      // Maid Marion has 11 Cheese
      const will: PlayerStandInput = {
        id: 'will',
        name: 'Will Scarlet',
        gold: 0,
        standLegal: Array.from({ length: 10 }, (_, i) => makeLegalCard(`w_${i}`, 'CHEESE')),
        standContraband: [makeRoyalCard('gouda', 'Gouda Cheese', 'CHEESE', 2, 6)],
      };
      const marion: PlayerStandInput = {
        id: 'marion',
        name: 'Maid Marion',
        gold: 0,
        standLegal: Array.from({ length: 11 }, (_, i) => makeLegalCard(`m_${i}`, 'CHEESE')),
        standContraband: [],
      };

      const bonuses = calculateKingQueenBonuses([will, marion]);

      expect(bonuses.get('will')![0]).toEqual({
        goodType: 'CHEESE',
        title: 'KING',
        points: 15,
      });
      expect(bonuses.get('marion')![0]).toEqual({
        goodType: 'CHEESE',
        title: 'QUEEN',
        points: 10,
      });
    });

    it('awards King only when only 1 player delivered the good', () => {
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'P1',
        gold: 0,
        standLegal: [makeLegalCard('b1', 'BREAD')],
        standContraband: [],
      };
      const p2: PlayerStandInput = {
        id: 'p2',
        name: 'P2',
        gold: 0,
        standLegal: [],
        standContraband: [],
      };

      const bonuses = calculateKingQueenBonuses([p1, p2]);

      expect(bonuses.get('p1')!).toEqual([
        { goodType: 'BREAD', title: 'KING', points: 15 },
      ]);
      expect(bonuses.get('p2')!).toHaveLength(0);
    });
  });

  describe('calculateScores — full score breakdown and tiebreakers', () => {
    it('matches exact GDD David of Doncaster score example (125 points)', () => {
      // 4 Apples (val 2), 6 Cheese (val 3), 1 Bread (val 3), 4 Chickens (val 4)
      // 2 Pepper (val 6), 1 Crossbow (val 9)
      // 42 Gold
      // Cheese King (15)
      // Chicken Queen tied with another player (5 / 2 = 2.5 floored to 2)
      // Total: 8 + 18 + 3 + 16 + 12 + 9 + 42 + 15 + 2 = 125
      const david: PlayerStandInput = {
        id: 'david',
        name: 'David of Doncaster',
        gold: 42,
        standLegal: [
          ...Array.from({ length: 4 }, (_, i) => makeLegalCard(`a_${i}`, 'APPLE')),
          ...Array.from({ length: 6 }, (_, i) => makeLegalCard(`c_${i}`, 'CHEESE')),
          makeLegalCard('b_1', 'BREAD'),
          ...Array.from({ length: 4 }, (_, i) => makeLegalCard(`ch_${i}`, 'CHICKEN')),
        ],
        standContraband: [
          makeContrabandCard('p_1', 'PEPPER', 6),
          makeContrabandCard('p_2', 'PEPPER', 6),
          makeContrabandCard('cb_1', 'CROSSBOW', 9),
        ],
      };

      const other1: PlayerStandInput = {
        id: 'other1',
        name: 'Other 1',
        gold: 10,
        standLegal: [
          // 5 Apples -> Apple King
          ...Array.from({ length: 5 }, (_, i) => makeLegalCard(`o1_a_${i}`, 'APPLE')),
          // 2 Bread -> Tied Bread King
          ...Array.from({ length: 2 }, (_, i) => makeLegalCard(`o1_b_${i}`, 'BREAD')),
          // 5 Cheese -> Cheese Queen (David has 6)
          ...Array.from({ length: 5 }, (_, i) => makeLegalCard(`o1_c_${i}`, 'CHEESE')),
          // 5 Chickens -> Chicken King (10)
          ...Array.from({ length: 5 }, (_, i) => makeLegalCard(`o1_ch_${i}`, 'CHICKEN')),
        ],
        standContraband: [],
      };

      const other2: PlayerStandInput = {
        id: 'other2',
        name: 'Other 2',
        gold: 10,
        standLegal: [
          // 5 Apples -> Tied Apple King with Other 1 (Queen skipped)
          ...Array.from({ length: 5 }, (_, i) => makeLegalCard(`o2_a_${i}`, 'APPLE')),
          // 2 Bread -> Tied Bread King with Other 1 (Queen skipped)
          ...Array.from({ length: 2 }, (_, i) => makeLegalCard(`o2_b_${i}`, 'BREAD')),
          // 4 Chickens -> Ties David for Chicken Queen (5 / 2 floored = 2)
          ...Array.from({ length: 4 }, (_, i) => makeLegalCard(`o2_ch_${i}`, 'CHICKEN')),
        ],
        standContraband: [],
      };

      const scores = calculateScores([david, other1, other2]);
      const davidScore = scores.find((s) => s.playerId === 'david')!;

      expect(davidScore.legalGoodsValue).toBe(8 + 18 + 3 + 16); // 45
      expect(davidScore.contrabandValue).toBe(12 + 9); // 21
      expect(davidScore.goodsValue).toBe(66);
      expect(davidScore.gold).toBe(42);
      expect(davidScore.bonusPoints).toBe(17); // 15 + 2
      expect(davidScore.totalScore).toBe(125);
    });

    it('breaks total score ties by Most Legal Goods', () => {
      // Outside players take King & Queen so p1 and p2 have 0 bonus
      const kPlayer: PlayerStandInput = {
        id: 'k',
        name: 'King',
        gold: 0,
        standLegal: Array.from({ length: 10 }, (_, i) => makeLegalCard(`k_${i}`, 'APPLE')),
        standContraband: [],
      };
      const qPlayer: PlayerStandInput = {
        id: 'q',
        name: 'Queen',
        gold: 0,
        standLegal: Array.from({ length: 9 }, (_, i) => makeLegalCard(`q_${i}`, 'APPLE')),
        standContraband: [],
      };

      // p1: 50 gold + 2 Apples (4) = 54 pts, 2 legal goods
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'P1',
        gold: 50,
        standLegal: [makeLegalCard('a1', 'APPLE'), makeLegalCard('a2', 'APPLE')],
        standContraband: [],
      };
      // p2: 52 gold + 1 Apple (2) = 54 pts, 1 legal good
      const p2: PlayerStandInput = {
        id: 'p2',
        name: 'P2',
        gold: 52,
        standLegal: [makeLegalCard('a3', 'APPLE')],
        standContraband: [],
      };

      const scores = calculateScores([kPlayer, qPlayer, p2, p1]);
      const p1Score = scores.find((s) => s.playerId === 'p1')!;
      const p2Score = scores.find((s) => s.playerId === 'p2')!;

      expect(p1Score.totalScore).toBe(54);
      expect(p2Score.totalScore).toBe(54);
      expect(p1Score.rank).toBe(1);
      expect(p2Score.rank).toBe(2);
    });

    it('breaks legal goods ties by Most Contraband Goods', () => {
      // Both p1 and p2 have 2 Apples, tying for King (15 pts bonus each)
      // p1: 40 gold + 2 Apples (4) + 2 Peppers (12) + 15 bonus = 71 pts, 2 legal, 2 contraband
      // p2: 44 gold + 2 Apples (4) + 1 Silk (8) + 15 bonus = 71 pts, 2 legal, 1 contraband
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'P1',
        gold: 40,
        standLegal: [makeLegalCard('a1', 'APPLE'), makeLegalCard('a2', 'APPLE')],
        standContraband: [makeContrabandCard('p1', 'PEPPER', 6), makeContrabandCard('p2', 'PEPPER', 6)],
      };
      const p2: PlayerStandInput = {
        id: 'p2',
        name: 'P2',
        gold: 44,
        standLegal: [makeLegalCard('a3', 'APPLE'), makeLegalCard('a4', 'APPLE')],
        standContraband: [makeContrabandCard('s1', 'SILK', 8)],
      };

      const scores = calculateScores([p2, p1]);
      expect(scores[0].totalScore).toBe(71);
      expect(scores[1].totalScore).toBe(71);
      expect(scores[0].legalGoodsCount).toBe(2);
      expect(scores[1].legalGoodsCount).toBe(2);
      // P1 wins tiebreak 2 because contrabandCount (2) > contrabandCount (1)
      expect(scores[0].playerId).toBe('p1');
      expect(scores[0].rank).toBe(1);
      expect(scores[1].playerId).toBe('p2');
      expect(scores[1].rank).toBe(2);
    });

    it('scores Royal Goods in standContraband and standRoyal correctly', () => {
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'P1',
        gold: 10,
        standLegal: [makeLegalCard('a1', 'APPLE')], // val 2
        standContraband: [
          makeRoyalCard('rg1', 'Green Apples', 'APPLE', 2, 4), // val 4, +2 apple count
          {
            id: 'rg_default',
            name: 'Generic Royal Apple',
            classification: 'ROYAL',
            baseGood: 'APPLE',
            value: 5,
            penalty: 4,
            // royalBonusCount omitted to test default fallback of 1
          },
        ],
        standRoyal: [
          makeRoyalCard('rg2', 'Golden Apples', 'APPLE', 3, 6), // val 6, +3 apple count
        ],
      };

      const scores = calculateScores([p1]);
      const p1Score = scores[0];

      expect(p1Score.legalGoodsValue).toBe(2);
      expect(p1Score.royalGoodsValue).toBe(15); // 4 + 5 + 6
      expect(p1Score.goodsValue).toBe(17);
      // 1 base apple + 2 + 1 (default) + 3 royal apples = 7 apples -> King (20)
      expect(p1Score.bonusPoints).toBe(20);
      expect(p1Score.totalScore).toBe(10 + 17 + 20); // 47
      expect(p1Score.legalGoodsCount).toBe(7);
    });

    it('shares victory when score, legal goods, and contraband counts are identical', () => {
      const p1: PlayerStandInput = {
        id: 'p1',
        name: 'P1',
        gold: 50,
        standLegal: [makeLegalCard('a1', 'APPLE')],
        standContraband: [makeContrabandCard('p1', 'PEPPER', 6)],
      };
      const p2: PlayerStandInput = {
        id: 'p2',
        name: 'P2',
        gold: 50,
        standLegal: [makeLegalCard('a2', 'APPLE')],
        standContraband: [makeContrabandCard('p2', 'PEPPER', 6)],
      };

      const scores = calculateScores([p1, p2]);
      expect(scores[0].totalScore).toBe(scores[1].totalScore);
      expect(scores[0].rank).toBe(1);
      expect(scores[1].rank).toBe(1); // Shared victory
    });
  });
});
