// Audio manager using Web Audio API
const AudioManager = {
  ctx: null,
  enabled: true,
  musicEnabled: true,
  sounds: {},

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      Logger.warn('Web Audio not supported');
      this.enabled = false;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  play(name) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    switch (name) {
      case 'jump':
        this.playTone(440, 0.08, 'sine', 0.3);
        this.playTone(660, 0.06, 'sine', 0.2, 0.04);
        break;
      case 'land':
        this.playTone(220, 0.05, 'sine', 0.15);
        break;
      case 'death':
        this.playTone(300, 0.2, 'sawtooth', 0.3);
        this.playTone(200, 0.3, 'sawtooth', 0.25, 0.1);
        this.playTone(100, 0.4, 'sawtooth', 0.2, 0.2);
        break;
      case 'crystal':
        this.playTone(880, 0.1, 'sine', 0.3);
        this.playTone(1100, 0.1, 'sine', 0.25, 0.05);
        this.playTone(1320, 0.15, 'sine', 0.2, 0.1);
        break;
      case 'win':
        this.playTone(523, 0.15, 'sine', 0.3);
        this.playTone(659, 0.15, 'sine', 0.3, 0.1);
        this.playTone(784, 0.15, 'sine', 0.3, 0.2);
        this.playTone(1047, 0.3, 'sine', 0.35, 0.3);
        break;
      case 'click':
        this.playTone(600, 0.05, 'sine', 0.2);
        break;
      case 'purchase':
        this.playTone(523, 0.1, 'sine', 0.25);
        this.playTone(784, 0.15, 'sine', 0.3, 0.08);
        break;
      case 'floor':
        this.playTone(440, 0.1, 'triangle', 0.2);
        this.playTone(550, 0.12, 'triangle', 0.15, 0.06);
        break;
    }
  },

  playTone(freq, duration, type = 'sine', volume = 0.3, delay = 0) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + delay + duration
    );

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration + 0.01);
  },

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  },

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    return this.musicEnabled;
  },
};
