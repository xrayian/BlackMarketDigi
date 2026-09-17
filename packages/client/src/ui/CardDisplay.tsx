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
    return { bg: 'bg-[#4a154b]', border: 'border-purple-400' };
  }
  if (card.classification === 'CONTRABAND') {
    return { bg: 'bg-[#7f1d1d]', border: 'border-red-500' };
  }

  switch (card.goodType) {
    case 'APPLE': return { bg: 'bg-[#14532d]', border: 'border-emerald-500' };
    case 'CHEESE': return { bg: 'bg-[#78350f]', border: 'border-amber-400' };
    case 'BREAD': return { bg: 'bg-[#7c2d12]', border: 'border-orange-500' };
    case 'CHICKEN': return { bg: 'bg-[#0f4c81]', border: 'border-sky-400' };
    default: return { bg: 'bg-[#1f2937]', border: 'border-gray-500' };
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

  const classificationBadge =
    card.classification === 'ROYAL'
      ? { icon: '👑', label: 'Royal' }
      : card.classification === 'CONTRABAND'
      ? { icon: '⚜️', label: 'Contraband' }
      : { icon: '⚖️', label: 'Legal' };

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      animate={{
        scale: selected ? 1.05 : 1,
      }}
      whileHover={disabled ? undefined : { scale: selected ? 1.05 : 1.03, filter: 'brightness(1.1)' }}
      className={`
        relative flex flex-col justify-between
        w-[84px] h-[118px] rounded-xl border-2
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-gold shadow-[0_0_15px_rgba(212,168,75,0.6)]' : 'shadow-md'}
        ${disabled ? 'brightness-75 cursor-not-allowed' : 'cursor-pointer'}
        p-1.5 select-none overflow-hidden text-parchment
      `}
    >
      {/* Top Header: Classification Icon Badge (Color-independent indicator) */}
      <div className="flex items-center justify-between px-0.5">
        <span
          className="text-[10px] bg-[#0f0d0a] px-1 py-0.5 rounded border border-[#453324] font-display font-bold leading-none shadow-sm"
          title={`${classificationBadge.label} Good`}
        >
          {classificationBadge.icon}
        </span>
        <span className="text-[9px] text-parchment font-display font-bold uppercase tracking-tighter">
          {card.classification[0]}
        </span>
      </div>

      <div className="text-2xl text-center leading-none mt-0.5 filter drop-shadow">{emoji}</div>
      
      <div className="font-display text-[11px] font-bold text-center leading-tight break-words flex-1 flex items-center justify-center px-0.5 text-parchment">
        {card.name}
      </div>
      
      {/* Bottom stats: Value and Penalty */}
      <div className="flex items-center justify-between gap-1 bg-[#1a1714] border border-[#453324] rounded px-1.5 py-0.5 mt-auto text-[10px] shadow-sm">
        <div className="flex items-center gap-0.5 text-gold font-bold" title={`Value: ${card.value} Gold`}>
          <span>🪙</span>
          <span>{card.value}</span>
        </div>
        <div className="flex items-center gap-0.5 text-crimson-light font-bold" title={`Penalty: ${card.penalty} Gold`}>
          <span>🛡️</span>
          <span>{card.penalty}</span>
        </div>
      </div>
    </motion.div>
  );
}
