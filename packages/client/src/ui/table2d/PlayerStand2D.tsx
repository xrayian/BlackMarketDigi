import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ClientPlayer } from '../../state/gameStore';
import { useGameStore } from '../../state/gameStore';
import { GOOD_TOKENS, MOTION_PRESETS } from '../../theme/tokens';

interface PlayerStand2DProps {
  player: ClientPlayer;
  isLocalPlayer?: boolean;
  isActiveTurn?: boolean;
}

export function PlayerStand2D({
  player,
  isLocalPlayer = false,
  isActiveTurn = false,
}: PlayerStand2DProps) {
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const phase = useGameStore((s) => s.phase);
  const openOfferModal = useGameStore((s) => s.openOfferModal);
  const pendingCommitments = useGameStore((s) => s.pendingCommitments);

  const commitment = pendingCommitments.find((c) => c.targetBagOwnerId === player.id);

  // Group legal goods by goodType
  const legalCounts = useMemo(() => {
    const counts = { APPLE: 0, CHEESE: 0, BREAD: 0, CHICKEN: 0 };
    for (const card of player.standLegal) {
      if (card.goodType && counts[card.goodType as keyof typeof counts] !== undefined) {
        counts[card.goodType as keyof typeof counts]++;
      }
    }
    return counts;
  }, [player.standLegal]);

  const goodsList = [
    { key: 'APPLE' as const, token: GOOD_TOKENS.APPLE },
    { key: 'CHEESE' as const, token: GOOD_TOKENS.CHEESE },
    { key: 'BREAD' as const, token: GOOD_TOKENS.BREAD },
    { key: 'CHICKEN' as const, token: GOOD_TOKENS.CHICKEN },
  ];

  const motionTransition = reducedMotion ? MOTION_PRESETS.instant : MOTION_PRESETS.settle;

  return (
    <motion.div
      layout
      transition={motionTransition}
      className={`
        relative flex flex-col justify-between
        w-60 md:w-64 min-h-[140px] p-3 rounded-2xl
        bg-tavern-surface/95 border-2 select-none
        backdrop-blur-md shadow-xl transition-all duration-300
        ${
          isActiveTurn
            ? 'border-gold ring-4 ring-gold/40 bg-gradient-to-b from-tavern-surface via-tavern-card to-tavern-surface'
            : isLocalPlayer
            ? 'border-emerald-500/70'
            : 'border-tavern-border hover:border-gold/40'
        }
      `}
    >
      {/* Top Bar: Nameplate, Role Badges & Connectivity */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-tavern-border">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              player.connected ? 'bg-emerald' : 'bg-crimson'
            }`}
            title={player.connected ? 'Connected' : 'Disconnected'}
          />
          <span
            className={`font-display font-bold text-xs md:text-sm truncate ${
              isLocalPlayer ? 'text-emerald-300' : 'text-parchment'
            }`}
          >
            {player.name} {isLocalPlayer && '(You)'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {player.isSheriff && (
            <span className="px-2 py-0.5 rounded-full bg-gold/25 border border-gold text-gold font-display font-bold text-[10px] tracking-wide">
              ⭐ Sheriff
            </span>
          )}
          {player.isDeputy && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/25 border border-blue-400 text-blue-300 font-display font-bold text-[10px] tracking-wide">
              🛡️ Deputy
            </span>
          )}
        </div>
      </div>

      {/* Middle Content: Purse & Goods Stalls */}
      <div className="grid grid-cols-5 gap-1.5 py-2 items-center">
        {/* Coin Purse (Col 1) */}
        <div
          className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-tavern-bg/80 border border-gold/40 text-gold font-display shadow-inner"
          title={`${player.gold} Gold`}
        >
          <span className="text-sm">🪙</span>
          <span className="font-bold text-xs leading-none mt-1">{player.gold}</span>
        </div>

        {/* 4 Legal Goods Bins (Cols 2-5) */}
        {goodsList.map(({ key, token }) => {
          const count = legalCounts[key];
          return (
            <div
              key={key}
              className={`
                flex flex-col items-center justify-center p-1.5 rounded-xl border transition-colors
                ${
                  count > 0
                    ? 'bg-tavern-bg/90 border-gold/50 shadow-sm'
                    : 'bg-tavern-bg/40 border-tavern-border/50 opacity-40'
                }
              `}
              title={`${count} ${token.name} in stand`}
            >
              <span className="text-sm">{token.icon}</span>
              <span
                className={`font-bold text-xs leading-none mt-1 ${
                  count > 0 ? 'text-white' : 'text-parchment/40'
                }`}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Row: Vaulted Contraband, Royal Goods & Sealed Bag */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-tavern-border text-[11px]">
        {/* Contraband & Royal Stack Counts */}
        <div className="flex items-center gap-1.5">
          {player.standContrabandCount > 0 ? (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-crimson/80 border border-gold/50 text-white font-display font-bold shadow"
              title={`${player.standContrabandCount} Facedown Contraband`}
            >
              <span>⚜️</span>
              <span>{player.standContrabandCount}</span>
            </div>
          ) : (
            <div className="px-1.5 py-0.5 rounded text-parchment/30 text-[10px]">No Contraband</div>
          )}

          {player.standRoyalCount > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-900/90 border border-purple-400 text-purple-200 font-display font-bold shadow"
              title={`${player.standRoyalCount} Royal Goods`}
            >
              <span>👑</span>
              <span>{player.standRoyalCount}</span>
            </div>
          )}
        </div>

        {/* Sealed Merchant Bag Status & Bribe Actions */}
        <div className="flex items-center gap-1.5">
          {/* Binding Commitment Gavel Chip */}
          {commitment && (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-display font-bold text-[10px] shadow border ${
                commitment.forcedOutcome === 'FORCE_INSPECT'
                  ? 'bg-crimson/90 border-crimson text-white animate-pulse'
                  : 'bg-emerald/90 border-emerald text-white'
              }`}
              title={
                commitment.forcedOutcome === 'FORCE_INSPECT'
                  ? 'Binding Deal: Sheriff has committed to inspect this bag!'
                  : 'Binding Deal: Sheriff has committed to pass this bag unopened!'
              }
            >
              <span>🔨</span>
              <span>{commitment.forcedOutcome === 'FORCE_INSPECT' ? 'Inspect' : 'Pass'}</span>
            </div>
          )}

          {/* Make an Offer Affordance */}
          {phase === 'INSPECTION' && !player.isSheriff && !player.sealedBag?.isRevealed && (
            <button
              type="button"
              onClick={() => openOfferModal(player.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold/20 hover:bg-gold/35 border border-gold/50 text-gold hover:text-white font-display font-bold text-[10px] transition-all shadow-sm active:scale-95"
              title={`Make a bribe offer regarding ${player.name}'s bag`}
            >
              <span>🤝</span>
              <span>Offer</span>
            </button>
          )}

          {player.sealedBag ? (
            <div
              className={`
                flex items-center gap-1.5 px-2 py-0.5 rounded-md font-display text-xs font-bold border shadow
                ${
                  player.sealedBag.isRevealed
                    ? 'bg-tavern-card border-gold/40 text-gold'
                    : player.sealedBag.isSnapped
                    ? 'bg-emerald/25 border-emerald text-emerald-300'
                    : 'bg-tavern-surface border-tavern-border text-parchment/60'
                }
              `}
              title={
                player.sealedBag.isRevealed
                  ? 'Bag Inspected & Opened'
                  : player.sealedBag.isSnapped
                  ? `Bag sealed with ${player.sealedBag.cardCount} cards`
                  : 'Loading cards into bag...'
              }
            >
              <span>💼</span>
              <span>{player.sealedBag.cardCount}</span>
              <span className="text-[10px]">
                {player.sealedBag.isRevealed
                  ? '👁️'
                  : player.sealedBag.isSnapped
                  ? '🔒'
                  : '⏳'}
              </span>
            </div>
          ) : (
            <div className="text-[10px] text-parchment/40 italic">Stand Empty</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
