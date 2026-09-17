import { useState, useRef, useEffect, useCallback, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../audio/soundManager';
import { useGameStore } from '../state/gameStore';

interface UnsnapClaspProps {
  onInspect: () => void;
  onPass: () => void;
  disabled?: boolean;
}

const HOLD_DURATION_MS = 1200;
const CANCEL_THRESHOLD_MS = 1100;
const CIRCUMFERENCE = 2 * Math.PI * 40; // r = 40 => 251.327

export function UnsnapClasp({ onInspect, onPass, disabled = false }: UnsnapClaspProps) {
  const reducedMotion = useGameStore((s) => s.reducedMotion);
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

  const handlePointerDown = (e: PointerEvent) => {
    if (disabled || isSnapping) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    setIsHolding(true);
    holdStartRef.current = performance.now();

    // Start 1.2s audio tension ramp
    stopAudioRef.current = soundManager.startTensionRamp(HOLD_DURATION_MS);

    const tick = () => {
      const elapsed = performance.now() - holdStartRef.current;
      const pct = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setProgress(pct);

      if (elapsed >= HOLD_DURATION_MS) {
        // Trigger irreversible snap at 1.2s threshold
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
      // Released before 1.1s threshold -> cleanly cancel with no state mutation
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

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex items-center gap-6 select-none justify-center">
      {/* Pass Unopened Button */}
      <motion.button
        type="button"
        disabled={disabled || isHolding || isSnapping}
        onClick={onPass}
        whileHover={!disabled ? { scale: 1.05 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        className="px-6 py-3.5 rounded-2xl bg-emerald/30 border-2 border-emerald/60 text-emerald-300 hover:bg-emerald/40 hover:border-emerald font-display text-sm tracking-wider uppercase font-bold transition-all shadow-[0_4px_20px_rgba(5,150,105,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
      >
        <span>🕊️</span>
        <span>Pass Unopened</span>
      </motion.button>

      {/* 2D Radial Unsnap Clasp (Press & Hold) */}
      <div className="relative flex flex-col items-center">
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handleCancel}
          onPointerLeave={handleCancel}
          className={`
            relative w-24 h-24 rounded-full flex items-center justify-center cursor-pointer
            transition-transform duration-100 shadow-2xl touch-none
            ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
          `}
          title="Press and hold for 1.2s to snap open the merchant's bag"
        >
          {/* Radial SVG Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 96 96">
            {/* Background Track */}
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="#3b0764"
              strokeWidth="6"
              fill="none"
              className="opacity-40"
            />
            {/* Animated Radial Fill Ring */}
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke={isHolding ? '#ef4444' : '#d4a84b'}
              strokeWidth="6"
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={reducedMotion ? 0 : strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-75 ease-linear"
              style={{
                filter: isHolding ? 'drop-shadow(0 0 8px rgba(239,68,68,0.8))' : 'none',
              }}
            />
          </svg>

          {/* Inner Wax Seal / Clasp Body */}
          <motion.div
            animate={
              isSnapping
                ? { scale: [1, 1.25, 0.92, 1] }
                : isHolding
                ? { scale: [1, 1.06, 1] }
                : { scale: 1 }
            }
            transition={isHolding ? { repeat: Infinity, duration: 0.3 } : undefined}
            className={`
              w-[76px] h-[76px] rounded-full border-2 flex flex-col items-center justify-center text-center z-10 shadow-lg
              ${
                isSnapping
                  ? 'bg-red-700 border-white text-white shadow-[0_0_30px_rgba(255,255,255,0.9)]'
                  : isHolding
                  ? 'bg-gradient-to-b from-red-600 to-red-800 border-amber-300 text-white shadow-[0_0_25px_rgba(239,68,68,0.8)] ring-2 ring-red-400'
                  : 'bg-gradient-to-b from-amber-700/90 via-red-900 to-walnut-bg border-gold text-gold-light hover:border-gold-light hover:text-white shadow-[0_4px_15px_rgba(0,0,0,0.6)]'
              }
            `}
          >
            <span className="text-2xl leading-none filter drop-shadow">
              {isSnapping ? '💥' : isHolding ? '⚡' : '🔓'}
            </span>
            <span className="text-[10px] font-display font-black tracking-widest uppercase mt-0.5 leading-none">
              {isSnapping ? 'SNAP!' : isHolding ? 'HOLD' : 'UNSNAP'}
            </span>
          </motion.div>
        </div>

        {/* Hold Progress & Guidance Hint */}
        <div className="absolute -bottom-6 whitespace-nowrap text-[11px] font-display">
          {isHolding ? (
            <span className="text-red-400 font-bold animate-pulse">
              Hold {Math.max(0, Math.round((1 - progress) * 1.2 * 10) / 10)}s (Release to cancel)
            </span>
          ) : (
            <span className="text-parchment/60">Press & hold 1.2s to inspect</span>
          )}
        </div>
      </div>
    </div>
  );
}
