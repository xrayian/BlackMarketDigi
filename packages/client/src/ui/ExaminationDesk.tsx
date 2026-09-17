import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { network } from '../net/colyseus';
import { BribeScale } from './BribeScale';
import { UnsnapClasp } from './UnsnapClasp';
import { BribeNegotiationPanel } from './BribeNegotiationPanel';

export function ExaminationDesk() {
  const phase = useGameStore((s) => s.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const sheriffId = useGameStore((s) => s.sheriffId);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const playersMap = useGameStore((s) => s.players);
  const activeBribe = useGameStore((s) => s.activeBribe);

  if (phase !== 'INSPECTION') return null;

  const players = Array.from(playersMap.values());
  const localPlayer = players.find((p) => p.id === localPlayerId);
  const sheriffPlayer = players.find((p) => p.id === sheriffId || p.isSheriff);
  const activeMerchant = players.find((p) => p.id === activeMerchantId);

  if (!sheriffPlayer) return null;

  // Uninspected merchants
  const uninspectedMerchants = players.filter(
    (p) => !p.isSheriff && p.id !== sheriffPlayer.id && !p.sealedBag?.isRevealed
  );

  const isLocalSheriff = localPlayer?.id === sheriffPlayer.id;

  const handleSelectMerchant = (targetPlayerId: string) => {
    network.send('select_inspect_merchant', { targetPlayerId });
  };

  const handleInspect = (targetPlayerId: string) => {
    network.send('inspection_action', { type: 'INSPECT', targetPlayerId });
  };

  const handlePass = (targetPlayerId: string) => {
    network.send('inspection_action', { type: 'PASS', targetPlayerId });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col items-center pointer-events-none select-none">
        {/* Main Examination Desk Overlay Panel */}
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="w-full max-w-5xl bg-tavern-bg/95 border-t-2 border-gold/50 backdrop-blur-md rounded-t-3xl p-5 shadow-[0_-15px_50px_rgba(0,0,0,0.7)] pointer-events-auto flex flex-col gap-4 text-parchment"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b border-tavern-border pb-3">
            <div className="flex items-center gap-3">
              <span className="font-display font-black text-gold text-lg tracking-wider">
                ⚖️ THE EXAMINATION DESK
              </span>
              <span className="text-xs text-parchment/60 font-body">
                Sheriff: <span className="font-bold text-white">{sheriffPlayer.name}</span>
              </span>
            </div>

            {activeMerchant && (
              <div className="flex items-center gap-2 bg-tavern-card px-3 py-1 rounded-lg border border-gold/30 text-xs">
                <span className="text-gold-muted">Interrogating:</span>
                <span className="font-display font-bold text-white">{activeMerchant.name}</span>
                <span className="text-emerald-400 font-bold ml-1">
                  (Declared {activeMerchant.sealedBag?.declaredCount} {activeMerchant.sealedBag?.declaredGood})
                </span>
              </div>
            )}
          </div>

          {/* State 1: No Merchant Selected Yet */}
          {!activeMerchant ? (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              {isLocalSheriff ? (
                <>
                  <h3 className="font-display text-xl text-gold font-bold">
                    Select a Merchant to Call to the Examination Desk
                  </h3>
                  <p className="text-xs text-parchment/70 max-w-md">
                    Choose which merchant’s bag to scrutinize, weigh on the scale, and interrogate.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {uninspectedMerchants.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMerchant(m.id)}
                        className="px-5 py-2.5 rounded-xl bg-tavern-card border border-gold/40 hover:border-gold hover:bg-gold/15 text-gold-light hover:text-white font-display text-sm tracking-wider font-bold transition-all shadow-md active:scale-95"
                      >
                        💼 {m.name} ({m.sealedBag?.declaredCount} {m.sealedBag?.declaredGood})
                      </button>
                    ))}
                    {uninspectedMerchants.length === 0 && (
                      <div className="text-sm text-gold-muted italic">
                        All merchants have been examined for this round.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-display text-lg text-gold font-bold">
                    Waiting for Sheriff {sheriffPlayer.name}...
                  </h3>
                  <p className="text-xs text-parchment/70">
                    The Sheriff is inspecting declarations and selecting the next merchant to interrogate.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* State 2: Active 1-on-1 Merchant Examination */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Left Column: Bribe Balance Scale & Declaration details */}
              <div className="flex flex-col items-center justify-center bg-tavern-card/60 rounded-2xl p-4 border border-tavern-border">
                <BribeScale
                  goldAmount={activeBribe?.gold || 0}
                  standCardCount={activeBribe?.standCardIds.length || 0}
                  bagClaimCount={activeBribe?.bagCardClaims.length || 0}
                  terms={activeBribe?.nonBindingTerms}
                  isOfferPending={activeBribe?.status === 'PROPOSED'}
                />
              </div>

              {/* Right Column: Negotiation & Action Controls */}
              <div className="flex flex-col gap-4 items-center">
                <BribeNegotiationPanel sheriff={sheriffPlayer} merchant={activeMerchant} />

                {/* Sheriff Actions: Unsnap Clasp & Pass Unopened */}
                {isLocalSheriff ? (
                  <div className="w-full flex justify-center pt-2">
                    <UnsnapClasp
                      onInspect={() => handleInspect(activeMerchant.id)}
                      onPass={() => handlePass(activeMerchant.id)}
                    />
                  </div>
                ) : (
                  <div className="text-center text-xs text-gold-muted italic py-2">
                    {localPlayer?.id === activeMerchant.id
                      ? 'You are at the Examination Desk. Bluff, negotiate, or let the Sheriff decide!'
                      : `${activeMerchant.name} is negotiating with the Sheriff...`}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
