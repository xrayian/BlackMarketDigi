import { motion } from 'framer-motion';
import { useGameStore, type ClientNegotiationOffer } from '../../state/gameStore';
import { network } from '../../net/colyseus';
import { MOTION_PRESETS } from '../../theme/tokens';

export function NegotiationLedger() {
  const negotiationFeed = useGameStore((s) => s.negotiationFeed);
  const negotiationSequence = useGameStore((s) => s.negotiationSequence);
  const pendingCommitments = useGameStore((s) => s.pendingCommitments);
  const reconciliationRecords = useGameStore((s) => s.reconciliationRecords);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const sheriffId = useGameStore((s) => s.sheriffId);
  const deputyIds = useGameStore((s) => s.deputyIds);
  const enableDeputies = useGameStore((s) => s.enableDeputies);
  const playersMap = useGameStore((s) => s.players);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const isAuthority =
    localPlayerId === sheriffId || (enableDeputies && deputyIds.includes(localPlayerId || ''));

  const handleAccept = (offer: ClientNegotiationOffer) => {
    network.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: negotiationSequence,
    });
  };

  const handleDecline = (offerId: string) => {
    network.send('negotiation_decline', { offerId });
  };

  const handleWithdraw = (offerId: string) => {
    network.send('negotiation_withdraw', { offerId });
  };

  const transition = reducedMotion ? MOTION_PRESETS.instant : MOTION_PRESETS.settle;

  return (
    <div className="flex flex-col gap-3 font-display text-xs">
      {/* Active Commitments Header Chip */}
      {pendingCommitments.length > 0 && (
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-gold/15 border border-gold/40 text-gold shadow-sm">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
            <span>🔨</span>
            <span>Binding Table Commitments:</span>
          </div>
          <div className="space-y-1">
            {pendingCommitments.map((c) => {
              const target = playersMap.get(c.targetBagOwnerId)?.name || 'Merchant';
              return (
                <div key={c.sourceOfferId} className="flex items-center justify-between text-[11px] text-white">
                  <span>{target}'s Bag:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      c.forcedOutcome === 'FORCE_INSPECT'
                        ? 'bg-crimson/80 text-white'
                        : 'bg-emerald/80 text-white'
                    }`}
                  >
                    {c.forcedOutcome === 'FORCE_INSPECT' ? 'INSPECT' : 'PASS'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reconciliation Records Summary */}
      {reconciliationRecords.length > 0 && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-tavern-surface/90 border border-emerald-500/40 text-emerald-300">
          <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
            <span>⚖️</span>
            <span>Resolution Ledger:</span>
          </span>
          <div className="space-y-1 text-[11px] text-parchment/90">
            {reconciliationRecords.map((r, i) => (
              <div key={i} className="border-t border-tavern-border/50 pt-1">
                <span className="font-bold text-gold">
                  {playersMap.get(r.targetBagOwnerId)?.name}'s Bag:{' '}
                </span>
                <span>{r.summaryText}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Offer Feed */}
      {negotiationFeed.length === 0 ? (
        <div className="p-6 text-center text-parchment/40 italic">
          No negotiation offers proposed yet. Merchants can propose terms at any time.
        </div>
      ) : (
        <div className="space-y-2.5">
          {[...negotiationFeed].reverse().map((offer) => {
            const fromPlayer = playersMap.get(offer.fromPlayerId)?.name || 'Merchant';
            const targetPlayer = playersMap.get(offer.targetBagOwnerId)?.name || 'Merchant';
            const isTargetOwnBag = offer.fromPlayerId === offer.targetBagOwnerId;
            const isOfferer = offer.fromPlayerId === localPlayerId;
            const isOpen = offer.status === 'OPEN';
            const isAccepted = offer.status === 'ACCEPTED';
            const isFailed =
              offer.status === 'DECLINED' ||
              offer.status === 'WITHDRAWN' ||
              offer.status === 'VOIDED';

            const isOfferFromAuthority =
              offer.fromPlayerId === sheriffId ||
              (enableDeputies && deputyIds.includes(offer.fromPlayerId));
            const canRespond = isOfferFromAuthority ? !isOfferer : isAuthority && !isOfferer;

            // Construct summary
            const parts: string[] = [];
            if (offer.goldOffered > 0) parts.push(`${offer.goldOffered} Gold`);
            if (offer.standLegalGoodsOffered.length > 0)
              parts.push(`${offer.standLegalGoodsOffered.length} Legal Goods`);
            if (offer.standContrabandCountOffered > 0)
              parts.push(`${offer.standContrabandCountOffered} Secret Contraband`);
            if (offer.bagGoodsCountOffered > 0)
              parts.push(`${offer.bagGoodsCountOffered} Bag Cards`);

            const summaryText = parts.length > 0 ? parts.join(' + ') : 'Non-material terms';

            return (
              <motion.div
                key={offer.id}
                layout
                transition={transition}
                className={`relative p-3 rounded-2xl border transition-all ${
                  isAccepted
                    ? 'bg-emerald/15 border-emerald-500/70 shadow-md'
                    : isFailed
                    ? 'bg-tavern-surface/30 border-tavern-border/40 opacity-50'
                    : 'bg-tavern-surface/80 border-tavern-border hover:border-gold/40 shadow-sm'
                }`}
              >
                {/* DEAL Stamp Flourish */}
                {isAccepted && (
                  <div className="absolute top-2 right-2 border-2 border-emerald-400 text-emerald-400 px-2 py-0.5 rounded font-black text-xs uppercase tracking-widest rotate-6 select-none">
                    DEAL
                  </div>
                )}

                {/* Top Row: From → Target / Authority + Status */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                    <span className={isOfferer ? 'text-emerald-300' : 'text-gold'}>
                      {fromPlayer}
                    </span>
                    <span className="text-parchment/40">→</span>
                    <span className="text-parchment/80">
                      {offer.fromPlayerId === sheriffId
                        ? targetPlayer
                        : enableDeputies
                        ? 'Deputies'
                        : 'Sheriff'}
                    </span>
                  </div>

                  {!isAccepted && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isOpen
                          ? 'bg-gold/20 text-gold border border-gold/40'
                          : 'bg-tavern-border text-parchment/40'
                      }`}
                    >
                      {offer.status}
                    </span>
                  )}
                </div>

                {/* Target Bag & Purpose Badge */}
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {offer.intendedOutcome === 'FORCE_INSPECT' || offer.intendedOutcome === 'INSPECT' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-crimson/40 border border-red-500 text-[10px] text-red-100 font-bold">
                      <span>🔨</span>
                      <span>Inspect {targetPlayer}'s Bag</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald/40 border border-emerald-500 text-[10px] text-emerald-100 font-bold">
                      <span>🛡️</span>
                      <span>Pass {isTargetOwnBag ? 'own bag' : `${targetPlayer}'s bag`}</span>
                    </span>
                  )}
                </div>

                {/* Terms Summary */}
                <div
                  className={`font-semibold text-xs leading-relaxed ${
                    isFailed ? 'line-through text-parchment/40' : 'text-white'
                  }`}
                >
                  {summaryText}
                </div>

                {/* Future Favor Text (Non-Binding Flavor) */}
                {offer.futureFavorText && (
                  <div className="mt-1 pt-1 border-t border-tavern-border/40 text-[10px] text-parchment/60 italic flex items-center justify-between">
                    <span>"{offer.futureFavorText}"</span>
                    <span className="text-gold/70 font-normal shrink-0 ml-1">(not binding)</span>
                  </div>
                )}

                {/* Action Controls for Authority (Accept/Decline) & Offerer (Withdraw) */}
                {isOpen && (
                  <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-tavern-border/50">
                    {canRespond && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDecline(offer.id)}
                          className="h-7 px-2.5 rounded-lg bg-crimson/30 hover:bg-crimson/50 text-crimson-200 border border-crimson/50 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center justify-center"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAccept(offer)}
                          className={`h-7 px-3 rounded-lg text-[11px] font-bold transition-all border shadow-sm cursor-pointer inline-flex items-center justify-center gap-1 ${
                            offer.intendedOutcome === 'FORCE_INSPECT' || offer.intendedOutcome === 'INSPECT'
                              ? 'bg-crimson/40 hover:bg-crimson/60 text-red-100 border-red-400'
                              : 'bg-emerald/40 hover:bg-emerald/60 text-emerald-100 border-emerald-400'
                          }`}
                        >
                          {offer.intendedOutcome === 'FORCE_INSPECT' || offer.intendedOutcome === 'INSPECT'
                            ? '🔨 Accept & Inspect'
                            : '🛡️ Accept & Pass'}
                        </button>
                      </>
                    )}

                    {isOfferer && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(offer.id)}
                        className="h-7 px-2.5 rounded-lg bg-tavern-surface hover:bg-tavern-card text-parchment/60 hover:text-white border border-tavern-border text-[11px] font-bold transition-all cursor-pointer inline-flex items-center justify-center"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
