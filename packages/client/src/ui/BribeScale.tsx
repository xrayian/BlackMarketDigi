import { motion } from 'framer-motion';

interface BribeScaleProps {
  goldAmount: number;
  standCardCount: number;
  bagClaimCount: number;
  terms?: string;
  isOfferPending: boolean;
}

export function BribeScale({
  goldAmount,
  standCardCount,
  bagClaimCount,
  terms,
  isOfferPending,
}: BribeScaleProps) {
  // Compute total offer weight to drive scale angle
  // 1 gold = 1 unit weight, stand card = ~3 units, bag claim = ~3 units
  const totalWeight = goldAmount + standCardCount * 3 + bagClaimCount * 3;
  // Maximum tilt ±16 degrees
  const tiltAngle = Math.min(Math.max((totalWeight / 20) * 14, 0), 16);

  return (
    <div className="relative flex flex-col items-center select-none py-2">
      {/* Central Fulcrum & Pillar */}
      <div className="relative w-48 h-32 flex justify-center items-end">
        {/* Fulcrum base */}
        <div className="w-10 h-6 bg-gradient-to-t from-gold-dark to-gold rounded-t-lg shadow-md border border-gold-light/40 z-10" />

        {/* Vertical mast */}
        <div className="absolute bottom-6 w-3 h-20 bg-gradient-to-r from-tavern-border via-gold-dark to-tavern-border rounded-t-sm" />

        {/* Pivot fulcrum pin */}
        <div className="absolute top-6 w-5 h-5 rounded-full bg-gold-light border-2 border-gold-dark shadow-md z-20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-tavern-bg" />
        </div>

        {/* Tilting Balance Beam */}
        <motion.div
          animate={{ rotate: tiltAngle }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          className="absolute top-8 w-44 h-2 bg-gradient-to-r from-gold-dark via-gold-light to-gold-dark rounded-full shadow-lg origin-center"
        >
          {/* Left Pan Chains & Plate (Merchant Offer) */}
          <div className="absolute -left-3 top-2 flex flex-col items-center">
            <div className="w-[1px] h-10 bg-gold-light/70 shadow-sm" />
            <motion.div
              animate={{ rotate: -tiltAngle }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="w-16 h-5 rounded-b-2xl bg-gradient-to-b from-gold/70 to-gold-dark/90 border border-gold shadow-md flex items-center justify-center text-[10px] font-bold text-tavern-bg font-display"
            >
              {totalWeight > 0 ? (
                <span className="flex items-center gap-0.5">
                  <span>🪙</span>
                  <span>{goldAmount}</span>
                  {standCardCount + bagClaimCount > 0 && (
                    <span className="text-[9px] text-white">+{standCardCount + bagClaimCount}🃏</span>
                  )}
                </span>
              ) : (
                <span className="opacity-40">Empty</span>
              )}
            </motion.div>
          </div>

          {/* Right Pan Chains & Plate (Sheriff's Demand/Weight) */}
          <div className="absolute -right-3 top-2 flex flex-col items-center">
            <div className="w-[1px] h-10 bg-gold-light/70 shadow-sm" />
            <motion.div
              animate={{ rotate: -tiltAngle }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="w-16 h-5 rounded-b-2xl bg-gradient-to-b from-tavern-border to-tavern-card border border-gold-muted/50 shadow-md flex items-center justify-center text-[10px] text-gold-muted font-display"
            >
              <span>Sheriff</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scale Legend / Feedback */}
      <div className="mt-2 text-center text-xs font-body">
        {isOfferPending ? (
          <div className="text-gold font-display font-bold animate-pulse">
            Bribe Offer: {goldAmount} Gold
            {standCardCount > 0 && ` + ${standCardCount} Stand Goods`}
            {bagClaimCount > 0 && ` + ${bagClaimCount} Bag Goods`}
          </div>
        ) : (
          <div className="text-parchment/60 italic">Scale rests at equilibrium</div>
        )}
        {terms && (
          <div className="text-[11px] text-parchment/80 mt-0.5 italic max-w-xs truncate">
            "{terms}"
          </div>
        )}
      </div>
    </div>
  );
}
