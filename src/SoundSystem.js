// Sound system using Web Audio API for procedural audio
// No external audio files needed - generates sounds programmatically

export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
    this.volume = 0.3;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.initialized;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  // Generate a noise burst for block breaking/placing
  playBlockBreak(material) {
    if (!this.ensureContext()) return;

    const dur = 0.15;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Material-specific sounds
    const params = {
      stone: { freq: 200, type: 'square', filterFreq: 800 },
      wood: { freq: 300, type: 'triangle', filterFreq: 1200 },
      dirt: { freq: 150, type: 'sawtooth', filterFreq: 600 },
      sand: { freq: 400, type: 'sawtooth', filterFreq: 2000 },
      glass: { freq: 800, type: 'sine', filterFreq: 3000 },
      metal: { freq: 500, type: 'square', filterFreq: 1500 },
      wool: { freq: 200, type: 'sine', filterFreq: 400 },
      plant: { freq: 350, type: 'triangle', filterFreq: 1000 },
      liquid: { freq: 250, type: 'sine', filterFreq: 700 },
    };

    const p = params[material] || params.stone;
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(p.freq * 0.5, this.ctx.currentTime + dur);

    filter.type = 'lowpass';
    filter.frequency.value = p.filterFreq;

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  }

  playBlockPlace(material) {
    if (!this.ensureContext()) return;

    const dur = 0.1;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freqMap = {
      stone: 300, wood: 400, dirt: 200, sand: 350,
      glass: 600, metal: 500, wool: 250, plant: 350,
    };

    osc.type = 'triangle';
    osc.frequency.value = freqMap[material] || 300;

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  }

  playHit() {
    if (!this.ensureContext()) return;

    const dur = 0.12;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + dur);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  }

  playExplosion() {
    if (!this.ensureContext()) return;

    // White noise burst for explosion
    const dur = 0.5;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(this.ctx.currentTime);
  }

  playXP() {
    if (!this.ensureContext()) return;

    const dur = 0.2;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + dur);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  }

  playEat() {
    if (!this.ensureContext()) return;

    // Several short "munch" sounds
    for (let i = 0; i < 3; i++) {
      const t = this.ctx.currentTime + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(100 + Math.random() * 50, t);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  playDamage() {
    if (!this.ensureContext()) return;

    const dur = 0.15;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + dur);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  }

  playStep(material) {
    if (!this.ensureContext()) return;

    const dur = 0.06;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = material === 'stone' ? 250 : material === 'wood' ? 350 : 180;

    osc.type = 'triangle';
    osc.frequency.value = freq + Math.random() * 50;

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  }

  playSplash() {
    if (!this.ensureContext()) return;

    const dur = 0.3;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(this.ctx.currentTime);
  }
}
