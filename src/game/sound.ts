import { WorldTheme } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private musicVolume: number = 0.7; // 0..1
  private sfxVolume: number = 0.85; // 0..1
  private bgmInterval: number | null = null;
  private currentTheme: WorldTheme = 'VERDANT_HOLLOW';
  private stepIndex: number = 0;

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public configureAudio(params: {
    muted: boolean;
    musicVolume: number; // 0..100
    sfxVolume: number; // 0..100
  }): void {
    this.muted = params.muted;
    this.musicVolume = Math.max(0, Math.min(1, params.musicVolume / 100));
    this.sfxVolume = Math.max(0, Math.min(1, params.sfxVolume / 100));
    if (this.muted || this.musicVolume <= 0.01) {
      this.stopMusic();
    }
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute) {
      this.stopMusic();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getSfxGain(baseGain: number): number {
    if (this.muted || this.sfxVolume <= 0.01) return 0;
    return baseGain * this.sfxVolume;
  }

  public playJump(isArmored: boolean): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.09);
    if (!ctx || vol <= 0) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    const now = ctx.currentTime;
    const startFreq = isArmored ? 195 : 245;
    const endFreq = isArmored ? 540 : 640;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playDoubleJump(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.095);
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(370, now);
    osc.frequency.exponentialRampToValueAtTime(622.25, now + 0.06);
    osc.frequency.setValueAtTime(554.37, now + 0.065);
    osc.frequency.exponentialRampToValueAtTime(932.33, now + 0.16);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playCoin(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.08);
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    // Crystalline Rune Shard chime (A5 -> E6)
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.06);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  public playRelicCollect(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.1);
    if (!ctx || vol <= 0) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(vol, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + (i + 1) * 0.075);
    });
  }

  public playCheckpoint(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.095);
    if (!ctx || vol <= 0) return;

    const notes = [440, 554.37, 659.25, 880];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(vol, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + (i + 1) * 0.085);
    });
  }

  public playBump(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.13);
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playBrickSmash(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.17);
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.14;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.exponentialRampToValueAtTime(170, now + 0.14);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playPowerUpAppear(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.065);
    if (!ctx || vol <= 0) return;

    const notes = [349.23, 440, 523.25, 659.25, 783.99];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(vol, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + (i + 1) * 0.048);
    });
  }

  public playPowerUpCollect(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.08);
    if (!ctx || vol <= 0) return;

    const notes = [392, 493.88, 587.33, 783.99, 987.77, 1174.66];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      gain.gain.setValueAtTime(vol, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + (i + 1) * 0.052);
    });
  }

  public playOneUp(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.085);
    if (!ctx || vol <= 0) return;

    const notes = [587.33, 740, 880, 1174.66, 1480];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(vol, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + (i + 1) * 0.075);
    });
  }

  public playStomp(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.1);
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.11);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.125);
  }

  public playKick(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.14);
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(135, now + 0.09);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playFireball(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.075);
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.075);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playThwompSlam(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.18);
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.22);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playPowerDown(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.085);
    if (!ctx || vol <= 0) return;

    const notes = [587.33, 493.88, 392, 329.63, 261.63];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(vol, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + (i + 1) * 0.055);
    });
  }

  public playStageClear(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.095);
    if (!ctx || vol <= 0) return;

    // Original Mushbound Rune Victory Fanfare
    const notes = [
      { f: 440.0, d: 0.1 },
      { f: 554.37, d: 0.1 },
      { f: 659.25, d: 0.1 },
      { f: 880.0, d: 0.15 },
      { f: 659.25, d: 0.1 },
      { f: 880.0, d: 0.36 },
    ];
    let t = ctx.currentTime;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.d + 0.01);
      t += n.d * 1.05;
    });
  }

  public playGameOver(): void {
    const ctx = this.getContext();
    const vol = this.getSfxGain(0.11);
    if (!ctx || vol <= 0) return;

    const notes = [
      { f: 440.0, d: 0.16 },
      { f: 392.0, d: 0.16 },
      { f: 349.23, d: 0.18 },
      { f: 329.63, d: 0.35 },
    ];
    let t = ctx.currentTime;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.d + 0.01);
      t += n.d * 1.05;
    });
  }

  public startMusic(theme: WorldTheme): void {
    this.currentTheme = theme;
    this.stopMusic();
    if (this.muted || this.musicVolume <= 0.01) return;

    this.stepIndex = 0;

    // Original fantasy arpeggio sequences per World Theme
    const verdantNotes = [
      440.0, 523.25, 659.25, 523.25, 587.33, 659.25, 783.99, 0,
      659.25, 587.33, 523.25, 440.0, 392.0, 440.0, 523.25, 0,
    ];
    const crystalNotes = [
      523.25, 0, 783.99, 659.25, 0, 987.77, 783.99, 0,
      440.0, 0, 659.25, 523.25, 0, 783.99, 659.25, 0,
    ];
    const emberNotes = [
      293.66, 349.23, 440.0, 293.66, 329.63, 392.0, 440.0, 0,
      261.63, 329.63, 392.0, 261.63, 293.66, 349.23, 293.66, 0,
    ];
    const skyrootNotes = [
      587.33, 740.0, 880.0, 740.0, 659.25, 783.99, 987.77, 0,
      880.0, 740.0, 659.25, 587.33, 493.88, 587.33, 740.0, 0,
    ];
    const keepNotes = [
      246.94, 293.66, 369.99, 293.66, 261.63, 311.13, 392.0, 311.13,
      246.94, 233.08, 246.94, 293.66, 369.99, 293.66, 246.94, 0,
    ];

    const tempoMs =
      theme === 'RUNEHEART_KEEP'
        ? 135
        : theme === 'EMBERFALL_PEAKS'
        ? 145
        : theme === 'SKYROOT_CITADEL'
        ? 150
        : 165;

    this.bgmInterval = window.setInterval(() => {
      if (this.muted || this.musicVolume <= 0.01) return;
      const ctx = this.getContext();
      if (!ctx) return;

      const seq =
        this.currentTheme === 'CRYSTAL_CAVERNS'
          ? crystalNotes
          : this.currentTheme === 'EMBERFALL_PEAKS'
          ? emberNotes
          : this.currentTheme === 'SKYROOT_CITADEL'
          ? skyrootNotes
          : this.currentTheme === 'RUNEHEART_KEEP'
          ? keepNotes
          : verdantNotes;

      const freq = seq[this.stepIndex % seq.length];
      this.stepIndex++;

      if (freq > 0) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type =
          this.currentTheme === 'CRYSTAL_CAVERNS'
            ? 'sine'
            : this.currentTheme === 'RUNEHEART_KEEP'
            ? 'sawtooth'
            : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        const vol = 0.032 * this.musicVolume;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.135);
      }
    }, tempoMs);
  }

  public stopMusic(): void {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const sound = new SoundEngine();
