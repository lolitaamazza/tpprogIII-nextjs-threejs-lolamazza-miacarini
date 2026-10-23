import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICT4 } from '../lib/locations/district4.js';
import { clueById } from '../lib/clues.js';

test('el 4: cinco lugares de la costa, a la altura de los ojos (en el muelle, sobre las tablas)', () => {
  assert.deepEqual(DISTRICT4.spots.map((s) => [s.id, s.label]), [
    ['playa', 'La playa'], ['casa', 'La casa de Marin'], ['redes', 'Las redes del muelle'], ['punta', 'La punta del muelle'], ['faro', 'El faro'],
  ]);
  assert.equal(DISTRICT4.start, 'playa');
  const deck = DISTRICT4.deck;
  for (const id of ['redes', 'punta']) assert.equal(DISTRICT4.spots.find((s) => s.id === id).position[1], deck + 1.6, id);
});

test('la jornada de Marin se juega desde la punta del muelle, sobre el agua', () => {
  const { job, water } = DISTRICT4;
  assert.equal(job.type, 'net');
  assert.equal(job.spot, 'punta');
  assert.equal(job.water[1], water.y, 'los peces nadan en el agua de la escena');
  assert.ok(job.from[2] < job.water[2] + 10 && job.from[2] > job.water[2], 'el agua de los peces queda delante de la punta');
});

test('el cuenco de Marin (el fragmento del 4) y la botella en la red', () => {
  const cuenco = DISTRICT4.interactables.find((i) => i.reveals === '4-cuenco');
  assert.equal(cuenco.kind, 'look');
  assert.equal(cuenco.spot, 'casa');
  assert.equal(clueById(cuenco.reveals).kind, 'fragment');
  const botella = DISTRICT4.interactables.find((i) => i.reveals === 'p-4-botella');
  assert.equal(botella.kind, 'hold');
  assert.equal(botella.spot, 'redes');
  assert.ok(botella.prompt && !botella.prompt.includes(':'));
});

test('las piezas son del 4 y los textos son claros', () => {
  const ids = DISTRICT4.pieces.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const piece of DISTRICT4.pieces) {
    assert.match(piece.url, /^\/models\/d4\/.+\.glb$/, piece.id);
    assert.ok(piece.height > 0 || piece.scale > 0, piece.id);
  }
  assert.equal(DISTRICT4.textures, '/models/d4/');
  for (const text of [DISTRICT4.title, ...DISTRICT4.spots.map((s) => s.label)]) assert.ok(!text.includes(':') && !/tesela/i.test(text), text);
});

test('la botella está escondida: sin brillo y fuera de lo que se ve al llegar a las redes', () => {
  const botella = DISTRICT4.interactables.find((i) => i.id === 'botella');
  assert.equal(botella.subtle, true);
  const spot = DISTRICT4.spots.find((s) => s.id === 'redes');
  const look = [spot.look[0] - spot.position[0], spot.look[2] - spot.position[2]];
  const to = [botella.position[0] - spot.position[0], botella.position[2] - spot.position[2]];
  const angle = Math.acos((look[0] * to[0] + look[1] * to[1]) / (Math.hypot(...look) * Math.hypot(...to)));
  assert.ok(angle > (40 * Math.PI) / 180, `${Math.round((angle * 180) / Math.PI)}°`);
});

test('cada distrito de los tres días dice dónde se juega su jornada', async () => {
  const { LOCATIONS } = await import('../lib/locations/index.js');
  for (const id of ['12', '11', '4']) {
    const { dayHint, job, spots } = LOCATIONS[id];
    assert.ok(dayHint && !dayHint.includes(':'), id);
    assert.ok(dayHint.includes(spots.find((s) => s.id === job.spot).label.toLowerCase()), `${id}: ${dayHint}`);
  }
});
