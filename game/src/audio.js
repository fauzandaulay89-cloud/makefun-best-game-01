// All sound is synthesized with WebAudio — no audio files, no network.
// A tiny synth: short oscillator blips for shots and pickups, filtered
// noise for explosions, and a low pulse that keeps the void humming.

import { AUDIO } from './config.js';

export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  // Created lazily on the first user gesture: browsers block audio
  // before any interaction, so the title screen stays silent until then.
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : AUDIO.masterVolume;
    this.master.connect(this.context.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : AUDIO.masterVolume;
    return this.muted;
  }

  blip({ frequency = 440, endFrequency = null, duration = 0.08, type = 'square', volume = 0.2 }) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (endFrequency !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  noise({ duration = 0.3, volume = 0.3, lowpass = 1200 }) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
  }

  shoot() {
    this.blip({ frequency: 880, endFrequency: 320, duration: 0.07, type: 'square', volume: 0.08 });
  }

  enemyDown() {
    this.noise({ duration: 0.22, volume: 0.22, lowpass: 900 });
    this.blip({ frequency: 220, endFrequency: 40, duration: 0.18, type: 'sawtooth', volume: 0.14 });
  }

  pickup(combo) {
    const step = Math.min(combo, 12);
    this.blip({ frequency: 520 + step * 36, duration: 0.09, type: 'sine', volume: 0.16 });
  }

  hurt() {
    this.noise({ duration: 0.4, volume: 0.3, lowpass: 600 });
    this.blip({ frequency: 160, endFrequency: 50, duration: 0.35, type: 'sawtooth', volume: 0.2 });
  }

  nova() {
    this.noise({ duration: 0.7, volume: 0.3, lowpass: 2400 });
    this.blip({ frequency: 120, endFrequency: 1400, duration: 0.6, type: 'sine', volume: 0.2 });
  }

  waveHorn() {
    this.blip({ frequency: 262, duration: 0.16, type: 'triangle', volume: 0.18 });
    this.blip({ frequency: 392, duration: 0.22, type: 'triangle', volume: 0.18 });
  }

  bossAlarm() {
    this.blip({ frequency: 110, endFrequency: 220, duration: 0.5, type: 'sawtooth', volume: 0.16 });
    this.blip({ frequency: 220, endFrequency: 110, duration: 0.5, type: 'sawtooth', volume: 0.16 });
  }

  victory() {
    [523, 659, 784, 1047].forEach((frequency, i) => {
      window.setTimeout(() => this.blip({ frequency, duration: 0.25, type: 'triangle', volume: 0.2 }), i * 130);
    });
  }

  // A slow two-note bass pulse under play; called from the game loop.
  updateMusic(dt, playing) {
    if (!this.context || this.muted || !playing) return;
    this.musicTimer += dt;
    if (this.musicTimer < 0.55) return;
    this.musicTimer = 0;
    const notes = [55, 55, 65.41, 49];
    const frequency = notes[this.musicStep % notes.length];
    this.musicStep += 1;
    this.blip({ frequency, duration: 0.5, type: 'sine', volume: 0.07 });
  }
}
