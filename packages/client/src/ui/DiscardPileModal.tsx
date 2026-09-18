import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { CardDisplay, getCardEmoji } from './CardDisplay';
import { MOTION_PRESETS } from '../theme/tokens';

export function DiscardPileModal() {
  const isDiscardPileOpen = useGameStore((s) => s.isDiscardPileOpen);
  const closeDiscardPile = useGameStore((s) => s.closeDiscardPile);
  const discardPile = useGameStore((s) => s.discardPile);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const [filter, setFilter] = useState<string>('ALL');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDiscardPileOpen) {
        closeDiscardPile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDiscardPileOpen, closeDiscardPile]);

  // Reset filter when opening
  useEffect(() => {
    if (isDiscardPileOpen) {
      setFilter('ALL');
    }
  }, [isDiscardPileOpen]);

  // Calculate breakdown tallies
  const tallies = useMemo(() => {
    const map = new Map<string, { count: number; name: string; emoji: string }>();
    for (const card of discardPile) {
      const key = card.classification === 'ROYAL'
        ? card.royalGoodType || card.name
        : card.classification === 'CONTRABAND'
        ? card.contrabandType || card.name
        : card.goodType || card.name;

      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, {
          count: 1,
          name: card.name,
          emoji: getCardEmoji(card),
        });
      }
    }
    return Array.from(map.entries()).map(([key, data]) => ({ key, ...data }));
  }, [discardPile]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    if (filter === 'ALL') return discardPile;
    return discardPile.filter((card) => {
      if (filter === 'LEGAL') return card.classification === 'LEGAL';
      if (filter === 'CONTRABAND') return card.classification === 'CONTRABAND';
      if (filter === 'ROYAL') return card.classification === 'ROYAL';
      return (
        card.goodType === filter ||
        card.contrabandType === filter ||
        card.royalGoodType === filter ||
        card.name === filter
      );
    });
  }, [discardPile, filter]);

  if (!isDiscardPileOpen) return null;

  const transition = reducedMotion ? MOTION_PRESETS.instant : MOTION_PRESETS.settle;
  const totalValue = discardPile.reduce((sum, c) => sum + (c.value || 0), 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 select-none">
        {/* Scrim Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeDiscardPile}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          title="Click backdrop to close"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={transition}
          className="relative w-full max-w-3xl max-h-[85vh] bg-tavern-bg border-2 border-gold/70 rounded-3xl p-5 md:p-6 text-parchment shadow-2xl z-10 flex flex-col gap-3 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-tavern-border pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🗑️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-black text-gold text-lg md:text-xl tracking-wider uppercase">
                    Town Discard Pile
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-light text-xs font-display font-bold border border-gold/40">
                    {discardPile.length} Cards
                  </span>
                </div>
                <p className="text-[11px] text-parchment/70 font-body">
                  All face-up discarded and confiscated goods currently in the town discard pile.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDiscardPile}
              className="w-8 h-8 rounded-lg bg-tavern-surface hover:bg-tavern-card text-parchment/60 hover:text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-tavern-border"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Quick Filter Bar */}
          {discardPile.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 shrink-0 scrollbar-thin">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`h-7 px-2.5 rounded-lg text-xs font-display font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  filter === 'ALL'
                    ? 'bg-gold text-walnut-bg border-gold shadow-sm'
                    : 'bg-tavern-surface text-parchment/70 hover:bg-gold/10 border-tavern-border'
                }`}
              >
                All ({discardPile.length})
              </button>

              {tallies.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(filter === item.key ? 'ALL' : item.key)}
                  className={`h-7 px-2 rounded-lg text-xs font-display inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap border ${
                    filter === item.key
                      ? 'bg-gold text-walnut-bg border-gold font-bold shadow-sm'
                      : 'bg-tavern-surface text-parchment/80 hover:bg-gold/10 border-tavern-border'
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span>{item.name}</span>
                  <span className="text-[10px] opacity-75">({item.count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Card Grid Body */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-[220px]">
            {discardPile.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-center gap-3">
                <span className="text-4xl opacity-40">📦</span>
                <div className="space-y-1">
                  <p className="font-display font-bold text-gold text-sm">The Discard Pile is Empty</p>
                  <p className="text-xs text-parchment/60 max-w-sm font-body">
                    When merchants exchange cards at the market or the Sheriff confiscates undeclared goods, they will be discarded here.
                  </p>
                </div>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2 text-parchment/60">
                <p className="font-display text-xs">No cards match the selected filter.</p>
                <button
                  type="button"
                  onClick={() => setFilter('ALL')}
                  className="text-gold text-xs underline font-bold cursor-pointer"
                >
                  Show all cards
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 py-2 justify-items-center">
                {filteredCards.map((card, idx) => (
                  <div key={`${card.id}_${idx}`} className="flex flex-col items-center">
                    <CardDisplay card={card} selected={false} disabled={false} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between border-t border-tavern-border pt-3 shrink-0 text-xs font-display">
            <div className="flex items-center gap-3 text-parchment/70">
              <span>
                Total Pile Value: <strong className="text-gold">🪙 {totalValue} Gold</strong>
              </span>
              <span>•</span>
              <span>
                Showing <strong className="text-white">{filteredCards.length}</strong> of {discardPile.length}
              </span>
            </div>
            <button
              type="button"
              onClick={closeDiscardPile}
              className="h-8 px-4 rounded-xl bg-tavern-surface hover:bg-tavern-card text-parchment text-xs font-bold transition-all border border-tavern-border cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
