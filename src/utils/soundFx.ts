// Lightweight procedural Web Audio API sound engine for tactile 3D HUD feedback

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Subtle mechanical/clay 3D button press thock */
  public playTactileClick(pitchMultiplier = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(52 * pitchMultiplier, now + 0.045);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Satisfying harmonic arpeggio when completing a task */
  public playTaskComplete() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Cmaj9 / Mint pastel chord notes (C5, E5, G5, B5, D6)
    const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const start = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.09 / (1 + idx * 0.15), start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, start + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /** Ambient phase transition chime when a time block starts or completes */
  public playPhaseTransition() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4 major warm ambient pad

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      const start = now + i * 0.08;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0005, start + 0.95);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 1.0);
    });
  }

  /** Sci-fi phase shift sound when toggling Ghost / Click-Through Mode (Ctrl+Shift+G) */
  public playGhostToggle(enteringGhost: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (enteringGhost) {
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.18);
    } else {
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.18);
    }

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }
  /** Gentle two-tone radar ping for periodic "Are you still doing X?" focus check-ins */
  public playCheckInPing() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 880.0]; // D5 -> A5 crisp fifth interval

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const start = now + idx * 0.14;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.48);
    });
  }
}

export const soundFx = new SoundEngine();
