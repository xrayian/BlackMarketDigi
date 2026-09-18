import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { soundManager } from '../audio/soundManager';

export interface BribeScaleProps {
  goldAmount: number;
  standCardCount: number;
  bagClaimCount: number;
  terms?: string;
  isOfferPending: boolean;
  onAddChip?: (type: 'GOLD_1' | 'GOLD_5' | 'GOLD_10') => void;
}

export function BribeScale({
  goldAmount,
  standCardCount,
  bagClaimCount,
  terms,
  isOfferPending,
}: BribeScaleProps) {
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  // Total weight: 1 gold = 1 unit, stand card = 3 units, bag claim = 3 units
  const totalWeight = isOfferPending ? goldAmount + standCardCount * 3 + bagClaimCount * 3 : 0;

  // Beam tilts left proportionally (negative rotate tilts left pan down)
  const tiltAngle = isOfferPending ? Math.min(Math.max((totalWeight / 18) * 14, 0), 16) : 0;

  const prevWeight = useRef(totalWeight);

  useEffect(() => {
    if (prevWeight.current !== totalWeight) {
      if (totalWeight > 0) soundManager.playScaleTip();
      prevWeight.current = totalWeight;
    }
  }, [totalWeight]);

  const springTransition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 140, damping: 15 };

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-md py-2">
      {/* Title Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">⚖️</span>
        <span className="font-display font-bold text-xs uppercase tracking-widest text-gold">
          The Merchant's Scale of Tribute
        </span>
      </div>

      {/* 2D Illustrated Scale Rig */}
      <div className="relative w-72 h-44 flex justify-center items-end">
        {/* Ornate Walnut & Brass Base Pedestal */}
        <div className="w-24 h-7 bg-gradient-to-t from-walnut-border via-gold-dark to-gold rounded-t-xl shadow-xl border border-gold-light/50 z-10 flex items-center justify-center">
          <div className="w-16 h-2 bg-walnut-bg/70 rounded-full border border-gold/30" />
        </div>

        {/* Vertical Center Column */}
        <div className="absolute bottom-7 w-3.5 h-28 bg-gradient-to-r from-walnut-card via-gold-dark to-walnut-card border-x border-gold/50 shadow-md flex justify-center">
          {/* Degree Markings */}
          <div className="w-full flex flex-col justify-between py-2 items-center opacity-40">
            <div className="w-2 h-[1px] bg-gold" />
            <div className="w-3 h-[1px] bg-gold" />
            <div className="w-2 h-[1px] bg-gold" />
          </div>
        </div>

        {/* Central Pivot Needle & Pin */}
        <div className="absolute top-8 w-6 h-6 rounded-full bg-gold-light border-2 border-gold-dark shadow-lg z-30 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-walnut-bg border border-gold" />
        </div>

        {/* Plumb-line Needle pointing to center */}
        <motion.div
          animate={{ rotate: -tiltAngle }}
          transition={springTransition}
          className="absolute top-11 w-1 h-8 bg-crimson rounded-b-full shadow origin-top z-20"
        />

        {/* Tilting Balance Beam */}
        <motion.div
          animate={{ rotate: -tiltAngle }}
          transition={springTransition}
          className="absolute top-10 w-64 h-2.5 bg-gradient-to-r from-gold-dark via-gold-light to-gold-dark rounded-full shadow-xl origin-center"
        >
          {/* LEFT PAN: Merchant's Offer */}
          <div className="absolute -left-2 top-2.5 flex flex-col items-center">
            {/* Hanging Chains */}
            <div className="flex gap-4">
              <div className="w-[1.5px] h-14 bg-gradient-to-b from-gold to-gold-dark shadow-sm" />
              <div className="w-[1.5px] h-14 bg-gradient-to-b from-gold to-gold-dark shadow-sm" />
            </div>

            {/* Weighing Pan Plate */}
            <motion.div
              animate={{ rotate: tiltAngle }}
              transition={springTransition}
              className={`
                w-24 min-h-[32px] -mt-1 rounded-b-3xl border-2 flex flex-col items-center justify-center p-1.5 shadow-xl transition-colors
                ${
                  totalWeight > 0
                    ? 'bg-gradient-to-b from-amber-900/90 to-walnut-card border-gold ring-2 ring-gold/40 shadow-[0_0_20px_rgba(212,168,75,0.4)]'
                    : 'bg-walnut-card/80 border-tavern-border'
                }
              `}
            >
              {totalWeight > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1 text-xs font-display font-bold">
                  {goldAmount > 0 && (
                    <span className="flex items-center gap-0.5 bg-gold/20 text-gold px-1.5 py-0.5 rounded border border-gold/40 text-[11px]">
                      <span>🪙</span>
                      <span>{goldAmount}g</span>
                    </span>
                  )}
                  {standCardCount > 0 && (
                    <span className="flex items-center gap-0.5 bg-emerald/20 text-emerald px-1.5 py-0.5 rounded border border-emerald/40 text-[10px]">
                      <span>🃏</span>
                      <span>{standCardCount}</span>
                    </span>
                  )}
                  {bagClaimCount > 0 && (
                    <span className="flex items-center gap-0.5 bg-contraband/20 text-contraband-light px-1.5 py-0.5 rounded border border-contraband/40 text-[10px]">
                      <span>📦</span>
                      <span>{bagClaimCount}</span>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-display text-parchment/40 italic">Empty Pan</span>
              )}
            </motion.div>
            <span className="text-[10px] font-display font-bold text-gold mt-1">Merchant Tribute</span>
          </div>

          {/* RIGHT PAN: Sheriff's Incorruptibility Weight */}
          <div className="absolute -right-2 top-2.5 flex flex-col items-center">
            {/* Hanging Chains */}
            <div className="flex gap-4">
              <div className="w-[1.5px] h-14 bg-gradient-to-b from-gold to-gold-dark shadow-sm" />
              <div className="w-[1.5px] h-14 bg-gradient-to-b from-gold to-gold-dark shadow-sm" />
            </div>

            {/* Weighing Pan Plate */}
            <motion.div
              animate={{ rotate: tiltAngle }}
              transition={springTransition}
              className="w-24 min-h-[32px] -mt-1 rounded-b-3xl bg-walnut-card/90 border-2 border-tavern-border shadow-xl flex items-center justify-center p-1.5"
            >
              <span className="text-[11px] font-display text-parchment/50 font-bold flex items-center gap-1">
                <span>⭐</span>
                <span>Sheriff</span>
              </span>
            </motion.div>
            <span className="text-[10px] font-display text-parchment/40 mt-1">Crown Law</span>
          </div>
        </motion.div>
      </div>

      {/* Live Scale Weight / Feedback Banner */}
      <div className="mt-2 text-center text-xs font-body w-full">
        {isOfferPending ? (
          <div className="bg-walnut-card/90 border border-gold/40 px-3 py-1.5 rounded-xl shadow-md flex flex-col items-center">
            <span className="text-gold font-display font-black text-xs">
              Offer Weight: {totalWeight} pts
              {goldAmount > 0 ? ` (${goldAmount}g)` : ''}
              {standCardCount > 0 ? ` +${standCardCount} Stand Goods` : ''}
              {bagClaimCount > 0 ? ` +${bagClaimCount} Bag Goods` : ''}
            </span>
            {terms && (
              <span className="text-[11px] text-parchment/80 italic mt-0.5 max-w-sm truncate">
                "{terms}"
              </span>
            )}
          </div>
        ) : (
          <span className="text-parchment/50 italic text-[11px]">
            No tribute currently on the scale. The balance rests level.
          </span>
        )}
      </div>
    </div>
  );
}
