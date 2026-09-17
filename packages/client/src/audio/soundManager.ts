/**
 * Procedural Audio Synthesizer & Sound Manager for Nottingham
 * Leverages Web Audio API for zero-dependency, zero-latency, deterministic haptic audio.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private ambientEnabled = true;
  private ambientGainNode: GainNode | null = null;
  private ambientSources: { stop?: () => void; disconnect?: () => void }[] = [];
  private ambientCrackleTimer: any = null;
  private isAmbientPlaying = false;

  private getContext(): AudioContext | null {
    if (!this.enabled && !this.ambientEnabled) return null;
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

  public setAmbientEnabled(enabled: boolean) {
    this.ambientEnabled = enabled;
    if (!enabled) {
      this.stopAmbientLoop();
    } else if (!this.isAmbientPlaying) {
      this.startAmbientLoop();
    }
  }

  public isAmbientEnabled(): boolean {
    return this.ambientEnabled;
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

  /**
   * Tactile soft card slide / leather insertion sound effect.
   */
  public playCardSlide() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.1);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.1);
    filter.Q.setValueAtTime(2.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  }

  /**
   * Subtle metallic scale hinge creak / balance tipping sound.
   */
  public playScaleTip() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [360, 395].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq + (idx === 0 ? 12 : -10), now + 0.18);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    });
  }

  /**
   * Procedural cozy tavern ambience loop (hearth low rumble, gentle fireplace embers, subtle drone).
   */
  public startAmbientLoop() {
    if (this.isAmbientPlaying || !this.ambientEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isAmbientPlaying = true;
    const now = ctx.currentTime;

    // Master ambient gain node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.05, now + 2.0); // 2s smooth fade in
    masterGain.connect(ctx.destination);
    this.ambientGainNode = masterGain;

    // 1. Fireplace hearth rumble (lowpass noise)
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise approximation
      lastOut = data[i];
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(140, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSource.start(now);

    this.ambientSources.push({
      stop: () => {
        try { noiseSource.stop(); } catch {}
      },
      disconnect: () => {
        try { noiseSource.disconnect(); } catch {}
      }
    });

    // 2. Warm tavern harmonic drone (A1 + E2)
    [55, 82.4].forEach((freq) => {
      const osc = ctx.createOscillator();
      const droneGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      droneGain.gain.setValueAtTime(0.12, now);

      osc.connect(droneGain);
      droneGain.connect(masterGain);
      osc.start(now);

      this.ambientSources.push({
        stop: () => {
          try { osc.stop(); } catch {}
        },
        disconnect: () => {
          try { osc.disconnect(); } catch {}
        }
      });
    });

    // 3. Gentle fireplace ember micro-crackles
    const scheduleCrackle = () => {
      if (!this.isAmbientPlaying || !this.ambientGainNode) return;
      const cNow = ctx.currentTime;
      const crackleGain = ctx.createGain();
      const osc = ctx.createOscillator();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900 + Math.random() * 800, cNow);
      crackleGain.gain.setValueAtTime(0.015 + Math.random() * 0.02, cNow);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, cNow + 0.03);

      osc.connect(crackleGain);
      crackleGain.connect(masterGain);
      osc.start(cNow);
      osc.stop(cNow + 0.035);

      const nextInterval = 400 + Math.random() * 900;
      this.ambientCrackleTimer = setTimeout(scheduleCrackle, nextInterval);
    };

    this.ambientCrackleTimer = setTimeout(scheduleCrackle, 800);
  }

  /**
   * Smoothly stops the tavern ambience loop.
   */
  public stopAmbientLoop() {
    if (!this.isAmbientPlaying) return;
    this.isAmbientPlaying = false;

    if (this.ambientCrackleTimer) {
      clearTimeout(this.ambientCrackleTimer);
      this.ambientCrackleTimer = null;
    }

    if (this.ambientGainNode && this.ctx) {
      const now = this.ctx.currentTime;
      this.ambientGainNode.gain.cancelScheduledValues(now);
      this.ambientGainNode.gain.setValueAtTime(this.ambientGainNode.gain.value, now);
      this.ambientGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.5);

      setTimeout(() => {
        for (const src of this.ambientSources) {
          if (src.stop) src.stop();
          if (src.disconnect) src.disconnect();
        }
        this.ambientSources = [];
        this.ambientGainNode = null;
      }, 550);
    }
  }
}

export const soundManager = new SoundManager();
