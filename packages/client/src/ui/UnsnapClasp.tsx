import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../audio/soundManager';

interface UnsnapClaspProps {
  onInspect: () => void;
  onPass: () => void;
  disabled?: boolean;
}

const HOLD_DURATION_MS = 1200;
const CANCEL_THRESHOLD_MS = 1100;

export function UnsnapClasp({ onInspect, onPass, disabled = false }: UnsnapClaspProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const holdStartRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const stopAudioRef = useRef<(() => void) | null>(null);

  const handleCancel = useCallback(() => {
    if (isSnapping) return;
    setIsHolding(false);
    setProgress(0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
  }, [isSnapping]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || isSnapping) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    setIsHolding(true);
    holdStartRef.current = performance.now();

    // Start audio tension ramp
    stopAudioRef.current = soundManager.startTensionRamp(HOLD_DURATION_MS);

    const tick = () => {
      const elapsed = performance.now() - holdStartRef.current;
      const pct = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setProgress(pct);

      if (elapsed >= HOLD_DURATION_MS) {
        // Trigger irreversible snap!
        setIsSnapping(true);
        setIsHolding(false);
        soundManager.playSnap();
        if (stopAudioRef.current) {
          stopAudioRef.current();
          stopAudioRef.current = null;
        }
        setTimeout(() => {
          onInspect();
          setIsSnapping(false);
          setProgress(0);
        }, 150);
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isSnapping) return;
    const elapsed = performance.now() - holdStartRef.current;
    if (elapsed < CANCEL_THRESHOLD_MS) {
      // Released early -> cancel without inspection
      handleCancel();
    }
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stopAudioRef.current) stopAudioRef.current();
    };
  }, []);

  return (
    <div className="flex items-center gap-4 select-none">
      {/* Pass Unopened Button */}
      <button
        type="button"
        disabled={disabled || isHolding || isSnapping}
        onClick={onPass}
        className="px-5 py-3 rounded-xl bg-emerald/30 border border-emerald/60 text-emerald-300 hover:bg-emerald/40 hover:border-emerald font-display text-sm tracking-wider uppercase transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Pass Unopened 🕊️
      </button>

      {/* Unsnap Bag Clasp: Press & Hold interaction */}
      <div className="relative">
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handleCancel}
          onPointerLeave={handleCancel}
          className={`
            relative flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl border-2
            font-display text-sm tracking-wider uppercase font-bold cursor-pointer overflow-hidden
            transition-all duration-150 shadow-2xl
            ${
              disabled
                ? 'opacity-40 cursor-not-allowed bg-tavern-card border-tavern-border text-gold-muted'
                : isHolding
                ? 'bg-crimson/90 border-red-400 text-white scale-[1.02] ring-4 ring-crimson/40 shadow-[0_0_25px_rgba(155,44,44,0.6)]'
                : isSnapping
                ? 'bg-red-700 border-white text-white scale-95 shadow-[0_0_35px_rgba(255,255,255,0.8)]'
                : 'bg-gradient-to-b from-crimson/80 to-tavern-card border-crimson/80 text-parchment hover:border-red-400 hover:text-white'
            }
          `}
        >
          {/* Progress fill bar */}
          <motion.div
            className="absolute inset-0 bg-red-600/40 pointer-events-none origin-left"
            style={{ width: `${progress * 100}%` }}
          />

          <span className="text-lg leading-none">
            {isSnapping ? '💥' : isHolding ? '⚠️' : '🔓'}
          </span>

          <span className="relative z-10">
            {isSnapping
              ? 'SNAP!'
              : isHolding
              ? `Hold to Unsnap (${Math.round((1 - progress) * 1.2 * 10) / 10}s)`
              : 'Hold to Unsnap Bag'}
          </span>
        </div>

        {/* Small hold instruction hint */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-parchment/60 font-body">
          {isHolding ? 'Release now to cancel' : 'Press & hold 1.2s to inspect'}
        </div>
      </div>
    </div>
  );
}
