// audio.js — every sound in Dapur Kilat, synthesised live with WebAudio.
// One clear job: sound only. No files are loaded, no network is touched:
// every blip, chop, sizzle and jingle is an oscillator or filtered noise.
//
// The engine is lazy: the AudioContext is created on the first user gesture
// (browsers block audio before that), and every method is a safe no-op
// until then, so the game never crashes on a silent first paint.

const MUSIC_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33];
const RUSH_NOTES = [659.25, 783.99, 880.0, 1046.5, 880.0, 783.99];

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicFast = false;
  }

  // Create (or resume) the audio context. Call from a click/key handler.
  unlock() {
    if (!this.context) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // A short oscillator blip: frequency slides from `from` to `to`.
  blip(from, to, seconds, type = 'sine', volume = 0.22) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  // Filtered white noise burst, used for chopping and sizzling.
  noise(seconds, filterFreq, volume = 0.2) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
  }

  click() { this.blip(700, 900, 0.06, 'triangle', 0.16); }
  pickup() { this.blip(420, 640, 0.09, 'sine', 0.2); }
  chop() { this.noise(0.12, 1800, 0.28); this.blip(180, 90, 0.08, 'square', 0.12); }
  sizzle() { this.noise(0.5, 5200, 0.12); }
  ready() { this.blip(880, 1174, 0.12, 'sine', 0.2); }
  coin() { this.blip(988, 988, 0.07, 'square', 0.14); setTimeout(() => this.blip(1319, 1319, 0.12, 'square', 0.14), 70); }
  serve() { [523, 659, 784, 1047].forEach((freq, i) => setTimeout(() => this.blip(freq, freq, 0.14, 'triangle', 0.2), i * 80)); }
  buzz() { this.blip(160, 90, 0.3, 'sawtooth', 0.2); }
  expired() { this.blip(330, 196, 0.4, 'sawtooth', 0.18); }
  levelUp() { [392, 523, 659, 784].forEach((freq, i) => setTimeout(() => this.blip(freq, freq, 0.16, 'triangle', 0.2), i * 90)); }
  gameOver() { [784, 659, 523, 392].forEach((freq, i) => setTimeout(() => this.blip(freq, freq, 0.22, 'triangle', 0.18), i * 130)); }

  // A cheerful looping bass-and-pluck tune. `fast` doubles the pace for the rush.
  startMusic(fast = false) {
    this.stopMusic();
    this.musicFast = fast;
    this.musicStep = 0;
    const stepMs = fast ? 190 : 320;
    this.musicTimer = setInterval(() => {
      if (!this.context || this.muted) return;
      const melody = this.musicFast ? RUSH_NOTES : MUSIC_NOTES;
      const note = melody[this.musicStep % melody.length];
      this.blip(note, note, 0.22, 'triangle', 0.07);
      if (this.musicStep % 2 === 0) this.blip(note / 2, note / 2, 0.3, 'sine', 0.09);
      this.musicStep++;
    }, stepMs);
  }

  setRush(fast) {
    if (fast !== this.musicFast) this.startMusic(fast);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
