import { motion } from 'framer-motion';
import { ClientCard } from '../state/gameStore';

export function getCardEmoji(card: ClientCard): string {
  if (card.classification === 'ROYAL') {
    if (card.name.toLowerCase().includes('apple')) return '🍎';
    if (card.name.toLowerCase().includes('cheese')) return '🧀';
    if (card.name.toLowerCase().includes('bread')) return '🍞';
    if (card.name.toLowerCase().includes('chicken')) return '🐔';
    return '👑';
  }

  if (card.classification === 'CONTRABAND') {
    if (card.contrabandType === 'PEPPER' || card.name.toLowerCase().includes('pepper')) return '🌶️';
    if (card.contrabandType === 'MEAD' || card.name.toLowerCase().includes('mead')) return '🍺';
    if (card.contrabandType === 'SILK' || card.name.toLowerCase().includes('silk')) return '🧵';
    if (card.contrabandType === 'CROSSBOW' || card.name.toLowerCase().includes('crossbow')) return '⚔️';
    return '📦';
  }

  switch (card.goodType) {
    case 'APPLE': return '🍎';
    case 'CHEESE': return '🧀';
    case 'BREAD': return '🍞';
    case 'CHICKEN': return '🐔';
    default: return '❓';
  }
}

export function getCardColor(card: ClientCard): { bg: string; border: string } {
  if (card.classification === 'ROYAL') {
    return { bg: 'bg-royal/80', border: 'border-purple-400' };
  }
  if (card.classification === 'CONTRABAND') {
    return { bg: 'bg-crimson/80', border: 'border-red-500' };
  }

  switch (card.goodType) {
    case 'APPLE': return { bg: 'bg-emerald-800/80', border: 'border-emerald-600' };
    case 'CHEESE': return { bg: 'bg-amber-700/80', border: 'border-amber-500' };
    case 'BREAD': return { bg: 'bg-orange-800/80', border: 'border-orange-600' };
    case 'CHICKEN': return { bg: 'bg-yellow-700/80', border: 'border-yellow-500' };
    default: return { bg: 'bg-gray-800/80', border: 'border-gray-500' };
  }
}

export interface CardDisplayProps {
  card: ClientCard;
  selected: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function CardDisplay({ card, selected, disabled, onClick }: CardDisplayProps) {
  const colors = getCardColor(card);
  const emoji = getCardEmoji(card);

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      animate={{
        scale: selected ? 1.05 : 1,
      }}
      whileHover={disabled ? undefined : { scale: selected ? 1.05 : 1.03, filter: 'brightness(1.1)' }}
      className={`
        relative flex flex-col justify-between
        w-[80px] h-[112px] rounded-xl border-2
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-gold shadow-[0_0_15px_rgba(212,168,75,0.4)]' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        p-1.5 select-none overflow-hidden text-parchment
      `}
    >
      <div className="text-2xl text-center leading-none mt-1">{emoji}</div>
      
      <div className="font-display text-xs text-center leading-tight break-words flex-1 flex items-center justify-center">
        {card.name}
      </div>
      
      <div className="flex items-center justify-center gap-0.5 bg-tavern-surface/60 rounded py-0.5 mt-auto">
        <span className="text-[10px]">🪙</span>
        <span className="font-body text-xs font-bold">{card.value}</span>
      </div>
    </motion.div>
  );
}
