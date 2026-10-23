import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICT11 } from '../lib/locations/district11.js';
import { clueById } from '../lib/clues.js';

test('el 11: cinco lugares del huerto, a la altura de los ojos', () => {
  assert.deepEqual(DISTRICT11.spots.map((s) => [s.id, s.label]), [
    ['alambrado', 'El alambrado'], ['huerto', 'El huerto'], ['torre', 'La torre'], ['galpon', 'El galpón de los cajones'], ['casa', 'La casa de Oliva'],
  ]);
  for (const spot of DISTRICT11.spots) assert.equal(spot.position[1], 1.6, spot.id);
  assert.equal(DISTRICT11.start, 'alambrado');
});

test('la jornada de Oliva se juega en el huerto, con la luz desde la torre', () => {
  assert.equal(DISTRICT11.job.type, 'harvest');
  assert.equal(DISTRICT11.job.spot, 'huerto');
  assert.equal(DISTRICT11.job.scale, 8);
  assert.ok(DISTRICT11.job.tower[1] > 4, 'la luz sale de arriba de la torre');
});

test('el aviso del castigo (el fragmento del 11) está clavado en la torre', () => {
  const aviso = DISTRICT11.interactables.find((i) => i.reveals === '11-parte');
  assert.equal(aviso.spot, 'torre');
  assert.equal(clueById(aviso.reveals).kind, 'fragment');
});

test('las piezas son del 11 y los textos son claros', () => {
  const ids = DISTRICT11.pieces.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const piece of DISTRICT11.pieces) {
    assert.match(piece.url, /^\/models\/d11\/.+\.glb$/, piece.id);
    assert.ok(piece.height > 0 || piece.scale > 0, piece.id);
  }
  assert.equal(DISTRICT11.textures, '/models/d11/');
  for (const text of [DISTRICT11.title, ...DISTRICT11.spots.map((s) => s.label)]) assert.ok(!text.includes(':') && !/tesela/i.test(text), text);
});
