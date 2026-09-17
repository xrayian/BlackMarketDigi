import { useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import type { ClientCard } from '../../state/gameStore';
import { useGameStore } from '../../state/gameStore';
import { CardDisplay } from '../CardDisplay';
import { soundManager } from '../../audio/soundManager';

interface FannedCardItemProps {
  card: ClientCard;
  index: number;
  totalCards: number;
  isSelected: boolean;
  isDraggable?: boolean;
  disabled?: boolean;
  onClick?: (card: ClientCard) => void;
}

function FannedCardItem({
  card,
  index,
  totalCards,
  isSelected,
  isDraggable = true,
  disabled = false,
  onClick,
}: FannedCardItemProps) {
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { card },
    disabled: disabled || !isDraggable,
  });

  // Calculate fan curvature
  const center = (totalCards - 1) / 2;
  const offsetFromCenter = index - center;

  // Maximum spread angle of ~14 deg on wings
  const angle = reducedMotion ? 0 : offsetFromCenter * Math.min(4.5, 26 / Math.max(totalCards, 1));
  const yArc = reducedMotion ? 0 : Math.abs(offsetFromCenter) * (totalCards > 5 ? 3 : 2);
  const xOffset = reducedMotion ? 0 : offsetFromCenter * -6;

  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    soundManager.playCardSlide();
    onClick?.(card);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative shrink-0 touch-none select-none outline-none focus:ring-2 focus:ring-gold rounded-xl"
      style={{
        zIndex: isDragging ? 0 : isHovered ? 100 : isSelected ? 30 + index : index + 10,
        marginLeft: index === 0 ? 0 : '-16px',
      }}
    >
      <motion.div
        animate={{
          x: xOffset,
          y: isDragging ? 0 : isSelected ? yArc - 24 : yArc,
          rotate: isDragging ? 0 : isSelected ? 0 : angle,
          opacity: isDragging ? 0.3 : 1,
          scale: isSelected ? 1.06 : 1,
        }}
        whileHover={
          disabled || isDragging
            ? undefined
            : {
                y: yArc - 32,
                rotate: 0,
                scale: 1.12,
                zIndex: 70,
                transition: { duration: reducedMotion ? 0.05 : 0.18, ease: 'easeOut' },
              }
        }
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{
          type: 'spring',
          stiffness: reducedMotion ? 1000 : 320,
          damping: 24,
        }}
        onClick={handleClick}
        className="relative cursor-grab active:cursor-grabbing"
      >
        <CardDisplay card={card} selected={isSelected} disabled={disabled} />

        {/* Selection Badge */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-1 bg-gold text-walnut-bg font-display font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-lg border border-white/60 flex items-center gap-0.5 z-20 pointer-events-none"
          >
            <span>✓</span>
            <span>Bag</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export interface HandCardFanProps {
  cards: ClientCard[];
  selectedCardIds: string[];
  onCardClick?: (card: ClientCard) => void;
  isDraggable?: boolean;
  disabled?: boolean;
  maxSelection?: number;
  emptyMessage?: string;
  className?: string;
}

export function HandCardFan({
  cards,
  selectedCardIds,
  onCardClick,
  isDraggable = true,
  disabled = false,
  emptyMessage = 'No cards in hand.',
  className = '',
}: HandCardFanProps) {
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-parchment/60 font-display italic text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-end justify-center py-4 px-6 overflow-visible max-w-full ${className}`}
      aria-label="Cards in hand"
    >
      {cards.map((card, index) => (
        <FannedCardItem
          key={card.id}
          card={card}
          index={index}
          totalCards={cards.length}
          isSelected={selectedCardIds.includes(card.id)}
          isDraggable={isDraggable}
          disabled={disabled}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}
