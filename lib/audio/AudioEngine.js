// Motor de audio: ambiente generado + 3 capas sincronizadas por un único reloj
// + efectos sintetizados. Se crea solo después de un gesto de la persona usuaria.
import { MOTIF, STEP_SECONDS, eventsForStep, layerTargets, midiToHz } from './music.js';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const MASTER_LEVEL = 0.8;

export class AudioEngine {
  ctx = null;
  timer = null;
  step = 0;
  nextTime = 0;
  finale = null;

  async start() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) throw new Error('web-audio-unsupported');
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = MASTER_LEVEL;
    this.master.connect(ctx.destination);
    this.noise = this.createNoiseBuffer(2);
    this.layers = {};
    for (const name of ['percusion', 'silbido', 'pad']) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.master);
      this.layers[name] = gain;
    }
    // Eco del silbido
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = STEP_SECONDS * 2;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    this.echo.connect(feedback).connect(this.echo);
    this.echo.connect(this.layers.silbido);
    this.ambient = this.createAmbient();
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), LOOKAHEAD_MS);
    await ctx.resume();
  }

  createNoiseBuffer(seconds, brown = false) {
    const { ctx } = this;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * white) / 1.02; data[i] = last * 3.5; }
      else data[i] = white;
    }
    return buffer;
  }

  createAmbient() {
    const { ctx } = this;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.master);
    // Viento: ruido marrón filtrado con un LFO lento
    const wind = ctx.createBufferSource();
    wind.buffer = this.createNoiseBuffer(4, true);
    wind.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 260;
    lfo.connect(lfoDepth).connect(filter.frequency);
    const windLevel = ctx.createGain();
    windLevel.gain.value = 0.22;
    wind.connect(filter).connect(windLevel).connect(gain);
    // Drone grave
    const drone = ctx.createOscillator();
    drone.frequency.value = 73.42;
    const droneLevel = ctx.createGain();
    droneLevel.gain.value = 0.035;
    drone.connect(droneLevel).connect(gain);
    wind.start(); lfo.start(); drone.start();
    return { gain, sources: [wind, lfo, drone] };
  }

  schedule() {
    const { ctx } = this;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      for (const event of eventsForStep(this.step, this.finale)) this.play(event, this.nextTime);
      this.nextTime += STEP_SECONDS;
      this.step += 1;
    }
  }

  envelope(param, at, peak, attack, release) {
    param.setValueAtTime(0.0001, at);
    param.exponentialRampToValueAtTime(peak, at + attack);
    param.exponentialRampToValueAtTime(0.0001, at + attack + release);
  }

  kick(at, out, peak = 0.9) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(110, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.25);
    this.envelope(gain.gain, at, peak, 0.005, 0.3);
    osc.connect(gain).connect(out);
    osc.start(at); osc.stop(at + 0.4);
  }

  noiseHit(at, out, { type = 'bandpass', freq = 1800, peak = 0.3, length = 0.12, sweepTo = null } = {}) {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, at);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + length);
    const gain = ctx.createGain();
    this.envelope(gain.gain, at, peak, 0.005, length);
    src.connect(filter).connect(gain).connect(out);
    src.start(at); src.stop(at + length + 0.05);
  }

  tone(at, from, to, seconds, type, peak, out) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + seconds);
    this.envelope(gain.gain, at, peak, Math.min(0.02, seconds / 4), seconds);
    osc.connect(gain).connect(out);
    osc.start(at); osc.stop(at + seconds + 0.1);
  }

  whistleNote(at, midi, length, out, peak = 0.32) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.frequency.value = midiToHz(midi);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = 6;
    vibrato.connect(depth).connect(osc.frequency);
    const gain = ctx.createGain();
    this.envelope(gain.gain, at, peak, 0.04, length);
    osc.connect(gain);
    gain.connect(out);
    gain.connect(this.echo);
    osc.start(at); vibrato.start(at);
    osc.stop(at + length + 0.1); vibrato.stop(at + length + 0.1);
  }

  chord(at, notes, seconds, out) {
    const { ctx } = this;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.12, at + 0.8);
    gain.gain.setValueAtTime(0.12, at + seconds - 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    filter.connect(gain).connect(out);
    for (const midi of notes) {
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = midiToHz(midi);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(at); osc.stop(at + seconds + 0.05);
      }
    }
  }

  play(event, at) {
    const out = this.layers[event.layer];
    if (event.type === 'kick') this.kick(at, out);
    else if (event.type === 'hit') this.noiseHit(at, out, { freq: 1800, peak: 0.25, length: 0.12 });
    else if (event.type === 'note') this.whistleNote(at, event.midi, event.length, out);
    else if (event.type === 'chord') this.chord(at, event.notes, event.seconds, out);
  }

  setLayerState({ lit = [], previewDistrict = null, finale = null }) {
    if (!this.ctx) return;
    this.finale = finale;
    const targets = layerTargets({ lit, previewDistrict, finale });
    const now = this.ctx.currentTime;
    for (const [name, value] of Object.entries(targets)) this.layers[name].gain.setTargetAtTime(value, now, 1.2);
  }

  // `level` es el volumen del ambiente mientras está bajo: 0.45 en los dioramas, menos para que se oiga el clip.
  setDucked(ducked, level = 0.45) {
    if (!this.ctx) return;
    this.ambient.gain.gain.setTargetAtTime(ducked ? level : 1, this.ctx.currentTime, 0.6);
  }

  setMuted(muted) {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, this.ctx.currentTime, 0.1);
  }

  playSfx(name) {
    if (!this.ctx) return;
    const at = this.ctx.currentTime + 0.01;
    const out = this.master;
    const ctx = this.ctx;
    switch (name) {
      case 'click': this.whistleNote(at, 93, 0.05, out, 0.12); break;
      case 'tick': this.noiseHit(at, out, { type: 'highpass', freq: 5000, peak: 0.05, length: 0.03 }); break;
      case 'pick':
        this.noiseHit(at, out, { type: 'highpass', freq: 1200, peak: 0.35, length: 0.1 });
        this.kick(at, out, 0.5);
        break;
      case 'harvest': this.noiseHit(at, out, { freq: 4200, peak: 0.12, length: 0.08 }); break;
      case 'throw': this.noiseHit(at, out, { freq: 600, peak: 0.12, length: 0.4, sweepTo: 2400 }); break;
      case 'splash': this.noiseHit(at, out, { type: 'lowpass', freq: 2200, peak: 0.4, length: 0.5, sweepTo: 300 }); break;
      case 'ignite': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(220, at);
        osc.frequency.exponentialRampToValueAtTime(880, at + 0.6);
        this.envelope(gain.gain, at, 0.2, 0.05, 0.6);
        osc.connect(gain).connect(out);
        osc.start(at); osc.stop(at + 0.7);
        this.noiseHit(at, out, { freq: 3000, peak: 0.1, length: 0.5 });
        break;
      }
      case 'glitch':
        for (let i = 0; i < 8; i++) {
          const t = at + i * 0.035;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = 80 + Math.random() * 1600;
          this.envelope(gain.gain, t, 0.06, 0.002, 0.03);
          osc.connect(gain).connect(out);
          osc.start(t); osc.stop(t + 0.04);
        }
        break;
      case 'whistle':
        // El motivo, y los sinsajos que lo repiten una octava arriba.
        [0, 1.7, 3.1].forEach((offset, round) => {
          MOTIF.forEach((midi, i) => {
            this.whistleNote(at + offset + i * 0.3, midi + (round ? 12 : 0), 0.28, out, round ? 0.12 : 0.3);
          });
        });
        break;
      // Intro de la tele: encendido, fanfarria del Capitolio, corte de señal y entrada al mapa
      case 'tvOn':
        this.kick(at, out, 0.5);
        this.noiseHit(at, out, { freq: 3000, peak: 0.12, length: 0.5 });
        this.tone(at + 0.05, 110, 108, 0.9, 'triangle', 0.05, out);
        break;
      case 'fanfare':
        [[293.7, 0], [349.2, 0.16], [440, 0.32], [587.3, 0.6]].forEach(([freq, offset]) => {
          this.tone(at + offset, freq, freq * 0.995, 0.9, 'sawtooth', 0.07, out);
          this.tone(at + offset, freq / 2, freq / 2, 0.9, 'triangle', 0.1, out);
        });
        break;
      case 'cut':
        this.noiseHit(at, out, { freq: 2400, peak: 0.5, length: 0.35 });
        this.tone(at + 0.15, 1400, 55, 0.7, 'sawtooth', 0.13, out);
        this.noiseHit(at + 0.9, out, { freq: 900, peak: 0.22, length: 0.8, sweepTo: 200 });
        break;
      case 'whoosh':
        this.noiseHit(at, out, { freq: 200, peak: 0.3, length: 1.5, sweepTo: 3200 });
        this.tone(at, 55, 40, 1.6, 'sine', 0.25, out);
        break;
      default: break;
    }
  }

  dispose() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
  }
}
