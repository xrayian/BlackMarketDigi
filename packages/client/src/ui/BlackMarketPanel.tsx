import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { network } from '../net/colyseus';
import type { ContrabandType } from '@sheriff/shared';

export function BlackMarketPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const enableBlackMarket = useGameStore((s) => s.enableBlackMarket);
  const phase = useGameStore((s) => s.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const playersMap = useGameStore((s) => s.players);

  const pepperPile = useGameStore((s) => s.blackMarketPepperPile);
  const meadPile = useGameStore((s) => s.blackMarketMeadPile);
  const silkPile = useGameStore((s) => s.blackMarketSilkPile);

  if (!enableBlackMarket) return null;

  const localPlayer = localPlayerId ? playersMap.get(localPlayerId) : undefined;
  const standContraband = localPlayer?.standContraband || [];

  const counts: Record<ContrabandType, number> = {
    PEPPER: standContraband.filter((c) => c.contrabandType === 'PEPPER').length,
    MEAD: standContraband.filter((c) => c.contrabandType === 'MEAD').length,
    SILK: standContraband.filter((c) => c.contrabandType === 'SILK').length,
    CROSSBOW: 0,
  };

  const hasClaimedThisRound = Boolean(localPlayer?.hasClaimedBlackMarketThisRound);
  const canTradePhase = phase === 'INSPECTION' || phase === 'ROUND_END';

  const handleClaim = (type: ContrabandType) => {
    network.send('claim_black_market', { contrabandType: type });
  };

  const piles: { type: ContrabandType; name: string; icon: string; pile: typeof pepperPile; color: string }[] = [
    { type: 'PEPPER', name: 'Pepper', icon: '🌶️', pile: pepperPile, color: 'text-red-400' },
    { type: 'MEAD', name: 'Mead', icon: '🍯', pile: meadPile, color: 'text-amber-400' },
    { type: 'SILK', name: 'Silk', icon: '🧣', pile: silkPile, color: 'text-purple-400' },
  ];

  const totalAvailable = pepperPile.length + meadPile.length + silkPile.length;

  return (
    <div className="fixed top-32 right-4 z-30 flex flex-col items-end pointer-events-auto">
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-tavern-bg/95 border border-gold/50 backdrop-blur-md shadow-2xl hover:border-gold hover:bg-gold/15 transition-all text-xs font-display tracking-wider uppercase font-bold text-gold cursor-pointer"
      >
        <span>🗡️ Black Market</span>
        <span className="px-1.5 py-0.5 rounded bg-gold/20 text-gold-light text-[10px]">
          {totalAvailable} Left
        </span>
      </button>

      {/* Expandable Order Board */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="mt-2 w-80 max-h-[calc(100vh-10rem)] overflow-y-auto bg-tavern-bg/95 border border-gold/60 backdrop-blur-md rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-parchment flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-tavern-border pb-2">
              <span className="font-display font-bold text-sm text-gold">Black Market Orders</span>
              <span className="text-[11px] text-parchment/60">Trade 3 matching contraband</span>
            </div>

            {hasClaimedThisRound && (
              <div className="p-2 rounded-lg bg-emerald/15 border border-emerald/40 text-emerald-300 text-xs text-center font-display">
                ✓ Claimed (1/round)
              </div>
            )}

            <div className="space-y-2.5">
              {piles.map((p) => {
                const topCard = p.pile[0];
                const matchingCount = counts[p.type];
                const canClaim = !hasClaimedThisRound && canTradePhase && matchingCount >= 3 && Boolean(topCard);

                return (
                  <div
                    key={p.type}
                    className="p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-display font-bold text-sm">
                        <span>{p.icon}</span>
                        <span className={p.color}>{p.name} Order</span>
                      </div>
                      <div className="text-[11px] text-parchment/70 mt-0.5">
                        {topCard ? (
                          <>
                            Top Value: <span className="font-bold text-gold">{topCard.pointsValue} pts</span> ({p.pile.length} left)
                          </>
                        ) : (
                          <span className="text-parchment/40 italic">Sold Out</span>
                        )}
                      </div>
                      <div className="text-[10px] text-parchment/60">
                        Stand: <span className={matchingCount >= 3 ? 'text-emerald font-bold' : 'text-parchment'}>{matchingCount}/3</span> {p.name}
                      </div>
                    </div>

                    {topCard && (
                      <button
                        type="button"
                        disabled={!canClaim}
                        onClick={() => handleClaim(p.type)}
                        className={`px-3 py-1.5 rounded-lg font-display text-xs font-bold transition-all ${
                          canClaim
                            ? 'bg-gold hover:bg-gold-light text-tavern-bg shadow-md active:scale-95'
                            : 'bg-tavern-bg border border-tavern-border text-parchment/30 cursor-not-allowed'
                        }`}
                      >
                        Trade 3
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-[10px] text-center text-parchment/50 border-t border-tavern-border pt-2">
              Scores as bonus contraband. Trades post-bag.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
