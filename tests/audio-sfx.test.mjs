// El motor de audio corre en Node con un AudioContext falso que solo anota lo que se le pide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../lib/audio/AudioEngine.js';

function fakeAudio() {
  const log = { starts: 0, targets: [] };
  const param = (initial = 0) => ({
    value: initial, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {},
    setTargetAtTime(value) { log.targets.push(value); },
  });
  const node = (extra = {}) => ({ connect(next) { return next; }, ...extra });
  class FakeContext {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = node(); }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createGain() { return node({ gain: param(1) }); }
    createOscillator() { return node({ type: 'sine', frequency: param(440), detune: param(0), start() { log.starts += 1; }, stop() {} }); }
    createBiquadFilter() { return node({ type: 'lowpass', frequency: param(350), Q: param(1) }); }
    createBufferSource() { return node({ buffer: null, loop: false, start() { log.starts += 1; }, stop() {} }); }
    createBuffer(channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
    createDelay() { return node({ delayTime: param(0) }); }
  }
  return { FakeContext, log };
}

async function withEngine(run) {
  const { FakeContext, log } = fakeAudio();
  const previous = globalThis.window;
  globalThis.window = { AudioContext: FakeContext };
  const engine = new AudioEngine();
  try {
    await engine.start();
    await run(engine, log);
  } finally {
    engine.dispose();
    globalThis.window = previous;
  }
}

test('los efectos de la tele (encendido, fanfarria, corte y entrada) hacen sonar algo', async () => {
  await withEngine((engine, log) => {
    for (const name of ['tvOn', 'fanfare', 'cut', 'whoosh']) {
      const before = log.starts;
      engine.playSfx(name);
      assert.ok(log.starts > before, `${name} no armó ningún sonido`);
    }
  });
});

test('un efecto desconocido no suena, y sin start() no pasa nada', async () => {
  await withEngine((engine, log) => {
    const before = log.starts;
    engine.playSfx('no-existe');
    assert.equal(log.starts, before);
  });
  assert.doesNotThrow(() => new AudioEngine().playSfx('cut'));
});

test('el ambiente baja al nivel pedido para que se oiga el clip, y vuelve a 1', async () => {
  await withEngine((engine, log) => {
    engine.setDucked(true, 0.1);
    assert.equal(log.targets.at(-1), 0.1);
    engine.setDucked(false);
    assert.equal(log.targets.at(-1), 1);
    engine.setDucked(true);
    assert.equal(log.targets.at(-1), 0.45, 'sin nivel conserva el valor de los dioramas');
  });
});
