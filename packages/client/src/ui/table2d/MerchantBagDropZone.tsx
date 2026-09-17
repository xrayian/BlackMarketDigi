import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import type { ClientCard } from '../../state/gameStore';
import { useGameStore } from '../../state/gameStore';
import { soundManager } from '../../audio/soundManager';
import { getCardEmoji } from '../CardDisplay';

export interface MerchantBagDropZoneProps {
  loadedCards: ClientCard[];
  onRemoveCard: (cardId: string) => void;
  onSnapBag: () => void;
  isSnapped: boolean;
  disabled?: boolean;
}

export function MerchantBagDropZone({
  loadedCards,
  onRemoveCard,
  onSnapBag,
  isSnapped,
  disabled = false,
}: MerchantBagDropZoneProps) {
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const [isSquashing, setIsSquashing] = useState(false);
  const [prevCount, setPrevCount] = useState(loadedCards.length);
  const [isPuffing, setIsPuffing] = useState(false);

  const { isOver, setNodeRef } = useDroppable({
    id: 'merchant-bag-dropzone',
    disabled: isSnapped || disabled,
  });

  // Trigger puff animation when cards are added
  useEffect(() => {
    if (loadedCards.length > prevCount && !isSnapped) {
      setIsPuffing(true);
      const timer = setTimeout(() => setIsPuffing(false), 350);
      setPrevCount(loadedCards.length);
      return () => clearTimeout(timer);
    }
    setPrevCount(loadedCards.length);
  }, [loadedCards.length, prevCount, isSnapped]);

  const handleSnapClick = () => {
    if (loadedCards.length < 1 || loadedCards.length > 5 || isSnapped || disabled) return;

    soundManager.playSnap();
    setIsSquashing(true);

    setTimeout(() => {
      setIsSquashing(false);
      onSnapBag();
    }, 280);
  };

  const canSnap = loadedCards.length >= 1 && loadedCards.length <= 5 && !isSnapped && !disabled;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Droppable Bag Container */}
      <div
        ref={setNodeRef}
        className="relative flex flex-col items-center justify-center select-none"
      >
        <motion.div
          animate={
            isSquashing
              ? {
                  scaleY: [1, 0.65, 1.12, 1],
                  scaleX: [1, 1.25, 0.94, 1],
                  transition: { duration: 0.28, ease: 'easeInOut' },
                }
              : isPuffing && !reducedMotion
              ? {
                  scale: [1, 1.14, 0.96, 1],
                  rotate: [0, -2, 1, 0],
                  transition: { duration: 0.35, ease: 'easeOut' },
                }
              : { scale: 1, rotate: 0 }
          }
          className={`
            relative w-52 h-44 rounded-3xl p-4 flex flex-col items-center justify-between
            transition-all duration-200 border-2
            ${
              isOver
                ? 'bg-amber-950/90 border-gold ring-4 ring-gold/80 shadow-[0_0_35px_rgba(212,168,75,0.7)] scale-105'
                : isSnapped
                ? 'bg-walnut-card/95 border-emerald/60 shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
                : 'bg-walnut-surface/90 border-gold/40 hover:border-gold/70 shadow-[0_8px_25px_rgba(0,0,0,0.5)]'
            }
          `}
        >
          {/* Decorative Bag Leather Tie & Cinch Mouth */}
          <div className="absolute -top-3 inset-x-8 h-4 bg-[#3a2213] border-t-2 border-x-2 border-gold/40 rounded-t-full flex items-center justify-center shadow-inner">
            <div className="w-8 h-1.5 bg-gold/70 rounded-full" />
          </div>

          {/* Bag Face: Icon & Status */}
          <div className="flex flex-col items-center mt-2">
            <span className="text-4xl filter drop-shadow-md">
              {isSnapped ? '🔒' : isOver ? '📥' : '💼'}
            </span>
            <span className="font-display font-black text-sm tracking-wider uppercase mt-1 text-gold">
              {isSnapped ? 'Sealed Pouch' : 'Merchant Bag'}
            </span>
            <span className="text-xs font-body text-parchment/70">
              {isSnapped
                ? `${loadedCards.length} Goods Stowed`
                : isOver
                ? 'Drop to stow here!'
                : 'Drag or click cards to stow'}
            </span>
          </div>

          {/* Capacity Progress Bar / Counter */}
          <div className="w-full flex items-center justify-between gap-2 px-2 py-1 bg-walnut-bg/80 border border-gold/20 rounded-xl">
            <span className="text-[11px] font-display text-parchment/80">Stowed:</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const isFilled = slotIdx < loadedCards.length;
                return (
                  <div
                    key={slotIdx}
                    className={`w-4 h-3.5 rounded-sm border flex items-center justify-center text-[9px] font-bold ${
                      isFilled
                        ? 'bg-gold border-gold-light text-walnut-bg'
                        : 'bg-walnut-card border-tavern-border text-parchment/30'
                    }`}
                  >
                    {isFilled ? '✓' : ''}
                  </div>
                );
              })}
            </div>
            <span className="text-xs font-display font-bold text-gold">
              {loadedCards.length}/5
            </span>
          </div>

          {/* Wax Seal Overlay when Snapped */}
          <AnimatePresence>
            {isSnapped && (
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -25 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="absolute inset-0 m-auto w-20 h-20 bg-crimson border-2 border-gold rounded-full flex flex-col items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.7)] text-gold z-30"
              >
                <span className="text-xl">🔒</span>
                <span className="text-[9px] font-display font-black tracking-widest uppercase">
                  SEALED
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Mini Tray of Loaded Cards (Allows quick unloading) */}
      {!isSnapped && loadedCards.length > 0 && (
        <div className="flex items-center gap-1.5 p-2 bg-walnut-card/90 border border-gold/30 rounded-2xl backdrop-blur-sm shadow-lg">
          <span className="text-xs font-display text-gold-muted px-1">Inside:</span>
          {loadedCards.map((card) => (
            <motion.button
              key={card.id}
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                soundManager.playCardSlide();
                onRemoveCard(card.id);
              }}
              className="group relative flex items-center gap-1 bg-tavern-surface hover:bg-crimson/30 border border-tavern-border hover:border-crimson px-2 py-1 rounded-lg text-xs font-display text-parchment transition-all cursor-pointer"
              title={`Click to remove ${card.name} from bag`}
            >
              <span>{getCardEmoji(card)}</span>
              <span className="truncate max-w-[65px]">{card.name}</span>
              <span className="text-parchment/40 group-hover:text-crimson font-bold ml-0.5">✕</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Snap Bag Shut Button */}
      {!isSnapped && (
        <motion.button
          type="button"
          whileHover={canSnap ? { scale: 1.04 } : undefined}
          whileTap={canSnap ? { scale: 0.96 } : undefined}
          disabled={!canSnap}
          onClick={handleSnapClick}
          className={`
            px-7 py-2.5 rounded-xl font-display font-black text-sm tracking-wider uppercase flex items-center gap-2 shadow-xl border
            ${
              canSnap
                ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-walnut-bg border-gold-light shadow-[0_0_20px_rgba(212,168,75,0.4)] cursor-pointer'
                : 'bg-tavern-surface text-parchment/40 border-tavern-border cursor-not-allowed opacity-60'
            }
          `}
        >
          <span>🔒</span>
          <span>Snap Bag Shut ({loadedCards.length})</span>
        </motion.button>
      )}
    </div>
  );
}
