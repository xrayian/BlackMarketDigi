import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { StaggeredCardReveal } from './table2d/StaggeredCardReveal';
import { UnfurlingLedger } from './table2d/UnfurlingLedger';

export function InspectionOutcomeModal() {
  const lastResult = useGameStore((s) => s.lastInspectionResult);
  const clearLastResult = useGameStore((s) => s.setLastInspectionResult);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  if (!lastResult) return null;

  const isHonest = lastResult.outcome === 'HONEST';
  const isDishonest = lastResult.outcome === 'DISHONEST';

  const hasLiquidation =
    (lastResult.debtPaidGold ?? 0) > 0 ||
    (lastResult.liquidatedLegalCount ?? 0) > 0 ||
    (lastResult.liquidatedContrabandCount ?? 0) > 0 ||
    (lastResult.debtForgiven ?? 0) > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 25 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 25 }}
          transition={{
            type: 'spring',
            stiffness: reducedMotion ? 1000 : 260,
            damping: 24,
          }}
          className="relative max-w-2xl w-full bg-walnut-bg/95 border-2 border-gold/70 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-4 text-parchment text-center my-auto"
        >
          {/* Header Banner */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl filter drop-shadow">
              {isHonest ? '✨' : isDishonest ? '🚨' : '🕊️'}
            </span>
            <h2
              className={`font-display text-2xl md:text-3xl font-black tracking-wide uppercase ${
                isHonest ? 'text-emerald-400' : isDishonest ? 'text-crimson-light' : 'text-gold'
              }`}
            >
              {isHonest
                ? 'Truthful Merchant!'
                : isDishonest
                ? 'Contraband Seized!'
                : 'Bag Passed Unopened!'}
            </h2>
            <p className="text-xs text-parchment/80 font-body max-w-lg">
              {isHonest
                ? `${lastResult.sheriffName} falsely suspected an honest merchant and must pay compensation.`
                : isDishonest
                ? `${lastResult.targetPlayerName} was caught smuggling illegal contraband through the gates.`
                : `${lastResult.sheriffName} allowed ${lastResult.targetPlayerName}'s bag into Nottingham without inspection.`}
            </p>
          </div>

          {/* Staggered Card Flip Reveal Stage */}
          {lastResult.revealedCards && lastResult.revealedCards.length > 0 && (
            <div className="bg-walnut-card/80 border border-gold/30 rounded-2xl p-3 shadow-inner">
              <StaggeredCardReveal
                cards={lastResult.revealedCards}
                declaredGood={lastResult.declaredGood}
                outcome={lastResult.outcome}
              />
            </div>
          )}

          {/* Inspection Summary Stats Card */}
          <div className="bg-walnut-surface/90 border border-tavern-border rounded-2xl p-4 flex flex-col gap-2 text-xs text-left shadow-md">
            <div className="flex justify-between border-b border-tavern-border/60 pb-1.5">
              <span className="text-gold-muted font-display">Merchant:</span>
              <span className="font-bold text-white font-display">{lastResult.targetPlayerName}</span>
            </div>
            <div className="flex justify-between border-b border-tavern-border/60 pb-1.5">
              <span className="text-gold-muted font-display">Declared Wares:</span>
              <span className="font-bold text-gold font-display">
                {lastResult.declaredCount} {lastResult.declaredGood}
              </span>
            </div>
            <div className="flex justify-between border-b border-tavern-border/60 pb-1.5">
              <span className="text-gold-muted font-display">Wares Added to Stand:</span>
              <span className="font-bold text-emerald-300 font-display">
                +{lastResult.keptCardsCount} Goods
              </span>
            </div>

            {isDishonest && lastResult.confiscatedCardsCount > 0 && (
              <div className="flex justify-between border-b border-tavern-border/60 pb-1.5">
                <span className="text-gold-muted font-display">Confiscated to Discard:</span>
                <span className="font-bold text-crimson-light font-display">
                  -{lastResult.confiscatedCardsCount} Contraband / Undeclared
                </span>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <span className="text-gold-muted font-display">Gold Exchange:</span>
              <span className="text-gold font-display font-black text-sm">
                {lastResult.penaltyAmount > 0
                  ? `${lastResult.penaltyAmount} Gold ${
                      isHonest ? 'paid to Merchant' : 'paid to Sheriff'
                    }`
                  : (lastResult.debtPaidGold ?? 0) > 0
                  ? `${lastResult.debtPaidGold} Gold Bribe paid to Sheriff`
                  : 'No Gold exchanged'}
              </span>
            </div>
          </div>

          {/* Unfurling Ledger Debt Resolution Scroll */}
          {hasLiquidation && (
            <UnfurlingLedger
              debtPaidGold={lastResult.debtPaidGold}
              liquidatedLegalCount={lastResult.liquidatedLegalCount}
              liquidatedContrabandCount={lastResult.liquidatedContrabandCount}
              debtForgiven={lastResult.debtForgiven}
              debtorName={isHonest ? lastResult.sheriffName : lastResult.targetPlayerName}
              creditorName={isHonest ? lastResult.targetPlayerName : lastResult.sheriffName}
            />
          )}

          {/* Acknowledge Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => clearLastResult(null)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-gold-dark via-gold to-gold-light text-walnut-bg font-display font-black text-sm uppercase tracking-wider shadow-xl border border-gold-light cursor-pointer"
          >
            Acknowledge & Continue
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
