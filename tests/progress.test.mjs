import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_PROGRESS, normalizeProgress, mergeProgress, canEnterCapitol,
  withLitDistrict, withVisited, withFinalMessage, sameProgress, capitolGate, archiveGate,
} from '../lib/progress.js';
import { createStory, completeDay, markGamesEnded } from '../lib/story.js';

const full = { litDistricts: ['12', '11', '4'], visited: [], finalMessage: null, completedAt: null };

test('valores vacíos o inválidos → progreso vacío', () => {
  for (const v of [null, undefined, 'x', 42, []]) assert.deepEqual(normalizeProgress(v), EMPTY_PROGRESS);
});

test('el formato viejo (clues/ending) no rompe y queda vacío', () => {
  assert.deepEqual(normalizeProgress({ clues: ['forest', 'lake'], ending: 'truth', started: true }), EMPTY_PROGRESS);
});

test('filtra ids no jugables, duplicados y ordena', () => {
  const p = normalizeProgress({ litDistricts: ['4', '7', '12', '12', 4], visited: ['13', 'c', '99', '13', '2'] });
  assert.deepEqual(p.litDistricts, ['12', '4'], 'los talleres se exploran: ya no se encienden');
  assert.deepEqual(p.visited, ['13', '2']);
});

test('no acepta mensaje final sin los 3 emblemas', () => {
  const p = normalizeProgress({ litDistricts: ['12'], finalMessage: 'rebelion', completedAt: 5 });
  assert.equal(p.finalMessage, null);
  assert.equal(p.completedAt, null);
});

test('mensaje final válido con los 3 emblemas', () => {
  const p = normalizeProgress({ ...full, finalMessage: 'memoria', completedAt: 1729000000000.7 });
  assert.equal(p.finalMessage, 'memoria');
  assert.equal(p.completedAt, 1729000000000);
  assert.equal(normalizeProgress({ ...full, finalMessage: 'hackear' }).finalMessage, null);
  assert.equal(normalizeProgress({ ...full, finalMessage: 'rebelion' }).completedAt, 0);
});

test('canEnterCapitol', () => {
  assert.equal(canEnterCapitol(EMPTY_PROGRESS), false);
  assert.equal(canEnterCapitol({ litDistricts: ['12', '11'] }), false);
  assert.equal(canEnterCapitol(full), true);
});

test('merge une local y remoto', () => {
  const merged = mergeProgress(
    { litDistricts: ['12'], visited: ['7'], finalMessage: null, completedAt: null },
    { litDistricts: ['11', '4'], visited: ['13'], finalMessage: 'rebelion', completedAt: 10 },
  );
  assert.deepEqual(merged, { litDistricts: ['12', '11', '4'], visited: ['7', '13'], finalMessage: 'rebelion', completedAt: 10 });
});

test('transiciones', () => {
  const a = withLitDistrict(EMPTY_PROGRESS, '12');
  assert.deepEqual(a.litDistricts, ['12']);
  assert.equal(withLitDistrict(a, '12'), a, 'sin cambios devuelve el mismo objeto');
  assert.deepEqual(withVisited(a, '7').visited, ['7']);
  assert.equal(withFinalMessage(a, 'rebelion', 1), a, 'sin emblemas no hay final');
  const done = withFinalMessage(full, 'rebelion', 99);
  assert.equal(done.finalMessage, 'rebelion');
  assert.equal(done.completedAt, 99);
  assert.equal(withFinalMessage(done, 'memoria', 100), done, 'la elección es definitiva');
  assert.ok(sameProgress(done, { ...done }));
  assert.ok(!sameProgress(done, full));
});

test('capitolGate: no se echa a nadie antes de conocer su progreso real (local y, con Firebase, la nube)', () => {
  const one = { litDistricts: ['12'] };
  // Bug de la revisión: con Firebase, `ready` es verdadero apenas se lee localStorage y la mezcla con la nube
  // llega después; quien tenía los 3 emblemas en la nube desde otro dispositivo era rebotado al mapa.
  assert.equal(capitolGate({ ready: false, synced: false, progress: EMPTY_PROGRESS }), 'loading');
  assert.equal(capitolGate({ ready: true, synced: false, progress: one }), 'loading', 'falta la nube');
  assert.equal(capitolGate({ ready: true, synced: true, progress: one }), 'blocked');
  assert.equal(capitolGate({ ready: true, synced: true, progress: EMPTY_PROGRESS }), 'blocked');
});

test('capitolGate: el Capitolio se abre al terminar los Juegos, sin esperar la nube', () => {
  const ended = markGamesEnded(createStory());
  assert.equal(capitolGate({ ready: true, synced: false, progress: full, story: ended }), 'allowed');
  assert.equal(capitolGate({ ready: true, synced: true, progress: full, story: ended }), 'allowed');
  assert.equal(capitolGate({ ready: false, synced: false, progress: full, story: ended }), 'loading', 'ni siquiera se leyó el guardado');
  assert.equal(capitolGate({ ready: true, synced: true, progress: full, story: createStory() }), 'blocked', 'con los tres días todavía falta la Cosecha');
  assert.equal(capitolGate({ ready: true, synced: true, progress: { ...full, finalMessage: 'memoria', completedAt: 1 }, story: createStory() }), 'allowed', 'quien ya terminó puede volver');
});

test('archiveGate: los Juegos se abren hechos los tres días y decidida la última ración', () => {
  const story = createStory();
  assert.equal(archiveGate({ ready: true, synced: true, progress: full, story }), 'allowed');
  assert.equal(archiveGate({ ready: true, synced: true, progress: { litDistricts: ['12', '11'] }, story }), 'blocked');
  const waiting = completeDay(story, '4', { lit: ['12', '11'] });
  assert.equal(archiveGate({ ready: true, synced: true, progress: full, story: waiting }), 'blocked', 'falta decidir las teselas de Marin');
  assert.equal(archiveGate({ ready: true, synced: false, progress: { litDistricts: ['12'] }, story }), 'loading', 'falta la nube');
  assert.equal(archiveGate({ ready: false, synced: false, progress: full, story }), 'loading');
});
