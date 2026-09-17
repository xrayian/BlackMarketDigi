import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { MOTION_PRESETS } from '../../theme/tokens';
import { NegotiationLedger } from './NegotiationLedger';

export function ActionLedger() {
  const [isOpen, setIsOpen] = useState(false);
  const phase = useGameStore((s) => s.phase);
  const round = useGameStore((s) => s.round);
  const lastInspectionResult = useGameStore((s) => s.lastInspectionResult);
  const activeBribe = useGameStore((s) => s.activeBribe);
  const negotiationFeed = useGameStore((s) => s.negotiationFeed);
  const playersMap = useGameStore((s) => s.players);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const [activeTab, setActiveTab] = useState<'TOWN_LOG' | 'NEGOTIATIONS'>(
    phase === 'INSPECTION' ? 'NEGOTIATIONS' : 'TOWN_LOG'
  );

  useEffect(() => {
    if (phase === 'INSPECTION') {
      setActiveTab('NEGOTIATIONS');
    }
  }, [phase]);

  const openOffersCount = negotiationFeed.filter((o) => o.status === 'OPEN').length;

  // Derive a dynamic chronological log of recent high-level game events
  const ledgerEntries = useMemo(() => {
    const entries: Array<{ id: string; time: string; text: string; icon: string; highlight?: boolean }> = [];

    entries.push({
      id: 'round-start',
      time: `Round ${round || 1}`,
      text: `Caravan trading underway. Current phase: ${phase?.replace('_', ' ') || 'MARKET'}.`,
      icon: '📜',
    });

    if (activeBribe && activeBribe.gold > 0) {
      const fromP = playersMap.get(activeBribe.fromPlayerId)?.name || 'Merchant';
      const toP = playersMap.get(activeBribe.toPlayerId)?.name || 'Sheriff';
      entries.push({
        id: `bribe-${activeBribe.id}-${activeBribe.sequenceNumber}`,
        time: 'Negotiation',
        text: `${fromP} offered ${activeBribe.gold} Gold to ${toP}.`,
        icon: '⚖️',
        highlight: true,
      });
    }

    if (lastInspectionResult) {
      entries.push({
        id: `insp-${lastInspectionResult.targetPlayerId}-${lastInspectionResult.outcome}`,
        time: 'Inspection',
        text: `${lastInspectionResult.sheriffName} examined ${lastInspectionResult.targetPlayerName}: ${lastInspectionResult.outcome} (${lastInspectionResult.keptCardsCount} kept, ${lastInspectionResult.confiscatedCardsCount} confiscated).`,
        icon: lastInspectionResult.outcome === 'HONEST' ? '🎺' : lastInspectionResult.outcome === 'DISHONEST' ? '⚔️' : '🤝',
        highlight: true,
      });
    }

    return entries;
  }, [phase, round, activeBribe, lastInspectionResult, playersMap]);

  const transition = reducedMotion ? MOTION_PRESETS.instant : MOTION_PRESETS.settle;

  return (
    <>
      {/* Drawer Toggle Tab for Mobile / Smaller Screens */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-0 z-30 flex items-center gap-1.5 px-3 py-2 rounded-l-xl bg-tavern-surface/95 border-y border-l border-gold/50 backdrop-blur-md shadow-xl text-gold hover:text-white transition-all font-display text-xs font-bold"
        title="Town Ledger & Negotiation Feed"
      >
        <span>{phase === 'INSPECTION' ? '🤝' : '📜'}</span>
        <span className="hidden sm:inline">Ledger</span>
        {phase === 'INSPECTION' && openOffersCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-gold text-tavern-bg font-black text-[10px] flex items-center justify-center">
            {openOffersCount}
          </span>
        )}
      </button>

      {/* Drawer Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={transition}
            className="fixed top-0 right-0 bottom-0 w-84 md:w-96 bg-tavern-bg/95 border-l-2 border-gold/50 backdrop-blur-md shadow-2xl p-4 z-40 flex flex-col text-parchment"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-tavern-border pb-2.5 mb-2.5">
              <div className="flex items-center gap-2 font-display font-black text-gold text-sm tracking-wider uppercase">
                <span>📜</span>
                <span>Nottingham Town Ledger</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-parchment/60 hover:text-white font-bold text-base"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 border-b border-tavern-border pb-2 mb-3 text-xs font-display">
              <button
                type="button"
                onClick={() => setActiveTab('NEGOTIATIONS')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'NEGOTIATIONS'
                    ? 'bg-gold/25 border-gold text-gold shadow-sm'
                    : 'bg-tavern-surface/50 border-tavern-border text-parchment/60 hover:text-parchment'
                }`}
              >
                <span>🤝 Bribe Ledger</span>
                {openOffersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-gold text-tavern-bg font-black text-[10px]">
                    {openOffersCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TOWN_LOG')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'TOWN_LOG'
                    ? 'bg-gold/25 border-gold text-gold shadow-sm'
                    : 'bg-tavern-surface/50 border-tavern-border text-parchment/60 hover:text-parchment'
                }`}
              >
                <span>📜 Town Log</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === 'NEGOTIATIONS' ? (
                <NegotiationLedger />
              ) : (
                <div className="space-y-2.5 text-xs">
                  {ledgerEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        entry.highlight
                          ? 'bg-tavern-surface border-gold/40 shadow-sm'
                          : 'bg-tavern-surface/50 border-tavern-border'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-gold-muted font-display uppercase tracking-wider mb-1">
                        <span className="flex items-center gap-1">
                          <span>{entry.icon}</span>
                          <span>{entry.time}</span>
                        </span>
                      </div>
                      <p className="text-parchment font-body leading-relaxed">{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="border-t border-tavern-border pt-2 text-[10px] text-center text-parchment/50 italic">
              Official records kept under the authority of Nottingham.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
