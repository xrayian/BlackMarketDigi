import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, type ClientPlayer, type ClientCard } from '../state/gameStore';
import { network } from '../net/colyseus';
import { CardDisplay } from './CardDisplay';
import { soundManager } from '../audio/soundManager';

interface BribeNegotiationPanelProps {
  sheriff: ClientPlayer;
  merchant: ClientPlayer;
}

export function BribeNegotiationPanel({ sheriff, merchant }: BribeNegotiationPanelProps) {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const playersMap = useGameStore((s) => s.players);
  const activeBribe = useGameStore((s) => s.activeBribe);
  const bribeReactionCooldown = useGameStore((s) => s.bribeReactionCooldown);
  const negotiationFeed = useGameStore((s) => s.negotiationFeed);
  const negotiationSequence = useGameStore((s) => s.negotiationSequence);
  const openOfferModal = useGameStore((s) => s.openOfferModal);

  const isLocalSheriff = localPlayerId === sheriff.id;
  const isLocalMerchant = localPlayerId === merchant.id;
  const localPlayer = playersMap.get(localPlayerId || '');

  // Proposal builder local state
  const [offerGold, setOfferGold] = useState<number>(0);
  const [selectedStandCardIds, setSelectedStandCardIds] = useState<string[]>([]);
  const [bagClaims, setBagClaims] = useState<string[]>([]);
  const [nonBindingTerms, setNonBindingTerms] = useState<string>('');
  const [isComposing, setIsComposing] = useState(false);
  const [intendedOutcome, setIntendedOutcome] = useState<'PASS' | 'INSPECT'>(
    isLocalMerchant ? 'PASS' : 'INSPECT'
  );

  // For Sheriff demanding tribute, max gold is the examined merchant's purse.
  // For merchants offering bribes, max gold is their own purse.
  const maxGold = isLocalSheriff ? (merchant ? merchant.gold : 0) : (localPlayer ? localPlayer.gold : 0);
  const availableStandCards: ClientCard[] = localPlayer ? localPlayer.standLegal : [];

  // Check if this merchant already has open offers displayed in the parent ExaminationDesk
  const hasOpenOffersInFeed = negotiationFeed.some(
    (o) => o.targetBagOwnerId === merchant.id && o.status === 'OPEN'
  );

  const handleStartComposing = () => {
    const openOffersForMerchant = negotiationFeed.filter(
      (o) => o.targetBagOwnerId === merchant.id && o.status === 'OPEN'
    );
    const latestOffer = openOffersForMerchant[openOffersForMerchant.length - 1];
    if (latestOffer) {
      if (!isLocalMerchant) {
        const isLatestInspect =
          latestOffer.intendedOutcome === 'INSPECT' ||
          latestOffer.intendedOutcome === 'FORCE_INSPECT';
        setIntendedOutcome(isLatestInspect ? 'INSPECT' : 'PASS');
      }
      if (latestOffer.goldOffered > 0 && offerGold === 0) {
        setOfferGold(Math.min(maxGold, latestOffer.goldOffered));
      }
    } else if (isLocalSheriff) {
      setIntendedOutcome('PASS');
    } else if (!isLocalMerchant) {
      setIntendedOutcome('INSPECT');
    }
    setIsComposing(true);
  };

  const handleToggleStandCard = (cardId: string) => {
    setSelectedStandCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleSendBribe = () => {
    const isTargetOwnBag = merchant.id === localPlayerId;
    network.send('negotiation_propose', {
      targetBagOwnerId: merchant.id,
      intendedOutcome: isTargetOwnBag ? 'PASS' : intendedOutcome,
      goldOffered: Math.min(maxGold, Math.max(0, offerGold)),
      standLegalGoodsOffered: isLocalSheriff ? [] : selectedStandCardIds,
      bagGoodsCountOffered: isTargetOwnBag ? bagClaims.length : 0,
      futureFavorText: nonBindingTerms.trim(),
    });
    soundManager.playCoin();
    setIsComposing(false);
  };

  const handleAcceptBribe = () => {
    if (!activeBribe || bribeReactionCooldown) return;
    const feedOffer = negotiationFeed.find((o) => o.id === activeBribe.id && o.status === 'OPEN');
    if (feedOffer) {
      network.send('negotiation_accept', {
        offerId: feedOffer.id,
        expectedSequence: negotiationSequence,
      });
    } else {
      network.send('bribe_respond', {
        accept: true,
        sequenceNumber: activeBribe.sequenceNumber,
      });
    }
  };

  const handleRejectBribe = () => {
    if (!activeBribe) return;
    const feedOffer = negotiationFeed.find((o) => o.id === activeBribe.id && o.status === 'OPEN');
    if (feedOffer) {
      network.send('negotiation_decline', {
        offerId: feedOffer.id,
      });
    } else {
      network.send('bribe_respond', {
        accept: false,
        sequenceNumber: activeBribe.sequenceNumber,
      });
    }
  };

  // Identify true proposer and recipient names dynamically from playersMap
  const fromPlayer = activeBribe ? playersMap.get(activeBribe.fromPlayerId) : null;
  const fromName = fromPlayer
    ? fromPlayer.name
    : activeBribe?.fromPlayerId === sheriff.id
    ? sheriff.name
    : merchant.name;

  const toPlayer = activeBribe ? playersMap.get(activeBribe.toPlayerId) : null;
  const toName = toPlayer
    ? toPlayer.name
    : activeBribe?.toPlayerId === sheriff.id
    ? sheriff.name
    : merchant.name;

  const isOfferer = activeBribe?.fromPlayerId === localPlayerId;
  const isOfferFromSheriff = activeBribe?.fromPlayerId === sheriff.id;
  const canRespond =
    activeBribe &&
    !isOfferer &&
    (isOfferFromSheriff
      ? !isLocalSheriff
      : isLocalSheriff || activeBribe.toPlayerId === localPlayerId);

  return (
    <div className="flex flex-col gap-3 bg-tavern-surface/90 border border-tavern-border rounded-2xl p-3.5 backdrop-blur-md shadow-xl text-parchment max-w-lg w-full">
      {/* Active Bribe Display (Only show if not already displayed in the live feed list above) */}
      <AnimatePresence>
        {!hasOpenOffersInFeed && activeBribe && activeBribe.status === 'PROPOSED' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-3 rounded-xl border flex flex-col gap-2 ${
              bribeReactionCooldown
                ? 'bg-amber-950/40 border-amber-500/80 ring-2 ring-amber-500/30'
                : 'bg-tavern-card border-gold/40'
            }`}
          >
            <div className="flex justify-between items-center text-xs flex-wrap gap-1">
              <span className="font-display font-bold text-gold flex items-center gap-1.5">
                <span>{isOfferFromSheriff ? '⭐ Sheriff Demand' : '🪙 Active Bribe'} #{activeBribe.sequenceNumber}</span>
                {bribeReactionCooldown && (
                  <span className="text-[10px] text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded animate-pulse">
                    Offer Modified (1.5s lock)
                  </span>
                )}
              </span>
              <span className="text-gold-muted text-[11px]">
                {isOfferFromSheriff ? (
                  <>
                    Demanded by <strong className="text-white font-bold">{fromName}</strong> from{' '}
                    <strong className="text-white font-bold">{toName || merchant.name}</strong>
                  </>
                ) : (
                  <>
                    Offered by <strong className="text-white font-bold">{fromName}</strong>
                    {toName && <span className="text-parchment/60 font-normal"> to {toName}</span>}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm font-body">
              <div className="flex items-center gap-1 text-gold font-bold">
                <span>🪙</span>
                <span>{activeBribe.gold} Gold</span>
              </div>
              {activeBribe.standCardIds.length > 0 && (
                <div className="text-parchment/80 text-xs">
                  🃏 {activeBribe.standCardIds.length} Stand Goods
                </div>
              )}
            </div>

            {activeBribe.nonBindingTerms && (
              <div className="text-xs italic text-parchment/70 bg-tavern-bg/50 px-2.5 py-1 rounded">
                &ldquo;{activeBribe.nonBindingTerms}&rdquo;
              </div>
            )}

            {/* Acceptance / Rejection Controls */}
            {canRespond ? (
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  disabled={bribeReactionCooldown}
                  onClick={handleAcceptBribe}
                  className="flex-1 h-8 rounded-xl bg-emerald/30 border border-emerald/60 text-emerald-300 hover:bg-emerald/40 font-display text-xs font-bold uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <span>{isOfferFromSheriff ? '🪙' : '🛡️'}</span>
                  <span>{isOfferFromSheriff ? `Pay ${activeBribe.gold} Gold` : 'Accept Bribe'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectBribe}
                  className="flex-1 h-8 rounded-xl bg-crimson/30 border border-crimson/60 text-red-300 hover:bg-crimson/40 font-display text-xs font-bold uppercase transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <span>✕</span>
                  <span>{isOfferFromSheriff ? 'Refuse Demand' : 'Decline'}</span>
                </button>
              </div>
            ) : activeBribe.fromPlayerId === localPlayerId ? (
              <div className="text-center text-xs text-amber-300/80 italic py-1 font-body">
                {isOfferFromSheriff
                  ? `Demand sent. Awaiting payment from ${toName || merchant.name}...`
                  : `Proposal submitted. Awaiting response from ${toName}...`}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bribe Proposal / Demand Actions */}
      {!isComposing ? (
        <div className="flex items-center justify-center gap-2 flex-wrap w-full">
          <button
            type="button"
            onClick={() => openOfferModal(merchant.id)}
            className="flex-1 h-9 px-3.5 rounded-xl bg-gold/20 hover:bg-gold/35 border border-gold/60 text-gold-light hover:text-white font-display text-xs tracking-wider uppercase font-bold transition-all shadow-md active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>{isLocalSheriff ? '⚖️' : '🤝'}</span>
            <span>
              {isLocalSheriff
                ? hasOpenOffersInFeed
                  ? 'Counter Demand'
                  : 'Demand Terms'
                : hasOpenOffersInFeed
                ? 'Counter Terms'
                : 'Full Proposal'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleStartComposing}
            className="h-9 px-3.5 rounded-xl bg-walnut-card hover:bg-gold/10 border border-gold/30 hover:border-gold text-gold-muted hover:text-white font-display text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>{isLocalSheriff ? '⚖️' : '⚡'}</span>
            <span>
              {isLocalSheriff
                ? hasOpenOffersInFeed
                  ? 'Quick Counter'
                  : 'Quick Demand'
                : hasOpenOffersInFeed
                ? 'Quick Counter'
                : 'Quick Offer'}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-2 border-t border-tavern-border">
          <div className="flex justify-between items-center text-xs font-display">
            <span className="text-gold font-bold">
              {isLocalSheriff
                ? hasOpenOffersInFeed
                  ? 'Counter Demand'
                  : `Demand Tribute from ${merchant.name}`
                : hasOpenOffersInFeed
                ? 'Counter-Offer'
                : 'New Offer'}
            </span>
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="text-gold-muted hover:text-white text-xs cursor-pointer"
            >
              ✕ Cancel
            </button>
          </div>

          {/* Intended Consequence Toggle */}
          {!isLocalMerchant && (
            <div className="grid grid-cols-2 gap-2 text-xs font-display">
              <button
                type="button"
                onClick={() => setIntendedOutcome('PASS')}
                className={`h-8 rounded-lg border font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  intendedOutcome === 'PASS'
                    ? 'bg-emerald/40 border-emerald-400 text-emerald-100 shadow-sm'
                    : 'bg-tavern-card border-tavern-border text-parchment/60 hover:text-parchment'
                }`}
              >
                <span>🛡️</span>
                <span>{isLocalSheriff ? 'Safe Passage if Paid' : 'Safe Passage'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIntendedOutcome('INSPECT')}
                className={`h-8 rounded-lg border font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  intendedOutcome === 'INSPECT'
                    ? 'bg-crimson/40 border-red-400 text-red-100 shadow-sm'
                    : 'bg-tavern-card border-tavern-border text-parchment/60 hover:text-parchment'
                }`}
              >
                <span>🔨</span>
                <span>{isLocalSheriff ? 'Inspect Bag' : 'Check Pot'}</span>
              </button>
            </div>
          )}

          {/* Gold Slider & Input */}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-parchment/80">
                {isLocalSheriff ? `Gold Demanded from ${merchant.name}:` : 'Your Gold Coins:'}
              </span>
              <span className="text-gold font-bold font-display">{offerGold} / {maxGold}</span>
            </div>
            <input
              type="range"
              min={0}
              max={maxGold}
              value={offerGold}
              onChange={(e) => setOfferGold(Number(e.target.value))}
              className="w-full accent-gold cursor-pointer"
            />
          </div>

          {/* Stand Goods Offer (only for merchants offering goods) */}
          {!isLocalSheriff && availableStandCards.length > 0 && (
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-parchment/80">Your Stand Goods:</span>
              <div className="flex gap-2 overflow-x-auto py-1">
                {availableStandCards.map((card) => {
                  const isSelected = selectedStandCardIds.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleToggleStandCard(card.id)}
                      className="cursor-pointer scale-75 origin-top-left"
                    >
                      <CardDisplay card={card} selected={isSelected} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Promised Bag Goods (only if local merchant targets own bag) */}
          {isLocalMerchant && merchant.sealedBag && (
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-parchment/80">Promised Good from Bag:</span>
              <div className="flex gap-1.5 flex-wrap">
                {['APPLE', 'CHEESE', 'BREAD', 'CHICKEN'].map((good) => (
                  <button
                    key={good}
                    type="button"
                    onClick={() =>
                      setBagClaims((prev) =>
                        prev.includes(good) ? prev.filter((g) => g !== good) : [...prev, good]
                      )
                    }
                    className={`h-7 px-2 rounded-lg text-xs border transition-all inline-flex items-center gap-1 cursor-pointer ${
                      bagClaims.includes(good)
                        ? 'border-gold bg-gold/25 text-gold font-bold'
                        : 'border-tavern-border bg-tavern-card text-parchment/60'
                    }`}
                  >
                    <span>{good === 'APPLE' ? '🍎' : good === 'CHEESE' ? '🧀' : good === 'BREAD' ? '🍞' : '🐔'}</span>
                    <span>{good}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Non-Binding Terms */}
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-parchment/80">
              {isLocalSheriff ? 'Sheriff Terms / Promise:' : 'Non-Binding Promises:'}
            </span>
            <input
              type="text"
              placeholder={isLocalSheriff ? "e.g., 'Pay 5g and you enter unhindered'" : "e.g., 'Will let your bags pass next round'"}
              value={nonBindingTerms}
              onChange={(e) => setNonBindingTerms(e.target.value)}
              maxLength={80}
              className="h-8 px-3 rounded-lg bg-tavern-bg border border-tavern-border text-xs text-parchment placeholder-parchment/40 focus:outline-none focus:border-gold"
            />
          </div>

          {/* Submit Offer */}
          <button
            type="button"
            onClick={handleSendBribe}
            className="w-full h-9 rounded-xl btn-gold font-display text-xs tracking-wider uppercase font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <span>{isLocalSheriff ? '⚖️' : '🤝'}</span>
            <span>{isLocalSheriff ? `Demand ${offerGold}g Tribute` : 'Send Offer'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

