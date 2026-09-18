import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { network } from '../net/colyseus';
import { BribeScale } from './BribeScale';
import { UnsnapClasp } from './UnsnapClasp';
import { BribeNegotiationPanel } from './BribeNegotiationPanel';
import { GOOD_TOKENS } from '../theme/tokens';
import type { GoodType } from '@sheriff/shared';

export function ExaminationDesk() {
  const phase = useGameStore((s) => s.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const sheriffId = useGameStore((s) => s.sheriffId);
  const deputyIds = useGameStore((s) => s.deputyIds);
  const enableDeputies = useGameStore((s) => s.enableDeputies);
  const bootyTile = useGameStore((s) => s.bootyTile);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const playersMap = useGameStore((s) => s.players);
  const activeBribe = useGameStore((s) => s.activeBribe);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const bribeOffers = useGameStore((s) => s.bribeOffers);
  const isDeskMinimized = useGameStore((s) => s.isDeskMinimized);
  const setIsDeskMinimized = useGameStore((s) => s.setIsDeskMinimized);
  const pendingCommitments = useGameStore((s) => s.pendingCommitments);
  const negotiationFeed = useGameStore((s) => s.negotiationFeed);
  const negotiationSequence = useGameStore((s) => s.negotiationSequence);

  if (phase !== 'INSPECTION') return null;

  const players = Array.from(playersMap.values());
  const localPlayer = players.find((p) => p.id === localPlayerId);
  const sheriffPlayer = players.find((p) => p.id === sheriffId || p.isSheriff);
  const activeMerchant = players.find((p) => p.id === activeMerchantId);
  const activeCommitment = pendingCommitments.find(
    (c) => c.targetBagOwnerId === activeMerchant?.id
  );
  const isAuthority =
    localPlayerId === sheriffId || (enableDeputies && deputyIds.includes(localPlayerId || ''));

  const openBribesForThisMerchant = activeMerchant
    ? negotiationFeed.filter(
        (o) => o.targetBagOwnerId === activeMerchant.id && o.status === 'OPEN'
      )
    : [];
  const latestFeedOffer = openBribesForThisMerchant[openBribesForThisMerchant.length - 1];
  const merchantScaleOffer =
    activeMerchant &&
    activeBribe &&
    (activeBribe.fromPlayerId === activeMerchant.id || activeBribe.toPlayerId === activeMerchant.id) &&
    activeBribe.status === 'PROPOSED'
      ? activeBribe
      : latestFeedOffer
      ? {
          gold: latestFeedOffer.goldOffered,
          standCardIds: latestFeedOffer.standLegalGoodsOffered,
          bagCardClaims: [] as string[],
          nonBindingTerms: latestFeedOffer.futureFavorText,
          status: 'PROPOSED',
        }
      : null;

  const handleAcceptOffer = (offer: any) => {
    network.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: negotiationSequence,
    });
  };

  const handleDeclineOffer = (offerId: string) => {
    network.send('negotiation_decline', { offerId });
  };

  const handleWithdrawOffer = (offerId: string) => {
    network.send('negotiation_withdraw', { offerId });
  };

  if (isDeskMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <button
          type="button"
          onClick={() => setIsDeskMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-tavern-surface/95 border-2 border-gold shadow-2xl text-gold font-display font-bold text-xs backdrop-blur-md hover:scale-105 transition-all cursor-pointer"
        >
          <span>⚖️ Desk: {activeMerchant ? activeMerchant.name : 'Select Bag'}</span>
          {activeCommitment && (
            <span className="px-1.5 py-0.5 rounded bg-crimson text-white text-[10px]">
              🔨 {activeCommitment.forcedOutcome}
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-gold text-tavern-bg text-[10px] font-black uppercase">
            Expand
          </span>
        </button>
      </motion.div>
    );
  }

  if (!sheriffPlayer) return null;

  const deputyPlayers = players.filter((p) => deputyIds.includes(p.id));
  const isLocalSheriff = localPlayer?.id === sheriffPlayer.id;
  const isLocalDeputy = deputyIds.includes(localPlayerId || '');
  const canInspect = enableDeputies ? isLocalDeputy : isLocalSheriff;

  // Uninspected merchants
  const uninspectedMerchants = players.filter((p) => {
    if (enableDeputies) {
      return !deputyIds.includes(p.id) && !p.sealedBag?.isRevealed;
    }
    return !p.isSheriff && p.id !== sheriffPlayer.id && !p.sealedBag?.isRevealed;
  });

  const handleSelectMerchant = (targetPlayerId: string) => {
    network.send('select_inspect_merchant', { targetPlayerId });
  };

  const handleInspect = (targetPlayerId: string) => {
    network.send('inspection_action', { type: 'INSPECT', targetPlayerId });
  };

  const handlePass = (targetPlayerId: string) => {
    network.send('inspection_action', { type: 'PASS', targetPlayerId });
  };

  const handleDeputyAction = (
    type: 'JOINT_PASS' | 'JOINT_INSPECT' | 'SOLO_PASS' | 'SOLO_INSPECT',
    targetPlayerId: string
  ) => {
    if (!localPlayerId) return;
    network.send('deputy_inspection', {
      type,
      deputyId: localPlayerId,
      targetPlayerId,
    });
  };

  const declaredGoodToken = activeMerchant?.sealedBag?.declaredGood
    ? GOOD_TOKENS[activeMerchant.sealedBag.declaredGood as GoodType]
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-30 flex items-center justify-center p-3 md:p-6 pointer-events-none">
        {/* Soft backdrop scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsDeskMinimized(true)}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
          title="Click backdrop to inspect the table"
        />

        {/* Focused Panel (70% viewport width) */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: reducedMotion ? 0.05 : 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-5xl lg:w-[70vw] max-h-[90vh] bg-walnut-bg/95 border-2 border-gold/70 rounded-3xl p-4 md:p-6 text-parchment select-none overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-md pointer-events-auto flex flex-col justify-between gap-3"
        >
          {/* Top Header Bar */}
          <div className="flex flex-col gap-2.5 border-b border-gold/40 pb-3 shrink-0">
            {/* Row 1: Title, View Table, Authority Badge */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚖️</span>
                <span className="font-display font-black text-gold text-lg md:text-xl tracking-wider uppercase">
                  Examination Desk
                </span>
                <button
                  type="button"
                  onClick={() => setIsDeskMinimized(true)}
                  className="h-7 px-2.5 rounded-lg bg-walnut-card hover:bg-gold/20 border border-gold/40 text-gold text-xs font-display font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1"
                  title="Minimize Examination Desk to inspect the Table"
                >
                  <span>👁️</span>
                  <span>View Table</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {enableDeputies ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-walnut-card px-2.5 py-1 rounded-lg border border-gold/30 font-display">
                      🛡️ Deputies:{' '}
                      <span className="font-bold text-white">
                        {deputyPlayers.map((d) => d.name).join(' & ')}
                      </span>
                    </span>
                    {bootyTile && (
                      <span className="flex items-center gap-1.5 bg-walnut-card px-2.5 py-1 rounded-lg border border-gold/40 text-xs text-gold font-display font-bold">
                        <span>💰 Communal Booty:</span>
                        <span className="text-white">{bootyTile.gold}g</span>
                        {bootyTile.goodsCount > 0 && <span>({bootyTile.goodsCount} goods)</span>}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs bg-walnut-card px-2.5 py-1 rounded-lg border border-gold/30 font-display">
                    ⭐ Sheriff: <span className="font-bold text-white">{sheriffPlayer.name}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Active Interrogating Banner & Merchant Selection Queue */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {activeMerchant && (
                <div className="flex items-center gap-2 bg-walnut-card px-3 py-1 rounded-xl border border-gold/40 text-xs font-display">
                  <span className="text-gold-muted uppercase tracking-wider">Interrogating:</span>
                  <span className="font-bold text-white">{activeMerchant.name}</span>
                  {declaredGoodToken && (
                    <span className="flex items-center gap-1 text-gold ml-1">
                      <span>(Declared {activeMerchant.sealedBag?.declaredCount}</span>
                      <span>{declaredGoodToken.icon}</span>
                      <span>{declaredGoodToken.name})</span>
                    </span>
                  )}
                </div>
              )}

              {canInspect && uninspectedMerchants.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2.5 bg-walnut-bg/90 border border-gold/40 rounded-xl max-w-full">
                  <span className="text-[10px] font-display uppercase tracking-widest text-gold-muted whitespace-nowrap">
                    Merchants:
                  </span>
                  {uninspectedMerchants.map((m) => {
                    const feedOffer = negotiationFeed.find(
                      (o) => o.targetBagOwnerId === m.id && o.status === 'OPEN'
                    );
                    const legacyOffer = bribeOffers.find(
                      (b) => b.fromPlayerId === m.id || b.toPlayerId === m.id
                    );
                    const offerGold = feedOffer ? feedOffer.goldOffered : legacyOffer?.gold;
                    const isSelected = activeMerchant?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMerchant(m.id)}
                        className={`h-7 px-2.5 rounded-lg text-xs font-display inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
                          isSelected
                            ? 'bg-gold/30 text-walnut-bg border-gold font-bold shadow-md'
                            : 'bg-walnut-card text-parchment hover:bg-gold/10 border-tavern-border'
                        }`}
                      >
                        <span>💼 {m.name}</span>
                        {offerGold !== undefined ? (
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                              isSelected ? 'bg-walnut-bg text-gold' : 'bg-gold/20 text-gold-light'
                            }`}
                          >
                            🪙 {offerGold}g
                          </span>
                        ) : (
                          <span className="text-[10px] text-parchment/40 italic">no bribe</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        {/* State 1: No Merchant Selected Yet */}
        {!activeMerchant ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 gap-5 text-center max-w-2xl mx-auto">
            {canInspect ? (
              <>
                <div className="w-16 h-16 rounded-full bg-walnut-card border-2 border-gold flex items-center justify-center text-3xl shadow-xl">
                  📜
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-2xl text-gold font-black tracking-wide uppercase">
                    Call Merchant
                  </h3>
                  <p className="text-xs md:text-sm text-parchment/80 font-body">
                    Select a merchant to inspect or pass.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 mt-2 w-full">
                  {uninspectedMerchants.map((m) => {
                    const feedOffer = negotiationFeed.find(
                      (o) => o.targetBagOwnerId === m.id && o.status === 'OPEN'
                    );
                    const legacyOffer = bribeOffers.find(
                      (b) => b.fromPlayerId === m.id || b.toPlayerId === m.id
                    );
                    const offerGold = feedOffer ? feedOffer.goldOffered : legacyOffer?.gold;
                    return (
                      <motion.button
                        key={m.id}
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleSelectMerchant(m.id)}
                        className="px-5 py-3 rounded-2xl bg-walnut-card hover:bg-gold/20 border-2 border-gold/40 hover:border-gold text-gold-light font-display text-sm tracking-wider font-bold transition-all shadow-xl cursor-pointer flex items-center gap-2.5"
                      >
                        <span>💼</span>
                        <span>{m.name}</span>
                        <span className="text-xs text-parchment/70 font-normal">
                          ({m.sealedBag?.declaredCount} {m.sealedBag?.declaredGood})
                        </span>
                        {offerGold !== undefined && (
                          <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-xs font-bold border border-gold/40">
                            🪙 {offerGold}g Offered
                          </span>
                        )}
                      </motion.button>
                    );
                  })}

                  {uninspectedMerchants.length === 0 && (
                    <div className="text-sm font-display text-gold-muted italic py-4">
                      All bags resolved. Concluding phase...
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3 py-10">
                <span className="text-4xl animate-pulse block">⏳</span>
                <h3 className="font-display text-xl text-gold font-bold">
                  Awaiting {enableDeputies ? 'Deputies' : `Sheriff ${sheriffPlayer.name}`}
                </h3>
                <p className="text-xs md:text-sm text-parchment/70 max-w-md font-body">
                  The Sheriff is reviewing declarations.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* State 2: Active 1-on-1 Merchant Interrogation (Framing Portraits + Bag + Scale) */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start py-4 max-w-7xl mx-auto w-full">
            {/* LEFT COLUMN: Crown Authority Portrait (Sheriff or Deputies) */}
            <div className="lg:col-span-1 bg-walnut-card/90 border-2 border-gold/40 rounded-3xl p-4 shadow-xl flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-800 to-walnut-bg border-2 border-gold flex items-center justify-center text-3xl shadow-lg">
                {enableDeputies ? '🛡️' : '⭐'}
              </div>
              <div className="text-center">
                <span className="text-[10px] font-display uppercase tracking-widest text-gold-muted block">
                  {enableDeputies ? 'Crown Deputies' : 'Sheriff of Nottingham'}
                </span>
                <h4 className="font-display font-black text-base text-white">
                  {enableDeputies
                    ? deputyPlayers.map((d) => d.name).join(' & ')
                    : sheriffPlayer.name}
                </h4>
              </div>

              {/* Sheriff Gold Purse */}
              <div className="w-full bg-walnut-bg/80 border border-gold/20 rounded-xl px-3 py-1.5 flex justify-between items-center text-xs font-display">
                <span className="text-gold-muted">Treasury:</span>
                <span className="text-gold font-bold">🪙 {sheriffPlayer.gold} Gold</span>
              </div>

              {/* Status Note */}
              <p className="text-[11px] text-parchment/70 italic text-center font-body">
                "Honesty brings peace, but deceit pays a hefty toll."
              </p>
            </div>

            {/* CENTER COLUMNS (2 cols): Sealed Bag + 2D Bribe Scale + Action Controls */}
            <div className="lg:col-span-2 flex flex-col items-center gap-4">
              {/* Active Binding Table Commitment Banner */}
              {activeCommitment && (
                <div
                  className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between text-xs font-display font-bold shadow-lg ${
                    activeCommitment.forcedOutcome === 'FORCE_INSPECT'
                      ? 'bg-crimson/30 border-crimson text-crimson-200'
                      : 'bg-emerald/30 border-emerald text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{activeCommitment.forcedOutcome === 'FORCE_INSPECT' ? '🔨' : '🛡️'}</span>
                    <div>
                      <div className="text-white font-black text-xs uppercase tracking-wide">
                        {activeCommitment.forcedOutcome === 'FORCE_INSPECT'
                          ? 'DEAL: MUST INSPECT'
                          : 'DEAL: MUST PASS'}
                      </div>
                      <div className="text-[11px] text-parchment/80 font-normal font-body">
                        {activeCommitment.forcedOutcome === 'FORCE_INSPECT'
                          ? `Accepted bribe guarantees inspection of ${activeMerchant.name}'s bag.`
                          : `Accepted bribe guarantees safe passage for ${activeMerchant.name}.`}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-black/60 text-[10px] font-black uppercase tracking-wider shrink-0 border border-white/20">
                    {activeCommitment.forcedOutcome === 'FORCE_INSPECT' ? '🔨 Must Inspect' : '🛡️ Must Pass'}
                  </span>
                </div>
              )}

              {/* Central Sealed Bag Preview */}
              <div className="w-full bg-walnut-surface/90 border-2 border-gold/50 rounded-3xl p-4 shadow-xl flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💼</span>
                  <span className="font-display font-black text-sm uppercase tracking-wider text-gold">
                    {activeMerchant.name}'s Sealed Bag
                  </span>
                </div>

                {/* Proclamation Banner */}
                {declaredGoodToken && (
                  <div className="flex items-center gap-2 bg-walnut-card border border-gold/50 px-4 py-1.5 rounded-full text-xs font-display shadow-md">
                    <span className="text-parchment/70">Declared:</span>
                    <span className="text-xl">{declaredGoodToken.icon}</span>
                    <span className="font-bold text-gold">
                      {activeMerchant.sealedBag?.declaredCount} {declaredGoodToken.name}
                    </span>
                  </div>
                )}

                {/* 2D Illustrated Balance Scale (Resets when merchant finishes or changes) */}
                <BribeScale
                  key={`scale-${activeMerchant.id}`}
                  goldAmount={merchantScaleOffer?.gold || 0}
                  standCardCount={merchantScaleOffer?.standCardIds.length || 0}
                  bagClaimCount={merchantScaleOffer?.bagCardClaims.length || 0}
                  terms={merchantScaleOffer?.nonBindingTerms}
                  isOfferPending={merchantScaleOffer?.status === 'PROPOSED'}
                />
              </div>

              {/* Active Open Bribes List for This Bag */}
              {openBribesForThisMerchant.length > 0 && (
                <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-walnut-card/95 border border-gold/40 shadow-lg">
                  <div className="flex items-center justify-between border-b border-tavern-border pb-1.5">
                    <span className="text-xs font-display font-black text-gold uppercase tracking-wider flex items-center gap-1.5">
                      <span>🤝</span>
                      <span>Active Proposals:</span>
                    </span>
                    <span className="text-[10px] text-parchment/60 font-display">
                      {openBribesForThisMerchant.length} active
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {openBribesForThisMerchant.map((offer) => {
                      const fromName = playersMap.get(offer.fromPlayerId)?.name || 'Merchant';
                      const isRivalInspect =
                        offer.intendedOutcome === 'FORCE_INSPECT' || offer.intendedOutcome === 'INSPECT';
                      const isOfferFromAuthority =
                        offer.fromPlayerId === sheriffPlayer.id ||
                        (enableDeputies && deputyIds.includes(offer.fromPlayerId));
                      const isOfferer = offer.fromPlayerId === localPlayerId;
                      const canRespond = isOfferFromAuthority
                        ? !isOfferer
                        : isAuthority && !isOfferer;

                      return (
                        <div
                          key={offer.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border text-xs font-display ${
                            isRivalInspect
                              ? 'bg-crimson/25 border-red-500/60 text-red-100'
                              : 'bg-emerald/25 border-emerald-500/60 text-emerald-100'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="font-bold flex items-center gap-1.5 flex-wrap">
                              <span>
                                {isOfferFromAuthority
                                  ? isRivalInspect
                                    ? '🔨 SHERIFF OFFER:'
                                    : '🛡️ SHERIFF OFFER:'
                                  : isRivalInspect
                                  ? '🔨 RIVAL OFFER:'
                                  : '🛡️ PASSAGE OFFER:'}
                              </span>
                              <span className="text-white">{fromName}</span>
                              <span>offers</span>
                              <span className="text-gold font-bold">🪙 {offer.goldOffered}g</span>
                              {offer.standLegalGoodsOffered.length > 0 && (
                                <span className="text-parchment/80">+{offer.standLegalGoodsOffered.length} goods</span>
                              )}
                            </div>
                            <div className="text-[11px] text-parchment/80 font-body">
                              {isOfferFromAuthority
                                ? isRivalInspect
                                  ? `Inspect ${activeMerchant.name}'s bag`
                                  : `Pass ${activeMerchant.name}'s bag`
                                : isRivalInspect
                                ? `Inspect ${activeMerchant.name}'s bag`
                                : `Pass ${activeMerchant.name}'s bag`}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {canRespond && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDeclineOffer(offer.id)}
                                  className="h-8 px-2.5 rounded-lg bg-tavern-surface hover:bg-tavern-card text-parchment/80 border border-tavern-border text-[11px] font-bold transition-all cursor-pointer inline-flex items-center justify-center"
                                >
                                  Decline
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptOffer(offer)}
                                  className={`h-8 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all border shadow-md cursor-pointer inline-flex items-center justify-center gap-1 ${
                                    isRivalInspect
                                      ? 'bg-crimson hover:bg-crimson-light text-white border-red-400'
                                      : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-400'
                                  }`}
                                >
                                  {isRivalInspect ? '🔨 Accept & Inspect' : '🛡️ Accept & Pass'}
                                </button>
                              </>
                            )}
                            {isOfferer && (
                              <button
                                type="button"
                                onClick={() => handleWithdrawOffer(offer.id)}
                                className="h-8 px-2.5 rounded-lg bg-tavern-surface hover:bg-tavern-card text-parchment/60 hover:text-white border border-tavern-border text-[11px] font-bold transition-all cursor-pointer inline-flex items-center justify-center"
                              >
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bribe Negotiation Proposal Builder */}
              <BribeNegotiationPanel key={activeMerchant.id} sheriff={sheriffPlayer} merchant={activeMerchant} />

              {/* Action Controls: Unsnap Clasp or Deputy Decisions */}
              <div className="w-full flex flex-col items-center pt-2">
                {enableDeputies ? (
                  isLocalDeputy ? (
                    <div className="w-full flex flex-col gap-2">
                      <span className="text-xs text-center text-gold-muted font-display uppercase tracking-widest">
                        Deputy Inspection Actions
                      </span>
                      <div className="grid grid-cols-2 gap-2.5 w-full">
                        <button
                          type="button"
                          onClick={() => handleDeputyAction('JOINT_PASS', activeMerchant.id)}
                          className="p-3 rounded-2xl bg-emerald/20 border-2 border-emerald/50 hover:bg-emerald/30 text-emerald-200 text-left transition-all cursor-pointer shadow-lg"
                        >
                          <div className="font-display font-black text-xs flex items-center gap-1.5 text-emerald-300">
                            🤝 Joint Pass
                          </div>
                          <div className="text-[10px] text-parchment/70 mt-0.5 leading-tight">
                            Pass bag; tribute shared into Booty Tile
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeputyAction('JOINT_INSPECT', activeMerchant.id)}
                          className="p-3 rounded-2xl bg-crimson/20 border-2 border-crimson/60 hover:bg-crimson/30 text-red-200 text-left transition-all cursor-pointer shadow-lg"
                        >
                          <div className="font-display font-black text-xs flex items-center gap-1.5 text-red-300">
                            🔍 Joint Inspect
                          </div>
                          <div className="text-[10px] text-parchment/70 mt-0.5 leading-tight">
                            Inspect together; split risk & fines
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeputyAction('SOLO_PASS', activeMerchant.id)}
                          className="p-3 rounded-2xl bg-walnut-card border-2 border-gold/40 hover:border-gold text-gold-light text-left transition-all cursor-pointer shadow-lg"
                        >
                          <div className="font-display font-black text-xs flex items-center gap-1.5 text-gold">
                            🤫 Solo Pass
                          </div>
                          <div className="text-[10px] text-parchment/70 mt-0.5 leading-tight">
                            Pass alone; collect tribute to personal purse
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeputyAction('SOLO_INSPECT', activeMerchant.id)}
                          className="p-3 rounded-2xl bg-walnut-card border-2 border-gold/40 hover:border-gold text-gold-light text-left transition-all cursor-pointer shadow-lg"
                        >
                          <div className="font-display font-black text-xs flex items-center gap-1.5 text-gold">
                            ⚡ Solo Inspect
                          </div>
                          <div className="text-[10px] text-parchment/70 mt-0.5 leading-tight">
                            Inspect alone; take full penalty risk & reward
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-gold-muted italic py-2 font-body">
                      {localPlayer?.id === activeMerchant.id
                        ? 'Negotiate with Deputies or wait for their decision.'
                        : `${activeMerchant.name} is negotiating with the Deputies...`}
                    </div>
                  )
                ) : isLocalSheriff ? (
                  activeCommitment ? (
                    <div className="w-full flex flex-col items-center gap-2">
                      {activeCommitment.forcedOutcome === 'FORCE_INSPECT' ? (
                        <button
                          type="button"
                          onClick={() => handleInspect(activeMerchant.id)}
                          className="w-full max-w-md h-12 py-3 px-6 rounded-2xl bg-crimson hover:bg-crimson-light text-white font-display font-black text-sm uppercase tracking-wider border-2 border-red-400 shadow-xl cursor-pointer inline-flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                          <span>🔨</span>
                          <span>Inspect Bag</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePass(activeMerchant.id)}
                          className="w-full max-w-md h-12 py-3 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-black text-sm uppercase tracking-wider border-2 border-emerald-400 shadow-xl cursor-pointer inline-flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                          <span>🛡️</span>
                          <span>Pass Bag</span>
                        </button>
                      )}
                      <span className="text-[11px] text-parchment/70 italic font-body">
                        Bound by accepted deal.
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center pb-6">
                      <UnsnapClasp
                        onInspect={() => handleInspect(activeMerchant.id)}
                        onPass={() => handlePass(activeMerchant.id)}
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center text-xs text-gold-muted italic py-2 font-body">
                    {localPlayer?.id === activeMerchant.id
                      ? "Negotiate with the Sheriff or await their decision."
                      : `${activeMerchant.name} is being scrutinized by Sheriff ${sheriffPlayer.name}...`}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Merchant Portrait & Stand Wares */}
            <div className="lg:col-span-1 bg-walnut-card/90 border-2 border-gold/40 rounded-3xl p-4 shadow-xl flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-950 to-walnut-bg border-2 border-gold flex items-center justify-center text-3xl shadow-lg">
                💼
              </div>
              <div className="text-center">
                <span className="text-[10px] font-display uppercase tracking-widest text-gold-muted block">
                  Merchant at Gate
                </span>
                <h4 className="font-display font-black text-base text-white">
                  {activeMerchant.name}
                </h4>
              </div>

              {/* Merchant Gold Purse */}
              <div className="w-full bg-walnut-bg/80 border border-gold/20 rounded-xl px-3 py-1.5 flex justify-between items-center text-xs font-display">
                <span className="text-gold-muted">Purse:</span>
                <span className="text-gold font-bold">🪙 {activeMerchant.gold} Gold</span>
              </div>

              {/* Merchant Stand Wares */}
              <div className="w-full flex flex-col gap-1.5 bg-walnut-bg/60 p-2.5 rounded-xl border border-tavern-border text-xs">
                <span className="text-[10px] font-display text-gold-muted uppercase tracking-wider block border-b border-tavern-border pb-1">
                  Stand Wares
                </span>
                <div className="flex justify-between">
                  <span className="text-parchment/70">Legal Goods:</span>
                  <span className="font-bold text-white">{activeMerchant.standLegal.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-parchment/70">Contraband Vault:</span>
                  <span className="font-bold text-contraband-light">⚜️ {activeMerchant.standContrabandCount}</span>
                </div>
                {activeMerchant.standRoyalCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-parchment/70">Royal Wares:</span>
                    <span className="font-bold text-royal-light">👑 {activeMerchant.standRoyalCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center text-[11px] text-parchment/50 pt-2 border-t border-tavern-border/50 font-body shrink-0">
          Gate Examination • Honest = Sheriff pays. Dishonest = confiscation + penalty.
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
);
}
