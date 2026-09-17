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
  const activeBribe = useGameStore((s) => s.activeBribe);
  const bribeReactionCooldown = useGameStore((s) => s.bribeReactionCooldown);

  const isLocalSheriff = localPlayerId === sheriff.id;
  const isLocalMerchant = localPlayerId === merchant.id;

  // Proposal builder local state
  const [offerGold, setOfferGold] = useState<number>(0);
  const [selectedStandCardIds, setSelectedStandCardIds] = useState<string[]>([]);
  const [bagClaims, setBagClaims] = useState<string[]>([]);
  const [nonBindingTerms, setNonBindingTerms] = useState<string>('');
  const [isComposing, setIsComposing] = useState(false);

  const maxGold = merchant.gold;
  const availableStandCards: ClientCard[] = merchant.standLegal;

  const handleToggleStandCard = (cardId: string) => {
    setSelectedStandCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleSendBribe = () => {
    network.send('bribe_propose', {
      gold: offerGold,
      standCardIds: selectedStandCardIds,
      bagCardClaims: bagClaims.map((claim) => ({ goodType: claim, count: 1 })),
      nonBindingTerms: nonBindingTerms.trim(),
    });
    soundManager.playCoin();
    setIsComposing(false);
  };

  const handleAcceptBribe = () => {
    if (!activeBribe || bribeReactionCooldown) return;
    network.send('bribe_respond', {
      accept: true,
      sequenceNumber: activeBribe.sequenceNumber,
    });
  };

  const handleRejectBribe = () => {
    if (!activeBribe) return;
    network.send('bribe_respond', {
      accept: false,
      sequenceNumber: activeBribe.sequenceNumber,
    });
  };

  return (
    <div className="flex flex-col gap-3 bg-tavern-surface/90 border border-tavern-border rounded-xl p-4 backdrop-blur-md shadow-xl text-parchment max-w-lg w-full">
      {/* Active Bribe Display (if proposed) */}
      <AnimatePresence>
        {activeBribe && activeBribe.status === 'PROPOSED' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-3 rounded-lg border flex flex-col gap-2 ${
              bribeReactionCooldown
                ? 'bg-amber-950/40 border-amber-500/80 ring-2 ring-amber-500/30'
                : 'bg-tavern-card border-gold/40'
            }`}
          >
            <div className="flex justify-between items-center text-xs">
              <span className="font-display font-bold text-gold flex items-center gap-1.5">
                <span>🪙 Active Bribe Proposal #{activeBribe.sequenceNumber}</span>
                {bribeReactionCooldown && (
                  <span className="text-[10px] text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded animate-pulse">
                    Offer Modified (1.5s lock)
                  </span>
                )}
              </span>
              <span className="text-gold-muted text-[11px]">
                Offered by {activeBribe.fromPlayerId === merchant.id ? merchant.name : sheriff.name}
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
                "{activeBribe.nonBindingTerms}"
              </div>
            )}

            {/* Acceptance / Rejection Controls (Only visible to the recipient of the bribe) */}
            {activeBribe.fromPlayerId !== localPlayerId && (isLocalSheriff || isLocalMerchant) ? (
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  disabled={bribeReactionCooldown}
                  onClick={handleAcceptBribe}
                  className="flex-1 py-1.5 rounded-lg bg-emerald/30 border border-emerald/60 text-emerald-300 hover:bg-emerald/40 font-display text-xs font-bold uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Accept Bribe
                </button>
                <button
                  type="button"
                  onClick={handleRejectBribe}
                  className="flex-1 py-1.5 rounded-lg bg-crimson/30 border border-crimson/60 text-red-300 hover:bg-crimson/40 font-display text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Reject Bribe
                </button>
              </div>
            ) : activeBribe.fromPlayerId === localPlayerId ? (
              <div className="text-center text-xs text-amber-300/80 italic py-1 font-body">
                Proposal submitted. Awaiting response from {activeBribe.fromPlayerId === merchant.id ? sheriff.name : merchant.name}...
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bribe Proposal Composition */}
      {!isComposing ? (
        <div className="flex justify-center">
          {activeBribe ? (
            <button
              type="button"
              onClick={() => setIsComposing(true)}
              className="px-4 py-2 rounded-lg bg-tavern-card border border-gold/30 hover:border-gold text-gold-light hover:text-white font-display text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
            >
              Counter-Offer Bribe 🪙
            </button>
          ) : isLocalMerchant ? (
            <button
              type="button"
              onClick={() => setIsComposing(true)}
              className="px-4 py-2 rounded-lg bg-tavern-card border border-gold/30 hover:border-gold text-gold-light hover:text-white font-display text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
            >
              Offer Bribe to Sheriff 🪙
            </button>
          ) : isLocalSheriff ? (
            <button
              type="button"
              onClick={() => setIsComposing(true)}
              className="px-4 py-2 rounded-lg bg-tavern-card border border-gold/30 hover:border-gold text-gold-light hover:text-white font-display text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
            >
              Demand Tribute 🪙
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-2 border-t border-tavern-border">
          <div className="flex justify-between items-center text-xs font-display">
            <span className="text-gold font-bold">Construct Bribe Offer</span>
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="text-gold-muted hover:text-white text-xs"
            >
              ✕ Cancel
            </button>
          </div>

          {/* Gold Slider & Input */}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-parchment/80">Gold Coins:</span>
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

          {/* Stand Goods Offer (if available) */}
          {availableStandCards.length > 0 && (
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-parchment/80">Offer Goods from Stand:</span>
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

          {/* Promised Bag Goods (for merchant) */}
          {isLocalMerchant && merchant.sealedBag && (
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-parchment/80">Promised Good from Bag:</span>
              <div className="flex gap-2">
                {['APPLE', 'CHEESE', 'BREAD', 'CHICKEN'].map((good) => (
                  <button
                    key={good}
                    type="button"
                    onClick={() =>
                      setBagClaims((prev) =>
                        prev.includes(good) ? prev.filter((g) => g !== good) : [...prev, good]
                      )
                    }
                    className={`px-2 py-1 rounded text-xs border transition-all ${
                      bagClaims.includes(good)
                        ? 'border-gold bg-gold/20 text-gold-light'
                        : 'border-tavern-border bg-tavern-card text-parchment/60'
                    }`}
                  >
                    {good === 'APPLE' ? '🍎' : good === 'CHEESE' ? '🧀' : good === 'BREAD' ? '🍞' : '🐔'} {good}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Non-Binding Terms */}
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-parchment/80">Non-Binding Promises:</span>
            <input
              type="text"
              placeholder="e.g., 'Will let your bags pass next round'"
              value={nonBindingTerms}
              onChange={(e) => setNonBindingTerms(e.target.value)}
              maxLength={80}
              className="px-3 py-1.5 rounded bg-tavern-bg border border-tavern-border text-xs text-parchment placeholder-parchment/40 focus:outline-none focus:border-gold"
            />
          </div>

          {/* Submit Offer */}
          <button
            type="button"
            onClick={handleSendBribe}
            className="w-full py-2 rounded-lg btn-gold font-display text-xs tracking-wider uppercase font-bold"
          >
            Transmit Bribe Offer
          </button>
        </div>
      )}
    </div>
  );
}
