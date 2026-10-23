import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRAGMENTS, FRAGMENT_TOTAL, fragmentsFor } from '../lib/fragments.js';

test('un fragmento en cada distrito productivo, más la señal del 13', () => {
  assert.equal(FRAGMENTS.length, 12);
  assert.deepEqual(FRAGMENTS.map((f) => Number(f.district)).sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(new Set(FRAGMENTS.map((f) => f.id)).size, 12);
  assert.equal(FRAGMENT_TOTAL, 13);
});

test('cada fragmento es un objeto y una línea corta, apoyado sobre la maqueta', () => {
  for (const f of FRAGMENTS) {
    assert.ok(['object', 'document', 'recording'].includes(f.kind), f.id);
    assert.ok(f.title.length > 2 && f.title.length < 40, f.id);
    assert.ok(f.line.length < 110, `${f.id}: ${f.line.length}`);
    assert.equal(f.position.length, 3, f.id);
    assert.ok(Math.hypot(f.position[0], f.position[2]) < 0.98, `${f.id} se cae de la maqueta`);
    assert.ok(f.id.length < 40);
  }
});

test('fragmentsFor filtra por distrito', () => {
  assert.deepEqual(fragmentsFor('12').map((f) => f.district), ['12']);
  assert.deepEqual(fragmentsFor('13'), []);
  assert.deepEqual(fragmentsFor('c'), []);
});

test('lo encontrado, en orden y con la señal del 13 al final', async () => {
  const { foundFragments } = await import('../lib/fragments.js');
  const list = foundFragments(['13-signal', '12-viga', '4-cuenco', 'inventado']);
  assert.deepEqual(list.map((f) => f.id), ['4-cuenco', '12-viga', '13-signal']);
  assert.equal(list.at(-1).title, 'La señal del 13');
});
