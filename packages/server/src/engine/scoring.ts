import {
  Card,
  GoodType,
  KING_QUEEN_BONUSES,
  LEGAL_GOODS,
  PlayerScoreBreakdown,
  BonusAward,
} from '@sheriff/shared';

export interface PlayerStandInput {
  id: string;
  name: string;
  gold: number;
  standLegal: Card[];
  standContraband: Card[];
  standRoyal?: Card[];
}

/**
 * Calculates King and Queen bonus distributions for each legal good type across all players.
 * Floored division rule strictly applied:
 * - Tied King: Math.floor((king + queen) / tiedCount), Queen bonus NOT awarded.
 * - Tied Queen: Math.floor(queen / tiedCount).
 * - Minimum 1 good required to be eligible for King or Queen.
 */
export function calculateKingQueenBonuses(
  players: readonly PlayerStandInput[]
): Map<string, BonusAward[]> {
  const playerBonuses = new Map<string, BonusAward[]>();
  for (const p of players) {
    playerBonuses.set(p.id, []);
  }

  for (const goodType of LEGAL_GOODS) {
    const { king: kingBonus, queen: queenBonus } = KING_QUEEN_BONUSES[goodType];

    // Calculate effective good counts for each player including Royal Goods bonuses
    const counts: { playerId: string; count: number }[] = [];

    for (const player of players) {
      let count = 0;

      // Count base legal cards
      for (const card of player.standLegal) {
        if (card.goodType === goodType) {
          count += 1;
        }
      }

      // Count royal goods in standRoyal or standContraband that match this base good
      const royalPool = [
        ...(player.standRoyal ?? []),
        ...player.standContraband.filter((c) => c.classification === 'ROYAL'),
      ];

      for (const card of royalPool) {
        if (card.baseGood === goodType) {
          count += card.royalBonusCount ?? 1;
        }
      }

      if (count > 0) {
        counts.push({ playerId: player.id, count });
      }
    }

    if (counts.length === 0) {
      continue;
    }

    // Sort counts descending
    counts.sort((a, b) => b.count - a.count);

    const highestCount = counts[0].count;
    const kings = counts.filter((c) => c.count === highestCount);

    if (kings.length > 1) {
      // Tied King: add King and Queen together and divide equally among tied players (floored).
      // Queen is NOT awarded.
      const pointsPerPlayer = Math.floor((kingBonus + queenBonus) / kings.length);
      for (const king of kings) {
        playerBonuses.get(king.playerId)!.push({
          goodType,
          title: 'TIED_KING',
          points: pointsPerPlayer,
        });
      }
    } else {
      // Exactly 1 King
      const soleKing = kings[0];
      playerBonuses.get(soleKing.playerId)!.push({
        goodType,
        title: 'KING',
        points: kingBonus,
      });

      // Find 2nd place (Queen) candidates with count > 0
      const remainingCandidates = counts.filter((c) => c.count < highestCount);
      if (remainingCandidates.length > 0) {
        const secondHighestCount = remainingCandidates[0].count;
        const queens = remainingCandidates.filter((c) => c.count === secondHighestCount);

        if (queens.length > 1) {
          // Tied Queen: divide Queen bonus equally among tied players (floored)
          const pointsPerQueen = Math.floor(queenBonus / queens.length);
          for (const queen of queens) {
            playerBonuses.get(queen.playerId)!.push({
              goodType,
              title: 'TIED_QUEEN',
              points: pointsPerQueen,
            });
          }
        } else {
          // Exactly 1 Queen
          playerBonuses.get(queens[0].playerId)!.push({
            goodType,
            title: 'QUEEN',
            points: queenBonus,
          });
        }
      }
    }
  }

  return playerBonuses;
}

/**
 * Calculates end-of-game scores for all players and ranks them according to tiebreaker rules:
 * 1. Highest Total Points (Gold + Goods Value + King/Queen Bonuses).
 * 2. Most Legal Goods delivered (including Royal Goods bonus counts).
 * 3. Most Contraband Goods delivered.
 * 4. Shared Victory (tied rank).
 */
export function calculateScores(players: readonly PlayerStandInput[]): PlayerScoreBreakdown[] {
  const bonusesMap = calculateKingQueenBonuses(players);

  const breakdowns: PlayerScoreBreakdown[] = players.map((player) => {
    let legalGoodsValue = 0;
    let legalGoodsCount = 0;

    for (const card of player.standLegal) {
      legalGoodsValue += card.value;
      legalGoodsCount += 1;
    }

    let contrabandValue = 0;
    let contrabandCount = 0;
    let royalGoodsValue = 0;

    const allContraband = [
      ...player.standContraband,
      ...(player.standRoyal ?? []),
    ];

    for (const card of allContraband) {
      if (card.classification === 'ROYAL') {
        royalGoodsValue += card.value;
        // Royal goods also add to legal goods count equivalent
        legalGoodsCount += card.royalBonusCount ?? 1;
      } else {
        contrabandValue += card.value;
        contrabandCount += 1;
      }
    }

    const playerBonuses = bonusesMap.get(player.id)!;
    const bonusPoints = playerBonuses.reduce((sum, b) => sum + b.points, 0);
    const goodsValue = legalGoodsValue + contrabandValue + royalGoodsValue;
    const totalScore = player.gold + goodsValue + bonusPoints;

    return {
      playerId: player.id,
      name: player.name,
      gold: player.gold,
      goodsValue,
      legalGoodsValue,
      contrabandValue,
      royalGoodsValue,
      bonusPoints,
      bonuses: playerBonuses,
      totalScore,
      legalGoodsCount,
      contrabandCount,
      rank: 1,
    };
  });

  // Sort by tiebreaker rules
  breakdowns.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (b.legalGoodsCount !== a.legalGoodsCount) {
      return b.legalGoodsCount - a.legalGoodsCount;
    }
    if (b.contrabandCount !== a.contrabandCount) {
      return b.contrabandCount - a.contrabandCount;
    }
    return 0;
  });

  // Assign ranks (handling shared ranks on exact ties across all tiebreakers)
  for (let i = 0; i < breakdowns.length; i++) {
    if (i === 0) {
      breakdowns[i].rank = 1;
    } else {
      const prev = breakdowns[i - 1];
      const curr = breakdowns[i];
      const isExactTie =
        curr.totalScore === prev.totalScore &&
        curr.legalGoodsCount === prev.legalGoodsCount &&
        curr.contrabandCount === prev.contrabandCount;

      if (isExactTie) {
        curr.rank = prev.rank;
      } else {
        curr.rank = i + 1;
      }
    }
  }

  return breakdowns;
}
