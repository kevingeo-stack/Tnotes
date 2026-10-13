/**
 * Web Audio engine for Metronome, Pitch Reference Drone (A=440Hz),
 * and brass note playback.
 */
export class TrumpetAudioEngine {
  private static instance: TrumpetAudioEngine | null = null;
  private ctx: AudioContext | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private isDronePlaying: boolean = false;

  private constructor() {}

  public static getInstance(): TrumpetAudioEngine {
    if (!TrumpetAudioEngine.instance) {
      TrumpetAudioEngine.instance = new TrumpetAudioEngine();
    }
    return TrumpetAudioEngine.instance;
  }

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Plays a crisp metronome click
   */
  public playMetronomeClick(isDownbeat: boolean = false): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isDownbeat ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isDownbeat ? 1200 : 880, ctx.currentTime);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio context restricted until user gesture
    }
  }

  /**
   * Toggles continuous acoustic reference drone at frequency (default 440Hz A4)
   */
  public toggleDrone(frequency: number = 440): boolean {
    if (this.isDronePlaying) {
      this.stopDrone();
      return false;
    } else {
      this.startDrone(frequency);
      return true;
    }
  }

  public isDroneActive(): boolean {
    return this.isDronePlaying;
  }

  public startDrone(frequency: number = 440): void {
    try {
      const ctx = this.getAudioContext();
      if (this.isDronePlaying) this.stopDrone();

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.1);

      // Fundamental tone
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Warm octave overtone filtered
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(frequency * 2, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      this.droneOsc1 = osc1;
      this.droneOsc2 = osc2;
      this.droneGain = gain;
      this.isDronePlaying = true;
    } catch {
      this.isDronePlaying = false;
    }
  }

  public stopDrone(): void {
    try {
      if (this.droneGain && this.ctx) {
        this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, this.ctx.currentTime);
        this.droneGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
      }
      setTimeout(() => {
        this.droneOsc1?.stop();
        this.droneOsc2?.stop();
        this.droneOsc1?.disconnect();
        this.droneOsc2?.disconnect();
        this.droneGain?.disconnect();
        this.droneOsc1 = null;
        this.droneOsc2 = null;
        this.droneGain = null;
      }, 90);
    } catch {
      // Safe cleanup
    }
    this.isDronePlaying = false;
  }

  /**
   * Plays a brass note preview tone for a specific frequency
   */
  public playNoteTone(frequency: number, duration: number = 0.5): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(1800, frequency * 3), ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  }
}
