import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICT12 } from '../lib/locations/district12.js';
import { FRAGMENTS } from '../lib/fragments.js';

test('cinco lugares en orden, a la altura de los ojos', () => {
  assert.deepEqual(DISTRICT12.spots.map((s) => [s.id, s.label]), [
    ['vias', 'Las vías'], ['galpon', 'El galpón'], ['casa', 'La casa de Ash'], ['entrada', 'La entrada de la mina'], ['tunel', 'El túnel'],
  ]);
  for (const spot of DISTRICT12.spots) {
    assert.equal(spot.position[1], 1.6, spot.id);
    assert.equal(spot.look.length, 3, spot.id);
  }
  assert.ok(DISTRICT12.spots.some((s) => s.id === DISTRICT12.start));
  assert.equal(DISTRICT12.eye, 1.6);
});

test('la viga escondida es el fragmento del 12 y está en el túnel, igual que el frente de carbón', () => {
  assert.equal(DISTRICT12.fragment.id, '12-viga');
  assert.equal(FRAGMENTS.find((f) => f.id === '12-viga')?.district, '12');
  assert.equal(DISTRICT12.fragment.spot, 'tunel');
  assert.equal(DISTRICT12.seam.spot, 'tunel');
});

test('las piezas tienen id único, archivo y tamaño (alto si viene de Sketchfab, escala si ya está en metros)', () => {
  const ids = DISTRICT12.pieces.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const piece of DISTRICT12.pieces) {
    assert.match(piece.url, /^\/models\/d12\/.+\.glb$/, piece.id);
    assert.ok(piece.height > 0 || piece.scale > 0, piece.id);
  }
});

test('los textos son claros: sin dos puntos ni "tesela"', () => {
  const texts = [DISTRICT12.title, ...DISTRICT12.spots.map((s) => s.label)];
  for (const text of texts) {
    assert.ok(!text.includes(':'), text);
    assert.ok(!/tesela/i.test(text), text);
  }
});
