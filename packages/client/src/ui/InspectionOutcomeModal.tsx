import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';

export function InspectionOutcomeModal() {
  const lastResult = useGameStore((s) => s.lastInspectionResult);
  const clearLastResult = useGameStore((s) => s.setLastInspectionResult);

  if (!lastResult) return null;

  const isHonest = lastResult.outcome === 'HONEST';
  const isDishonest = lastResult.outcome === 'DISHONEST';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative max-w-lg w-full bg-tavern-bg/95 border-2 border-gold/60 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-parchment text-center"
        >
          {/* Header Icon & Title */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl">
              {isHonest ? '✨' : isDishonest ? '🚨' : '🕊️'}
            </span>
            <h2
              className={`font-display text-2xl font-black tracking-wide uppercase ${
                isHonest ? 'text-emerald-400' : isDishonest ? 'text-crimson' : 'text-gold'
              }`}
            >
              {isHonest
                ? 'Truthful Merchant!'
                : isDishonest
                ? 'Contraband Seized!'
                : 'Passed Unopened!'}
            </h2>
            <p className="text-xs text-parchment/70 font-body">
              {isHonest
                ? `${lastResult.sheriffName} falsely suspected an honest merchant.`
                : isDishonest
                ? `${lastResult.targetPlayerName} was caught smuggling illegal goods.`
                : `${lastResult.sheriffName} allowed ${lastResult.targetPlayerName}'s bag through.`}
            </p>
          </div>

          {/* Outcome Details Card */}
          <div className="bg-tavern-surface/90 border border-tavern-border rounded-xl p-4 flex flex-col gap-2.5 text-xs text-left">
            <div className="flex justify-between border-b border-tavern-border/60 pb-1.5">
              <span className="text-gold-muted">Merchant:</span>
              <span className="font-bold text-white font-display">{lastResult.targetPlayerName}</span>
            </div>
            <div className="flex justify-between border-b border-tavern-border/60 pb-1.5">
              <span className="text-gold-muted">Declared:</span>
              <span className="font-bold text-gold">
                {lastResult.declaredCount} {lastResult.declaredGood}
              </span>
            </div>
            <div className="flex justify-between border-b border-tavern-border/60 pb-1.5">
              <span className="text-gold-muted">Goods Stashed on Stand:</span>
              <span className="font-bold text-emerald-300">
                +{lastResult.keptCardsCount} Goods
              </span>
            </div>

            {isDishonest && lastResult.confiscatedCardsCount > 0 && (
              <div className="flex justify-between border-b border-tavern-border/60 pb-1.5">
                <span className="text-gold-muted">Confiscated to Discard:</span>
                <span className="font-bold text-red-400">
                  -{lastResult.confiscatedCardsCount} Contraband / Undeclared
                </span>
              </div>
            )}

            <div className="flex justify-between pt-1 font-bold">
              <span className="text-gold-muted">Penalty / Gold Exchange:</span>
              <span className="text-gold font-display text-sm">
                {lastResult.penaltyAmount > 0
                  ? `${lastResult.penaltyAmount} Gold ${isHonest ? 'paid to Merchant' : 'paid to Sheriff'}`
                  : lastResult.debtPaidGold > 0
                  ? `${lastResult.debtPaidGold} Gold Bribe paid to Sheriff`
                  : 'No Penalty'}
              </span>
            </div>
          </div>

          {/* Guided 4-Step Debt Resolution Details (if debt liquidation occurred) */}
          {(lastResult.debtForgiven > 0 || (lastResult.liquidatedLegalCount ?? 0) > 0 || (lastResult.liquidatedContrabandCount ?? 0) > 0) && (
            <div className="bg-amber-950/30 border border-amber-500/50 rounded-xl p-3 text-left flex flex-col gap-1.5 text-xs">
              <span className="font-display font-bold text-amber-300">
                ⚖️ 4-Step Debt Liquidation Order Applied:
              </span>
              <div className="text-[11px] text-parchment/80 space-y-1">
                <div>• Step 1: Liquidated all liquid Gold ({lastResult.debtPaidGold} Gold).</div>
                {(lastResult.liquidatedLegalCount ?? 0) > 0 && (
                  <div>• Step 2: Liquidated {lastResult.liquidatedLegalCount} Legal Goods from Stand.</div>
                )}
                {(lastResult.liquidatedContrabandCount ?? 0) > 0 && (
                  <div>• Step 3: Liquidated {lastResult.liquidatedContrabandCount} Contraband from Stand.</div>
                )}
                {lastResult.debtForgiven > 0 && (
                  <div className="text-amber-200 font-bold">
                    • Step 4: Stand completely exhausted — {lastResult.debtForgiven} remaining debt forgiven!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            type="button"
            onClick={() => clearLastResult(null)}
            className="w-full py-2.5 rounded-xl btn-gold font-display text-xs font-bold uppercase tracking-wider"
          >
            Acknowledge & Continue
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
