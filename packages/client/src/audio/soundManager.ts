/**
 * Procedural Audio Synthesizer & Sound Manager for Nottingham
 * Leverages Web Audio API for zero-dependency, zero-latency, deterministic haptic audio.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Starts an ascending tension ramp sound for the 1.2s Unsnap Clasp hold.
   * Pitch climbs exponentially from 160Hz to 620Hz with a slight tremolo swell.
   * Returns a cancel function to stop cleanly if released before threshold.
   */
  public startTensionRamp(durationMs = 1200): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    const now = ctx.currentTime;
    const durationSec = durationMs / 1000;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    // Ascending tension frequency
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + durationSec);

    // LFO for pulse / heartbeat vibration
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(8, now);
    lfo.frequency.linearRampToValueAtTime(24, now + durationSec);

    lfoGain.gain.setValueAtTime(15, now);
    lfoGain.gain.linearRampToValueAtTime(50, now + durationSec);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Volume ramp
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.18, now + durationSec);

    // Lowpass filter to avoid harshness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    lfo.start(now);

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      const stopTime = ctx.currentTime;
      gain.gain.cancelScheduledValues(stopTime);
      gain.gain.setValueAtTime(gain.gain.value, stopTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.08);
      osc.stop(stopTime + 0.09);
      lfo.stop(stopTime + 0.09);
    };
  }

  /**
   * Crisp, punchy mechanical metal snap / latch sound.
   */
  public playSnap() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Transient noise click
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2400, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // Resonant metallic click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Metallic coin clink / chimes.
   */
  public playCoin() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [1960, 2480].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = now + idx * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, offset);

      gain.gain.setValueAtTime(0.15, offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(offset);
      osc.stop(offset + 0.32);
    });
  }

  /**
   * Authoritative wooden gavel / inspection strike stinger.
   */
  public playGavel() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.25);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Triumph chime when merchant is inspected honest.
   */
  public playHonestFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, offset);

      gain.gain.setValueAtTime(0.18, offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(offset);
      osc.stop(offset + 0.48);
    });
  }

  /**
   * Dramatic minor discord stinger when contraband is caught.
   */
  public playDishonestStinger() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [261.63, 311.13, 369.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.62);
    });
  }

  /**
   * Gentle chime when bag passes unopened.
   */
  public playPassChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [440, 554.37, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, offset);

      gain.gain.setValueAtTime(0.15, offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(offset);
      osc.stop(offset + 0.38);
    });
  }
}

export const soundManager = new SoundManager();
