import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';

export interface UnfurlingLedgerProps {
  debtPaidGold: number;
  liquidatedLegalCount?: number;
  liquidatedContrabandCount?: number;
  debtForgiven: number;
  debtorName: string;
  creditorName: string;
}

export function UnfurlingLedger({
  debtPaidGold,
  liquidatedLegalCount = 0,
  liquidatedContrabandCount = 0,
  debtForgiven,
  debtorName,
  creditorName,
}: UnfurlingLedgerProps) {
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const steps = [
    {
      id: 'gold',
      title: 'Step 1: Liquid Gold',
      desc: debtPaidGold > 0
        ? `Surrendered ${debtPaidGold} Gold coins to ${creditorName}`
        : '0 Gold available in purse',
      active: debtPaidGold > 0,
      icon: '🪙',
    },
    {
      id: 'legal',
      title: 'Step 2: Legal Stand Goods',
      desc: liquidatedLegalCount > 0
        ? `Forfeited ${liquidatedLegalCount} Legal Goods from Stand bins`
        : 'No legal stand goods seized',
      active: liquidatedLegalCount > 0,
      icon: '⚖️',
    },
    {
      id: 'contraband',
      title: 'Step 3: Contraband Goods',
      desc: liquidatedContrabandCount > 0
        ? `Forfeited ${liquidatedContrabandCount} Contraband from Vault`
        : 'No contraband goods seized',
      active: liquidatedContrabandCount > 0,
      icon: '⚜️',
    },
    {
      id: 'forgiveness',
      title: 'Step 4: Stand Exhaustion & Wipe',
      desc: debtForgiven > 0
        ? `Stand completely cleared! Remaining ${debtForgiven} debt wiped clean.`
        : 'Debt was fully settled prior to stand wipe.',
      active: debtForgiven > 0,
      icon: '📜',
      isPardon: debtForgiven > 0,
    },
  ];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.05 : 0.4, ease: 'easeOut' }}
      className="relative w-full bg-[#f4ebd0] text-[#2c1d11] rounded-2xl p-4 shadow-xl border-2 border-gold-dark/60 overflow-hidden font-body"
    >
      {/* Decorative Parchment Header Roll */}
      <div className="flex items-center justify-between border-b-2 border-[#d4be93] pb-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">📜</span>
          <span className="font-display font-black text-xs uppercase tracking-widest text-[#5c3c1a]">
            Royal Debt Liquidation Ledger
          </span>
        </div>
        <span className="text-[10px] font-display text-[#7a572a]">
          {debtorName} ➔ {creditorName}
        </span>
      </div>

      {/* Sequential Line Items */}
      <div className="flex flex-col gap-2 text-xs">
        {steps.map((step, idx) => {
          const delay = reducedMotion ? 0 : 0.2 + idx * 0.14;

          return (
            <motion.div
              key={step.id}
              initial={{ x: -15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay, duration: 0.25 }}
              className={`flex items-start justify-between p-2 rounded-lg border transition-all ${
                step.isPardon
                  ? 'bg-amber-100 border-amber-500 font-bold'
                  : step.active
                  ? 'bg-white/70 border-[#c4a97b]'
                  : 'bg-black/5 border-transparent opacity-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-base leading-tight mt-0.5">{step.icon}</span>
                <div className="flex flex-col text-left">
                  <span className="font-display font-bold text-xs text-[#41270c]">
                    {step.title}
                  </span>
                  <span className="text-[11px] text-[#553b1e] leading-snug">
                    {step.desc}
                  </span>
                </div>
              </div>

              {/* Resolution Strikethrough & Checkmark */}
              <div className="flex items-center gap-1 font-display font-bold text-xs shrink-0 ml-2">
                {step.active ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: delay + 0.15, type: 'spring' }}
                    className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-400 flex items-center gap-0.5 text-[10px]"
                  >
                    <span>✓</span>
                    <span>Resolved</span>
                  </motion.span>
                ) : (
                  <span className="text-black/30 text-[10px] italic">—</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Decorative Bottom Hem */}
      <div className="mt-2.5 pt-1.5 border-t border-[#d4be93] text-center text-[10px] text-[#7a572a] italic">
        Liquidation enforced in strict statutory sequence per Nottingham Shire Charter.
      </div>
    </motion.div>
  );
}
