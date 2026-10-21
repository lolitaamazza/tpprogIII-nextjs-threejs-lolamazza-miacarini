import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shardLayout, createShards, pickShard, startDrag, endDrag, stepShards, revealProgress, breakShards, openShards, REVEAL_SHARE,
} from '../lib/glitchShards.js';

const contains = (s, x, y) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
const run = (state, seconds, input = {}) => { for (let t = 0; t < seconds; t += 1 / 60) stepShards(state, 1 / 60, input); return state; };

test('los fragmentos cubren toda la pantalla, sin huecos ni superposiciones, y son siempre los mismos', () => {
  const layout = shardLayout();
  assert.ok(layout.length >= 24 && layout.length <= 90, `cantidad razonable: ${layout.length}`);
  for (let x = 0.005; x < 1; x += 0.037) {
    for (let y = 0.005; y < 1; y += 0.041) {
      assert.equal(layout.filter((s) => contains(s, x, y)).length, 1, `punto (${x.toFixed(2)}, ${y.toFixed(2)})`);
    }
  }
  assert.deepEqual(shardLayout(), layout);
});

test('un fragmento arrastrado sigue al puntero desde donde se lo agarró', () => {
  const state = createShards(shardLayout());
  const target = state.shards[10];
  const grab = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
  assert.equal(pickShard(state, grab.x, grab.y), target.id);
  startDrag(state, target.id, grab.x, grab.y);
  run(state, 0.5, { pointer: { x: grab.x + 0.2, y: grab.y - 0.1 } });
  assert.ok(Math.abs(target.ox - 0.2) < 0.01 && Math.abs(target.oy + 0.1) < 0.01);
});

test('al soltarlo vuelve despacio a su lugar', () => {
  const state = createShards(shardLayout());
  const s = state.shards[3];
  startDrag(state, s.id, s.x, s.y);
  run(state, 0.3, { pointer: { x: s.x + 0.3, y: s.y } });
  endDrag(state);
  run(state, 0.2, {});
  assert.ok(s.ox > 0.1, 'no salta de golpe');
  run(state, 6, {});
  assert.ok(Math.abs(s.ox) < 0.01 && Math.abs(s.oy) < 0.01, 'termina en su lugar');
});

test('el puntero empuja a los fragmentos cercanos y deja quietos a los lejanos', () => {
  const state = createShards(shardLayout());
  const near = state.shards.find((s) => contains(s, 0.5, 0.5));
  const far = state.shards.find((s) => contains(s, 0.02, 0.02));
  run(state, 0.4, { pointer: { x: 0.5, y: 0.5 } });
  assert.ok(Math.hypot(near.ox, near.oy) > 0.005, 'el cercano se aparta');
  assert.equal(Math.hypot(far.ox, far.oy), 0, 'el lejano no se mueve');
});

test('lo descubierto nunca baja y se completa al mover una parte de los fragmentos', () => {
  const state = createShards(shardLayout());
  assert.equal(revealProgress(state), 0);
  const needed = Math.ceil(state.shards.length * REVEAL_SHARE);
  let last = 0;
  for (const s of state.shards.slice(0, needed)) {
    startDrag(state, s.id, s.x, s.y);
    run(state, 0.1, { pointer: { x: s.x + 0.25, y: s.y } });
    endDrag(state);
    const now = revealProgress(state);
    assert.ok(now >= last);
    last = now;
  }
  run(state, 6, {});
  assert.equal(revealProgress(state), 1, 'aunque vuelvan a su lugar, lo descubierto queda');
});

test('soltar fuera de un arrastre no rompe nada', () => {
  const state = createShards(shardLayout());
  endDrag(state);
  assert.equal(pickShard(state, -1, -1), null);
  run(state, 0.1, { pointer: null });
});

test('la imagen arranca rota: algunas franjas quedan corridas, así se quedan y eso no cuenta como descubrir', () => {
  const state = createShards(shardLayout());
  breakShards(state);
  run(state, 6, {});
  const slipped = state.shards.filter((s) => Math.abs(s.ox) > 0.008);
  assert.ok(slipped.length >= 4 && slipped.length < state.shards.length * 0.7, `corridos: ${slipped.length}`);
  for (const s of slipped) {
    const row = state.shards.filter((o) => o.y === s.y);
    assert.ok(row.every((o) => Math.abs(o.ox - s.ox) < 1e-6), 'se corre la franja entera, no un pedazo suelto');
  }
  assert.equal(revealProgress(state), 0);
  const again = createShards(shardLayout());
  breakShards(again);
  assert.deepEqual(again.shards.map((s) => s.ox), state.shards.map((s) => s.rx), 'siempre se rompe igual');
});

test('al revelarse, los pedazos se abren y dejan ver el mensaje; los de afuera no se tocan', () => {
  const state = createShards(shardLayout());
  breakShards(state);
  const window = { x0: 0.2, y0: 0.3, x1: 0.6, y1: 0.7 };
  const outside = state.shards.find((s) => s.y + s.h <= window.y0);
  const restBefore = outside.rx;
  openShards(state, window);
  run(state, 6, {});
  for (let x = window.x0 + 0.01; x < window.x1; x += 0.05) {
    for (let y = window.y0 + 0.01; y < window.y1; y += 0.05) assert.equal(pickShard(state, x, y), null, `(${x.toFixed(2)}, ${y.toFixed(2)}) a la vista`);
  }
  assert.equal(outside.rx, restBefore);
  const instant = createShards(shardLayout());
  openShards(instant, window, { instant: true });
  assert.equal(pickShard(instant, 0.4, 0.5), null, 'ya abierto, sin esperar (para quien vuelve)');
});
