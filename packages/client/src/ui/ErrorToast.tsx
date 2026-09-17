import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';

export function ErrorToast() {
  const errorMessage = useGameStore((state) => state.errorMessage);
  const errorTimestamp = useGameStore((state) => state.errorTimestamp);
  const clearError = useGameStore((state) => state.clearError);

  useEffect(() => {
    if (!errorMessage) return;

    const timer = setTimeout(() => {
      clearError();
    }, 5000);

    return () => clearTimeout(timer);
  }, [errorMessage, errorTimestamp, clearError]);

  return (
    <AnimatePresence>
      {errorMessage && (
        <motion.div
          key={errorTimestamp || 'error-toast'}
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-crimson/95 border border-red-400/60 rounded-xl shadow-2xl backdrop-blur-md text-white font-display text-sm pointer-events-auto select-none"
        >
          <span className="text-base leading-none select-none" aria-hidden="true">
            ⚠️
          </span>
          <span className="leading-snug break-words max-w-md select-text">
            {errorMessage}
          </span>
          <button
            type="button"
            onClick={clearError}
            className="ml-2 text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer select-none leading-none text-base"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
