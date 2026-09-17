import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { network } from '../net/colyseus';
import { GOOD_TOKENS, MOTION_PRESETS } from '../theme/tokens';
import type { GoodType, NegotiationIntendedOutcome } from '@sheriff/shared';

export function NegotiationOfferModal() {
  const targetBagOwnerId = useGameStore((s) => s.offerModalTargetBagOwnerId);
  const closeOfferModal = useGameStore((s) => s.closeOfferModal);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const playersMap = useGameStore((s) => s.players);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const currentInspectionBagOwnerId = useGameStore((s) => s.currentInspectionBagOwnerId);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);

  const localPlayer = playersMap.get(localPlayerId || '');
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    targetBagOwnerId || currentInspectionBagOwnerId || activeMerchantId || ''
  );

  useEffect(() => {
    if (targetBagOwnerId) {
      setSelectedTargetId(targetBagOwnerId);
    } else if (currentInspectionBagOwnerId) {
      setSelectedTargetId(currentInspectionBagOwnerId);
    } else if (activeMerchantId) {
      setSelectedTargetId(activeMerchantId);
    }
  }, [targetBagOwnerId, currentInspectionBagOwnerId, activeMerchantId]);

  const [gold, setGold] = useState<number>(0);
  const [selectedStandCardIds, setSelectedStandCardIds] = useState<string[]>([]);
  const [standContrabandCount, setStandContrabandCount] = useState<number>(0);
  const [bagGoodsCount, setBagGoodsCount] = useState<number>(0);
  const [futureFavorText, setFutureFavorText] = useState<string>('');
  const [intendedOutcome, setIntendedOutcome] = useState<NegotiationIntendedOutcome>('PASS');

  if (!targetBagOwnerId || !localPlayer) return null;

  const players = Array.from(playersMap.values());
  const eligibleMerchants = players.filter((p) => !p.isSheriff && !p.sealedBag?.isRevealed);
  const isTargetingOwnBag = selectedTargetId === localPlayerId;

  // Auto-switch intended outcome default when switching target
  const handleTargetChange = (newTargetId: string) => {
    setSelectedTargetId(newTargetId);
    if (newTargetId === localPlayerId) {
      setIntendedOutcome('PASS');
    } else {
      setIntendedOutcome('FORCE_INSPECT');
    }
  };

  const handleToggleStandCard = (cardId: string) => {
    setSelectedStandCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) return;

    network.send('negotiation_propose', {
      targetBagOwnerId: selectedTargetId,
      intendedOutcome,
      goldOffered: Math.min(localPlayer.gold, Math.max(0, gold)),
      standLegalGoodsOffered: selectedStandCardIds,
      standContrabandCountOffered: Math.max(0, standContrabandCount),
      bagGoodsCountOffered: isTargetingOwnBag ? Math.max(0, bagGoodsCount) : 0,
      futureFavorText: futureFavorText.trim(),
    });

    closeOfferModal();
  };

  const transition = reducedMotion ? MOTION_PRESETS.instant : MOTION_PRESETS.settle;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Scrim backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeOfferModal}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={transition}
          className="relative w-full max-w-lg bg-tavern-bg border-2 border-gold/70 rounded-3xl p-5 md:p-6 text-parchment shadow-2xl z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-tavern-border pb-3">
            <div className="flex items-center gap-2 font-display">
              <span className="text-2xl">🤝</span>
              <div>
                <h3 className="text-gold font-black text-lg tracking-wide uppercase">
                  Propose Bribe & Negotiation
                </h3>
                <p className="text-xs text-parchment/70">
                  Negotiate freely with the Sheriff regarding any sealed bag.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeOfferModal}
              className="text-parchment/60 hover:text-white font-bold text-lg p-1"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-display">
            {/* Target Merchant Bag */}
            <div className="flex flex-col gap-1.5">
              <label className="text-gold font-bold uppercase tracking-wider text-[11px]">
                Target Merchant's Bag:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {eligibleMerchants.map((m) => {
                  const isSelected = m.id === selectedTargetId;
                  const isSelf = m.id === localPlayerId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleTargetChange(m.id)}
                      className={`px-3 py-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                        isSelected
                          ? 'border-gold bg-gold/20 text-white font-bold ring-2 ring-gold/40'
                          : 'border-tavern-border bg-tavern-surface/70 hover:border-gold/50 text-parchment'
                      }`}
                    >
                      <span className="truncate">{m.name} {isSelf && '(You)'}</span>
                      <span className="text-[10px] text-parchment/60 font-normal">
                        {m.sealedBag ? `${m.sealedBag.cardCount} cards in bag` : 'No bag'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Intended Outcome */}
            <div className="flex flex-col gap-1.5">
              <label className="text-gold font-bold uppercase tracking-wider text-[11px]">
                Desired Outcome for this Bag:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {isTargetingOwnBag ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIntendedOutcome('PASS')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        intendedOutcome === 'PASS'
                          ? 'border-emerald bg-emerald/25 text-emerald-300 font-bold ring-2 ring-emerald/40'
                          : 'border-tavern-border bg-tavern-surface text-parchment/70'
                      }`}
                    >
                      🛡️ Pass Unopened
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntendedOutcome('INSPECT')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        intendedOutcome === 'INSPECT'
                          ? 'border-crimson bg-crimson/25 text-crimson-300 font-bold ring-2 ring-crimson/40'
                          : 'border-tavern-border bg-tavern-surface text-parchment/70'
                      }`}
                    >
                      ⚔️ Inspect Bag
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIntendedOutcome('FORCE_INSPECT')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        intendedOutcome === 'FORCE_INSPECT'
                          ? 'border-crimson bg-crimson/30 text-crimson-200 font-bold ring-2 ring-crimson/50'
                          : 'border-tavern-border bg-tavern-surface text-parchment/70'
                      }`}
                    >
                      🔨 Force Inspection! (Rival)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntendedOutcome('FORCE_PASS')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        intendedOutcome === 'FORCE_PASS'
                          ? 'border-emerald bg-emerald/25 text-emerald-300 font-bold ring-2 ring-emerald/40'
                          : 'border-tavern-border bg-tavern-surface text-parchment/70'
                      }`}
                    >
                      🛡️ Force Pass (Ally)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Gold Bribe */}
            <div className="flex flex-col gap-1 bg-tavern-surface/70 p-3 rounded-2xl border border-tavern-border">
              <div className="flex items-center justify-between">
                <span className="text-gold font-bold text-[11px] uppercase tracking-wider">
                  🪙 Gold Offered:
                </span>
                <span className="text-gold font-bold text-sm">
                  {gold}g <span className="text-parchment/40 text-xs font-normal">/ {localPlayer.gold}g</span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={localPlayer.gold}
                value={gold}
                onChange={(e) => setGold(Number(e.target.value))}
                className="w-full accent-gold cursor-pointer"
              />
              <div className="flex justify-between gap-1 mt-1">
                {[0, 2, 5, 10, 15, localPlayer.gold].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setGold(Math.min(amt, localPlayer.gold))}
                    className="px-2 py-0.5 rounded bg-tavern-bg text-[10px] text-gold/80 hover:text-gold border border-gold/30"
                  >
                    {amt}g
                  </button>
                ))}
              </div>
            </div>

            {/* Stand Legal Goods Offered */}
            {localPlayer.standLegal.length > 0 && (
              <div className="flex flex-col gap-1.5 bg-tavern-surface/70 p-3 rounded-2xl border border-tavern-border">
                <span className="text-gold font-bold text-[11px] uppercase tracking-wider">
                  🛒 Legal Goods from your Stand:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {localPlayer.standLegal.map((card) => {
                    const isSelected = selectedStandCardIds.includes(card.id);
                    const token = card.goodType ? GOOD_TOKENS[card.goodType as GoodType] : null;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleToggleStandCard(card.id)}
                        className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/25 text-white font-bold ring-1 ring-gold/40'
                            : 'border-tavern-border bg-tavern-bg text-parchment/70 hover:border-gold/40'
                        }`}
                      >
                        <span>{token?.icon || '📦'}</span>
                        <span>{card.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stand Contraband Count (Honor Among Thieves) */}
            <div className="flex flex-col gap-1.5 bg-tavern-surface/70 p-3 rounded-2xl border border-tavern-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-crimson-300 font-bold text-[11px] uppercase tracking-wider">
                    ⚜️ Secret Stand Contraband:
                  </span>
                  <p className="text-[10px] text-parchment/60 font-normal">
                    Honor Among Thieves: Only genuine contraband is transferred at resolution.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStandContrabandCount((c) => Math.max(0, c - 1))}
                    className="w-6 h-6 rounded bg-tavern-bg border border-tavern-border font-bold flex items-center justify-center hover:bg-tavern-card"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm w-4 text-center">{standContrabandCount}</span>
                  <button
                    type="button"
                    onClick={() => setStandContrabandCount((c) => c + 1)}
                    className="w-6 h-6 rounded bg-tavern-bg border border-tavern-border font-bold flex items-center justify-center hover:bg-tavern-card"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Bag Goods Offered (Only if targeting own bag) */}
            {isTargetingOwnBag && localPlayer.sealedBag && (
              <div className="flex flex-col gap-1.5 bg-tavern-surface/70 p-3 rounded-2xl border border-tavern-border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-emerald-300 font-bold text-[11px] uppercase tracking-wider">
                      💼 Goods from within your Sealed Bag:
                    </span>
                    <p className="text-[10px] text-parchment/60 font-normal">
                      Surrendered if bag passes unopened. Phantom cards are voided.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBagGoodsCount((c) => Math.max(0, c - 1))}
                      className="w-6 h-6 rounded bg-tavern-bg border border-tavern-border font-bold flex items-center justify-center hover:bg-tavern-card"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm w-4 text-center">{bagGoodsCount}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setBagGoodsCount((c) =>
                          Math.min(localPlayer.sealedBag?.cardCount || 5, c + 1)
                        )
                      }
                      className="w-6 h-6 rounded bg-tavern-bg border border-tavern-border font-bold flex items-center justify-center hover:bg-tavern-card"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Non-Binding Favor / Terms (Flavor Only) */}
            <div className="flex flex-col gap-1">
              <label className="text-parchment/80 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                <span>💬 Future Favor or Terms:</span>
                <span className="text-[10px] text-gold font-normal italic">(Flavor only — non-binding)</span>
              </label>
              <input
                type="text"
                maxLength={80}
                placeholder="e.g., Let me pass and I will let you pass when I am Sheriff..."
                value={futureFavorText}
                onChange={(e) => setFutureFavorText(e.target.value)}
                className="px-3 py-2 rounded-xl bg-tavern-surface border border-tavern-border focus:border-gold outline-none text-white text-xs placeholder:text-parchment/30"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-tavern-border mt-2">
              <button
                type="button"
                onClick={closeOfferModal}
                className="px-4 py-2 rounded-xl bg-tavern-surface hover:bg-tavern-card text-parchment text-xs font-bold transition-all border border-tavern-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-gold via-amber-400 to-gold text-tavern-bg font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Send Proposal 🤝
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
