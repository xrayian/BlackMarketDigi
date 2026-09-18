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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
          className="relative w-full max-w-md max-h-[88vh] bg-tavern-bg border-2 border-gold/70 rounded-3xl shadow-2xl text-parchment flex flex-col overflow-hidden"
        >
          {/* Fixed Header Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-tavern-border bg-tavern-surface/70 shrink-0">
            <h2 className="font-display font-black text-lg sm:text-xl text-gold tracking-wide flex items-center gap-2 leading-none">
              <span>⚙️</span>
              <span>Game & Accessibility</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-parchment/60 hover:text-white text-base font-bold w-8 h-8 rounded-lg hover:bg-tavern-card inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
            {/* Audio Section */}
            <div className="space-y-2.5">
              <h3 className="font-display text-xs text-gold-muted uppercase tracking-wider font-bold">
                Audio & Haptics
              </h3>

              <label className="flex items-center justify-between p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border cursor-pointer hover:border-gold/40 transition-colors">
                <div>
                  <div className="font-display font-bold text-sm text-gold-light">🔊 Sound Effects</div>
                  <div className="text-xs text-parchment/60">Game sounds</div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="accent-gold h-5 w-5 rounded cursor-pointer shrink-0 ml-3"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border cursor-pointer hover:border-gold/40 transition-colors">
                <div>
                  <div className="font-display font-bold text-sm text-gold-light">🕯️ Tavern Hearth Ambience</div>
                  <div className="text-xs text-parchment/60">Ambient audio</div>
                </div>
                <input
                  type="checkbox"
                  checked={ambientEnabled}
                  onChange={(e) => setAmbientEnabled(e.target.checked)}
                  className="accent-gold h-5 w-5 rounded cursor-pointer shrink-0 ml-3"
                />
              </label>
            </div>

            {/* Accessibility & Display Section */}
            <div className="space-y-2.5">
              <h3 className="font-display text-xs text-gold-muted uppercase tracking-wider font-bold">
                Display & Accessibility
              </h3>

              <label className="flex items-center justify-between p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border cursor-pointer hover:border-gold/40 transition-colors">
                <div>
                  <div className="font-display font-bold text-sm text-gold-light">⛶ Fullscreen</div>
                  <div className="text-xs text-parchment/60">
                    Fills entire screen, hiding browser chrome &amp; taskbar
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isFullscreen}
                  onChange={() => toggleFullscreen()}
                  className="accent-gold h-5 w-5 rounded cursor-pointer shrink-0 ml-3"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-tavern-surface/80 border border-tavern-border cursor-pointer hover:border-gold/40 transition-colors">
                <div>
                  <div className="font-display font-bold text-sm text-gold-light">♿ Reduced Motion</div>
                  <div className="text-xs text-parchment/60">
                    Reduce animations
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="accent-gold h-5 w-5 rounded cursor-pointer shrink-0 ml-3"
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
                    <div className="font-display font-bold text-sm text-gold">Rulebook</div>
                    <div className="text-xs text-parchment/70">Complete beginner guide, turn phases, and rules</div>
                  </div>
                </div>
                <span className="text-gold font-bold text-sm shrink-0 ml-2">Read →</span>
              </button>
            </div>

            {/* Color-Blind / Indicator Guide */}
            <div className="p-3 rounded-xl bg-tavern-surface/50 border border-tavern-border/70 space-y-2">
              <h4 className="font-display text-[11px] text-gold-muted uppercase tracking-wider font-bold">
                Color-Independent Card Indicators
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-tavern-bg border border-emerald/40">
                  <span className="text-base block">⚖️</span>
                  <span className="font-bold text-emerald-400">Legal</span>
                </div>
                <div className="p-2 rounded-lg bg-tavern-bg border border-crimson/40">
                  <span className="text-base block">⚜️</span>
                  <span className="font-bold text-red-400">Contraband</span>
                </div>
                <div className="p-2 rounded-lg bg-tavern-bg border border-purple-500/40">
                  <span className="text-base block">👑</span>
                  <span className="font-bold text-purple-300">Royal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer Bar */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-tavern-border bg-tavern-surface/70 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-gold w-full h-10 rounded-xl font-display font-bold tracking-wider inline-flex items-center justify-center cursor-pointer shadow-md text-sm"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
