import { motion } from 'framer-motion';
import type { RevealedCardInfo } from '@sheriff/shared';
import { useGameStore } from '../../state/gameStore';
import { getCardColor, getCardEmoji } from '../CardDisplay';

export interface StaggeredCardRevealProps {
  cards: RevealedCardInfo[];
  declaredGood: string;
  outcome: 'PASS' | 'HONEST' | 'DISHONEST';
}

export function StaggeredCardReveal({
  cards,
  declaredGood,
  outcome,
}: StaggeredCardRevealProps) {
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2 w-full select-none py-1">
      <span className="font-display font-bold text-xs uppercase tracking-wider text-gold-light">
        Revealed Bag Contents ({cards.length} Goods)
      </span>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {cards.map((card, index) => {
          const colors = getCardColor(card as any);
          const emoji = getCardEmoji(card as any);
          const isLegal = card.classification === 'LEGAL';
          const isDeclared = isLegal && card.goodType === declaredGood;

          // Determine fate and halo glow
          const isKept = outcome === 'PASS' || (outcome === 'HONEST' && isLegal) || (outcome === 'DISHONEST' && isDeclared);
          const haloClass = isLegal
            ? 'shadow-[0_0_22px_rgba(5,150,105,0.7)] border-emerald-400'
            : isKept
            ? 'shadow-[0_0_22px_rgba(168,85,247,0.7)] border-purple-400'
            : 'shadow-[0_0_22px_rgba(239,68,68,0.85)] border-red-500';

          const delay = reducedMotion ? 0 : index * 0.15;

          return (
            <motion.div
              key={card.id || index}
              initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              transition={{
                delay,
                duration: reducedMotion ? 0.05 : 0.35,
                ease: 'easeOut',
              }}
              className="flex flex-col items-center gap-1.5"
            >
              {/* Card Face with Glowing Classification Halo */}
              <div
                className={`
                  relative flex flex-col justify-between w-[76px] h-[106px] rounded-xl border-2 p-1.5
                  ${colors.bg} ${haloClass} text-parchment overflow-hidden transition-all
                `}
              >
                {/* Classification Badge */}
                <div className="flex items-center justify-between text-[9px] font-display font-bold">
                  <span className="bg-black/60 px-1 py-0.5 rounded border border-white/20">
                    {card.classification === 'ROYAL'
                      ? '👑'
                      : card.classification === 'CONTRABAND'
                      ? '⚜️'
                      : '⚖️'}
                  </span>
                  <span className="text-[8px] text-parchment/60 uppercase">
                    {card.classification[0]}
                  </span>
                </div>

                <div className="text-xl text-center leading-none my-0.5">{emoji}</div>

                <div className="font-display text-[10px] font-bold text-center leading-tight break-words px-0.5">
                  {card.name}
                </div>

                <div className="flex items-center justify-between text-[8px] text-parchment/80 border-t border-white/20 pt-0.5 font-display">
                  <span>🪙 {card.value}</span>
                  <span className="text-red-300">⚠️ {card.penalty}</span>
                </div>
              </div>

              {/* Status Chip (Kept vs Confiscated) */}
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.18 }}
                className={`text-[9px] font-display font-bold px-1.5 py-0.5 rounded-full border leading-tight ${
                  isKept
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                    : 'bg-red-950/80 text-red-300 border-red-500'
                }`}
              >
                {isKept ? '✓ Kept' : '✕ Seized'}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
