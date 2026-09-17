import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { MOTION_PRESETS } from '../theme/tokens';

export function NegotiationFeedback() {
  const crossBagToast = useGameStore((s) => s.crossBagToast);
  const setCrossBagToast = useGameStore((s) => s.setCrossBagToast);
  const dealStruckBanner = useGameStore((s) => s.dealStruckBanner);
  const setDealStruckBanner = useGameStore((s) => s.setDealStruckBanner);
  const playersMap = useGameStore((s) => s.players);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const transition = reducedMotion ? MOTION_PRESETS.instant : MOTION_PRESETS.snap;

  return (
    <>
      {/* 1. Cross-Bag Negotiation Toast (Non-blocking table toast) */}
      <AnimatePresence>
        {crossBagToast && (
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={transition}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-tavern-surface/95 border-2 border-gold/70 text-parchment shadow-2xl backdrop-blur-md max-w-md w-[90vw]"
          >
            <span className="text-xl">↗️</span>
            <div className="flex-1 text-xs font-display leading-tight">
              <span className="font-bold text-gold">{crossBagToast.fromPlayerName}</span>{' '}
              offered{' '}
              <span className="font-bold text-white">{crossBagToast.goldOffered} Gold</span>{' '}
              to{' '}
              <span className="font-bold text-crimson-300">
                {crossBagToast.intendedOutcome === 'FORCE_INSPECT' ? 'guarantee inspection of' : 'guarantee safe pass for'}{' '}
                {crossBagToast.targetPlayerName}'s bag
              </span>
              !
            </div>
            <button
              type="button"
              onClick={() => setCrossBagToast(null)}
              className="text-parchment/60 hover:text-white font-bold text-sm px-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DEAL Struck Stamp Banner Flourish */}
      <AnimatePresence>
        {dealStruckBanner && (
          <motion.div
            initial={{ scale: 2, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={transition}
            onClick={() => setDealStruckBanner(null)}
            className="fixed inset-0 pointer-events-auto z-50 flex items-center justify-center cursor-pointer"
          >
            <div className="bg-gradient-to-br from-crimson/95 via-amber-900/95 to-tavern-bg/95 border-4 border-gold px-8 py-5 rounded-3xl shadow-[0_0_50px_rgba(217,119,6,0.6)] backdrop-blur-lg flex flex-col items-center text-center">
              <span className="font-display font-black text-5xl md:text-6xl text-gold tracking-widest drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] uppercase">
                DEAL!
              </span>
              <div className="text-xs md:text-sm font-display font-bold text-parchment mt-2">
                The Sheriff has locked in terms with{' '}
                <span className="text-gold">
                  {playersMap.get(dealStruckBanner.fromPlayerId)?.name || 'Merchant'}
                </span>
                !
              </div>
              <div className="text-[11px] font-display text-emerald-300 uppercase tracking-wider mt-1">
                Outcome:{' '}
                {dealStruckBanner.forcedOutcome === 'FORCE_INSPECT'
                  ? '🔨 Guaranteed Inspection'
                  : '🛡️ Guaranteed Pass'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
