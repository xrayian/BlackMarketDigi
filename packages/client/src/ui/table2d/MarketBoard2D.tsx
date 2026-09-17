import { motion } from 'framer-motion';
import { useGameStore, type ClientCard } from '../../state/gameStore';
import { GOOD_TOKENS, MOTION_PRESETS } from '../../theme/tokens';

interface MarketBoard2DProps {
  drawPileCount: number;
  discardPileTop?: ClientCard;
}

export function MarketBoard2D({ drawPileCount, discardPileTop }: MarketBoard2DProps) {
  const phase = useGameStore((s) => s.phase);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const isMyMarketTurn = phase === 'MARKET' && activeMerchantId === localPlayerId;
  const transition = reducedMotion ? MOTION_PRESETS.instant : MOTION_PRESETS.settle;

  return (
    <motion.div
      layout
      transition={transition}
      className={`
        relative flex flex-col items-center justify-between
        w-72 md:w-80 p-4 rounded-3xl
        bg-tavern-surface/90 border-2 border-gold/40
        backdrop-blur-md shadow-2xl select-none
        ${isMyMarketTurn ? 'ring-4 ring-gold/40 border-gold' : ''}
      `}
    >
      {/* Market Stall Header */}
      <div className="flex items-center justify-between w-full border-b border-tavern-border pb-2">
        <span className="font-display font-black text-sm text-gold tracking-widest uppercase flex items-center gap-1.5">
          <span>🏛️</span>
          <span>Nottingham Market</span>
        </span>
        <span className="text-[10px] text-gold-muted font-display uppercase tracking-wider">
          Fair Trade
        </span>
      </div>

      {/* Center Market Decks */}
      <div className="flex items-center justify-around w-full py-4 gap-4">
        {/* Draw Pile */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-20 h-28 rounded-xl bg-gradient-to-br from-[#263430] to-[#141c19] border-2 border-[#8c6d37] shadow-lg flex items-center justify-center text-center p-2 group hover:border-gold transition-colors">
            {/* Card Stack Illusion Lines */}
            <div className="absolute -top-1 -right-1 w-full h-full rounded-xl border border-gold/30 bg-[#263430]/60 -z-10" />
            <div className="absolute -top-2 -right-2 w-full h-full rounded-xl border border-gold/20 bg-[#263430]/40 -z-20" />

            <div className="flex flex-col items-center">
              <span className="text-2xl">🏹</span>
              <span className="font-display text-[9px] text-gold-light mt-1 font-bold leading-tight">
                DRAW PILE
              </span>
            </div>

            {/* Remaining Count Badge */}
            <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-gold border border-tavern-bg text-tavern-bg font-display font-black text-[11px] shadow">
              {drawPileCount}
            </span>
          </div>
          <span className="text-[11px] font-display text-parchment/60 mt-1">Deck</span>
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-20 h-28 rounded-xl bg-tavern-bg/95 border-2 border-tavern-border shadow-lg flex flex-col items-center justify-between p-2 overflow-hidden">
            {discardPileTop ? (
              <>
                <div className="text-[10px] font-display font-bold text-center text-parchment leading-tight truncate w-full">
                  {discardPileTop.name}
                </div>
                <div className="text-2xl leading-none">
                  {discardPileTop.classification === 'ROYAL'
                    ? '👑'
                    : discardPileTop.classification === 'CONTRABAND'
                    ? '⚜️'
                    : GOOD_TOKENS[discardPileTop.goodType as keyof typeof GOOD_TOKENS]?.icon || '📦'}
                </div>
                <div className="flex items-center justify-between w-full text-[9px] font-bold text-gold bg-tavern-surface/80 px-1 rounded">
                  <span>🪙 {discardPileTop.value}</span>
                  <span>🛡️ {discardPileTop.penalty}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-parchment/30 text-xs italic">
                <span>Discard</span>
                <span>Empty</span>
              </div>
            )}
          </div>
          <span className="text-[11px] font-display text-parchment/60 mt-1">Discards</span>
        </div>
      </div>

      {/* Market Guidance Banner */}
      <div className="w-full text-center border-t border-tavern-border pt-2">
        {isMyMarketTurn ? (
          <span className="text-xs font-display font-bold text-emerald-400 animate-pulse">
            Your turn to discard and redraw!
          </span>
        ) : (
          <span className="text-[11px] text-parchment/50 font-body italic">
            Merchants may discard up to 5 cards and redraw in turn.
          </span>
        )}
      </div>
    </motion.div>
  );
}
