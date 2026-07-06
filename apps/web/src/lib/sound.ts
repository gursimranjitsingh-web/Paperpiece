'use client';

/**
 * Lightweight sound manager. Files live in /public/sounds and are played via
 * pooled HTMLAudioElements (cloned for overlap). Everything is best-effort:
 * missing files or blocked autoplay fail silently so the game never breaks if a
 * sound hasn't been added yet. Browsers require a user gesture before audio can
 * play, so the manager unlocks itself on the first interaction.
 */

export type SfxKey = 'capture' | 'kill' | 'death' | 'start' | 'countdown' | 'win' | 'click' | 'powerup';

const FILES: Record<SfxKey, string> = {
  capture: '/sounds/capture.mp3',
  kill: '/sounds/kill.mp3',
  death: '/sounds/death.mp3',
  start: '/sounds/start.mp3',
  countdown: '/sounds/countdown.mp3',
  win: '/sounds/win.mp3',
  click: '/sounds/click.mp3',
  powerup: '/sounds/powerup.mp3',
};

const VOLUME: Record<SfxKey, number> = {
  capture: 0.5,
  kill: 0.6,
  death: 0.6,
  start: 0.5,
  countdown: 0.4,
  win: 0.6,
  click: 0.3,
  powerup: 0.55,
};

const MUSIC_FILE = '/sounds/music.mp3';
const MUTE_KEY = 'paperpiece:muted';

class SoundManager {
  private muted = false;
  private unlocked = false;
  private cache = new Map<SfxKey, HTMLAudioElement>();
  private music: HTMLAudioElement | null = null;
  /** The currently-playing countdown beep, so it can be cut off / replaced. */
  private countdownNode: HTMLAudioElement | null = null;

  init(): void {
    if (typeof window === 'undefined') return;
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
    const unlock = (): void => {
      this.unlocked = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    if (this.music) this.music.muted = muted;
  }

  play(key: SfxKey): void {
    if (this.muted || !this.unlocked || typeof window === 'undefined') return;
    try {
      let base = this.cache.get(key);
      if (!base) {
        base = new Audio(FILES[key]);
        base.preload = 'auto';
        this.cache.set(key, base);
      }
      const node = base.cloneNode() as HTMLAudioElement;
      node.volume = VOLUME[key];
      void node.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  /**
   * Play a single countdown tick. Only one countdown beep plays at a time (each
   * tick replaces the last) and it's truncated to under a second, so a long
   * countdown.mp3 can't overlap itself or run past the 3-second countdown.
   */
  playCountdown(): void {
    if (this.muted || !this.unlocked || typeof window === 'undefined') return;
    try {
      this.stopCountdown();
      let base = this.cache.get('countdown');
      if (!base) {
        base = new Audio(FILES.countdown);
        base.preload = 'auto';
        this.cache.set('countdown', base);
      }
      const node = base.cloneNode() as HTMLAudioElement;
      node.volume = VOLUME.countdown;
      this.countdownNode = node;
      void node.play().catch(() => {});
      // Cut the beep off before the next tick (ticks are 1s apart).
      window.setTimeout(() => {
        if (this.countdownNode === node) this.stopCountdown();
      }, 900);
    } catch {
      /* ignore */
    }
  }

  /** Stop any in-flight countdown beep (e.g. when the match starts). */
  stopCountdown(): void {
    if (this.countdownNode) {
      try {
        this.countdownNode.pause();
        this.countdownNode.currentTime = 0;
      } catch {
        /* ignore */
      }
      this.countdownNode = null;
    }
  }

  startMusic(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.music) {
        this.music = new Audio(MUSIC_FILE);
        this.music.loop = true;
        this.music.volume = 0.25;
      }
      this.music.muted = this.muted;
      void this.music.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  stopMusic(): void {
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
    }
  }
}

export const sound = new SoundManager();
