// Procedural Horror Sound Engine using Web Audio API

class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  // Sound nodes
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private heartGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;

  // Heartbeat loop state
  private heartRate: number = 70; // BPM
  private lastHeartBeatTime: number = 0;
  private isHeartActive: boolean = false;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startAmbience();
      this.isHeartActive = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  private startAmbience() {
    if (!this.ctx || !this.masterGain) return;

    // Sub-bass atmospheric drone
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Deep rumble oscillator (48Hz)
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Filter for muffled underground resonance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);

    // Slow creepy pitch modulation
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sawtooth';
    this.droneOsc2.frequency.setValueAtTime(55, this.ctx.currentTime);
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.droneOsc2.connect(osc2Gain);
    osc2Gain.connect(filter);

    this.droneOsc1.connect(filter);
    filter.connect(this.ambientGain);

    this.droneOsc1.start();
    this.droneOsc2.start();

    // Setup heart gain
    this.heartGain = this.ctx.createGain();
    this.heartGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.heartGain.connect(this.masterGain);
  }

  public updateHeartbeat(heartRateBpm: number, monsterDistance: number) {
    if (!this.ctx || !this.isHeartActive || !this.heartGain) return;
    this.heartRate = heartRateBpm;

    const now = this.ctx.currentTime;
    const interval = 60 / this.heartRate;

    // Volume scales up as monster gets closer or heart rate is high
    const proximityMultiplier = Math.max(0.2, 1 - Math.min(1, monsterDistance / 35));
    const targetGain = 0.2 + (proximityMultiplier * 0.7);
    this.heartGain.gain.setTargetAtTime(targetGain, now, 0.1);

    if (now - this.lastHeartBeatTime >= interval) {
      this.playHeartThump(now);
      this.lastHeartBeatTime = now;
    }
  }

  private playHeartThump(time: number) {
    if (!this.ctx || !this.heartGain) return;

    // First lub
    this.synthesizeThump(time, 65, 38, 0.12, 0.8);
    // Second dub (slightly softer, 0.14s later)
    this.synthesizeThump(time + 0.14, 55, 32, 0.15, 0.5);
  }

  private synthesizeThump(startTime: number, startFreq: number, endFreq: number, duration: number, peakGain: number) {
    if (!this.ctx || !this.heartGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.heartGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  public playFootstep(isSprint: boolean, isCrouch: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Filtered noise burst simulating wet concrete/metal floor
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCrouch ? 350 : (isSprint ? 900 : 600), now);

    const gain = this.ctx.createGain();
    const volume = isCrouch ? 0.06 : (isSprint ? 0.35 : 0.18);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isSprint ? 0.09 : 0.07));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  public playFlashlightClick() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playMonsterScreech() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Dissonant terrifying FM synth screech
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(420, now);
    carrier.frequency.exponentialRampToValueAtTime(180, now + 1.2);

    modulator.type = 'square';
    modulator.frequency.setValueAtTime(80, now);
    modGain.gain.setValueAtTime(300, now);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    mainGain.gain.setValueAtTime(0.01, now);
    mainGain.gain.linearRampToValueAtTime(0.7, now + 0.08);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    carrier.connect(mainGain);
    mainGain.connect(this.masterGain);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + 1.5);
    modulator.stop(now + 1.5);
  }

  public playMonsterRoarNear() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(75, now + 0.8);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, now);
    filter.Q.setValueAtTime(3.5, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.95);
  }

  public playItemPickup() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.26);
    });
  }

  public playFlareThrow() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Hissing flare crackle
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.random();
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  public playAlarmLoop() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.5);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  public playLockerEnter() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Metal door creak & heavy metallic latch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);

    // Latch thud
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(110, t);
      thudOsc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      thudGain.gain.setValueAtTime(0.4, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      thudOsc.connect(thudGain);
      thudGain.connect(this.masterGain);
      thudOsc.start(t);
      thudOsc.stop(t + 0.16);
    }, 180);
  }

  public playLockerExit() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Metal door swing open
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.32);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playMonsterFlee() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // High-pitched panicked screech & chemical recoil
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(680, now);
    osc1.frequency.exponentialRampToValueAtTime(190, now + 0.9);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(450, now);
    osc2.frequency.linearRampToValueAtTime(120, now + 0.9);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.0);
    osc2.stop(now + 1.0);
  }

  public playJumpscare() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Maximum sudden terror cluster chord
    const freqs = [180, 233, 277, 390, 830, 1150];
    freqs.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq + (Math.random() * 20 - 10), now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 1.3);
    });
  }

  public stopAll() {
    try {
      if (this.droneOsc1) { this.droneOsc1.stop(); this.droneOsc1.disconnect(); }
      if (this.droneOsc2) { this.droneOsc2.stop(); this.droneOsc2.disconnect(); }
      if (this.ctx) {
        this.ctx.close();
        this.ctx = null;
      }
    } catch {
      // ignore
    }
  }
}

export const soundEngine = new AudioManager();
