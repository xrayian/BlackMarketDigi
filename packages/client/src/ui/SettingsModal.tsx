import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const ambientEnabled = useGameStore((s) => s.ambientEnabled);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const setAmbientEnabled = useGameStore((s) => s.setAmbientEnabled);
  const setReducedMotion = useGameStore((s) => s.setReducedMotion);
  const isFullscreen = useGameStore((s) => s.isFullscreen);
  const toggleFullscreen = useGameStore((s) => s.toggleFullscreen);
  const openRulebook = useGameStore((s) => s.openRulebook);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
          className="w-full max-w-md bg-tavern-bg border border-gold/60 rounded-3xl p-6 shadow-2xl text-parchment flex flex-col gap-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-tavern-border pb-3">
            <h2 className="font-display font-black text-xl text-gold tracking-wide flex items-center gap-2">
              <span>⚙️</span>
              <span>Game & Accessibility Settings</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-parchment/60 hover:text-white text-lg font-bold px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>

          {/* Audio Section */}
          <div className="space-y-3">
            <h3 className="font-display text-xs text-gold-muted uppercase tracking-wider font-bold">
              Audio & Haptics
            </h3>

            <label className="flex items-center justify-between p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border cursor-pointer hover:border-gold/40 transition-colors">
              <div>
                <div className="font-display font-bold text-sm text-gold-light">🔊 Sound Effects</div>
                <div className="text-xs text-parchment/60">Bag snap, tension ramp, coin clinks, gavel</div>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="accent-gold h-5 w-5 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border cursor-pointer hover:border-gold/40 transition-colors">
              <div>
                <div className="font-display font-bold text-sm text-gold-light">🕯️ Tavern Hearth Ambience</div>
                <div className="text-xs text-parchment/60">Crackling fireplace and atmospheric low drone</div>
              </div>
              <input
                type="checkbox"
                checked={ambientEnabled}
                onChange={(e) => setAmbientEnabled(e.target.checked)}
                className="accent-gold h-5 w-5 rounded"
              />
            </label>
          </div>

          {/* Accessibility & Display Section */}
          <div className="space-y-3">
            <h3 className="font-display text-xs text-gold-muted uppercase tracking-wider font-bold">
              Display, Accessibility & Guides
            </h3>

            <label className="flex items-center justify-between p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border cursor-pointer hover:border-gold/40 transition-colors">
              <div>
                <div className="font-display font-bold text-sm text-gold-light">⛶ Immersive Fullscreen Mode</div>
                <div className="text-xs text-parchment/60">
                  Fills your entire screen, hiding browser chrome and taskbars
                </div>
              </div>
              <input
                type="checkbox"
                checked={isFullscreen}
                onChange={() => toggleFullscreen()}
                className="accent-gold h-5 w-5 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border cursor-pointer hover:border-gold/40 transition-colors">
              <div>
                <div className="font-display font-bold text-sm text-gold-light">♿ Reduced Motion</div>
                <div className="text-xs text-parchment/60">
                  Disables camera easing/tweening and excessive spring bounce
                </div>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="accent-gold h-5 w-5 rounded cursor-pointer"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                onClose();
                openRulebook();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#2a1d13] border border-gold/40 hover:border-gold hover:bg-[#382619] transition-all cursor-pointer text-left shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📖</span>
                <div>
                  <div className="font-display font-bold text-sm text-gold">Nottingham Codex & Rulebook</div>
                  <div className="text-xs text-parchment/70">Complete beginner guide, turn phases, penalties, and tips</div>
                </div>
              </div>
              <span className="text-gold font-bold text-sm">Read →</span>
            </button>
          </div>

          {/* Color-Blind / Indicator Guide */}
          <div className="p-3 rounded-xl bg-tavern-surface/50 border border-tavern-border/70 space-y-2">
            <h4 className="font-display text-[11px] text-gold-muted uppercase tracking-wider font-bold">
              Color-Independent Card Indicators
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-1.5 rounded bg-tavern-bg border border-emerald/40">
                <span className="text-base block">⚖️</span>
                <span className="font-bold text-emerald-400">Legal</span>
              </div>
              <div className="p-1.5 rounded bg-tavern-bg border border-crimson/40">
                <span className="text-base block">⚜️</span>
                <span className="font-bold text-red-400">Contraband</span>
              </div>
              <div className="p-1.5 rounded bg-tavern-bg border border-purple-500/40">
                <span className="text-base block">👑</span>
                <span className="font-bold text-purple-300">Royal</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="btn-gold w-full py-2.5 rounded-xl font-display font-bold tracking-wider"
          >
            Done
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
