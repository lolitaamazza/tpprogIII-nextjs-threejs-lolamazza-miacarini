import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORY_DAYS, PROTAGONISTS, createStory, storyDay, storyPhase, completeDay, decideTesserae, reapedDistrict, findFragment, normalizeStory,
} from '../lib/story.js';

test('arranca con los papeles de cada uno: uno por año desde los 12', () => {
  const story = createStory();
  assert.deepEqual(story.papers, { 12: 5, 11: 4, 4: 3 });
  assert.deepEqual([PROTAGONISTS[12].name, PROTAGONISTS[11].name, PROTAGONISTS[4].name], ['Ash', 'Oliva', 'Marin']);
  assert.equal(story.pending, null);
  assert.deepEqual(STORY_DAYS, ['12', '11', '4']);
});

test('los días van en orden: 12, 11 y 4', () => {
  const story = createStory();
  assert.deepEqual(storyDay(story, []), { index: 0, district: '12' });
  assert.deepEqual(storyDay(story, ['12']), { index: 1, district: '11' });
  assert.deepEqual(storyDay(story, ['12', '11']), { index: 2, district: '4' });
  assert.equal(storyDay(story, ['12', '11', '4']), null);
});

test('terminar la jornada deja pendiente la decisión: una tesela si salió perfecta, dos si no', () => {
  const story = createStory();
  assert.deepEqual(completeDay(story, '12', { perfect: true }).pending, { district: '12', cost: 1 });
  assert.deepEqual(completeDay(story, '12', { perfect: false }).pending, { district: '12', cost: 2 });
  assert.equal(completeDay(story, '11', { perfect: true }), story, 'fuera de orden no hace nada');
  const waiting = completeDay(story, '12', { perfect: false });
  assert.equal(completeDay(waiting, '12', { perfect: true }), waiting, 'con una decisión pendiente no se pisa');
});

test('pedir teselas suma papeles a la urna; no pedirlas, no', () => {
  const waiting = completeDay(createStory(), '12', { perfect: false });
  const asked = decideTesserae(waiting, true);
  assert.equal(asked.papers[12], 7);
  assert.equal(asked.tesserae[12], 2);
  assert.equal(asked.pending, null);
  const refused = decideTesserae(waiting, false);
  assert.equal(refused.papers[12], 5);
  assert.equal(refused.tesserae[12], 0);
  assert.equal(decideTesserae(createStory(), true).papers[12], 5, 'sin decisión pendiente no cambia nada');
});

test('en qué parte de la historia se está', () => {
  const story = createStory();
  assert.equal(storyPhase(story, []), 'day');
  assert.equal(storyPhase(completeDay(story, '12', { perfect: true }), ['12']), 'decision');
  assert.equal(storyPhase(story, ['12', '11', '4']), 'cosecha', 'una partida vieja con los tres encendidos llega a la Cosecha');
  assert.equal(storyPhase({ ...story, gamesEnded: true }, ['12', '11', '4']), 'games-ended');
});

test('recargar conserva la decisión pendiente; lo inválido vuelve a empezar', () => {
  const waiting = completeDay(createStory(), '12', { perfect: false });
  assert.deepEqual(normalizeStory(JSON.parse(JSON.stringify(waiting))), waiting);
  assert.deepEqual(normalizeStory(null), createStory());
  assert.deepEqual(normalizeStory({ version: 1, papers: { 12: 'muchos' } }), createStory());
  assert.deepEqual(normalizeStory({ ...waiting, pending: { district: '7', cost: 9 } }).pending, null);
});

test('un fragmento encontrado cuenta una sola vez', () => {
  let story = findFragment(createStory(), '12-viga');
  story = findFragment(story, '12-viga');
  assert.deepEqual(story.fragments, ['12-viga']);
});

test('la urna siempre saca a uno de los tres, más seguido a quien tiene más papeles, y igual con la misma semilla', () => {
  const papers = { 12: 9, 11: 1, 4: 1 };
  assert.equal(reapedDistrict(papers, 1234), reapedDistrict(papers, 1234));
  let twelve = 0;
  for (let seed = 0; seed < 3000; seed++) {
    const district = reapedDistrict(papers, seed * 7919);
    assert.ok(STORY_DAYS.includes(district));
    if (district === '12') twelve += 1;
  }
  assert.ok(twelve / 3000 > 0.7, `${twelve}`);
});

test('el día de la jornada sale de los días ya jugados (también en partidas viejas sin teselas)', () => {
  const story = createStory();
  assert.deepEqual(completeDay(story, '11', { perfect: true, lit: ['12'] }).pending, { district: '11', cost: 1 });
  assert.equal(completeDay(story, '4', { perfect: true, lit: ['12'] }), story);
});

test('la tele del Capitolio tiene su versión feliz de cada día, en inglés y corta', async () => {
  const { BULLETINS } = await import('../lib/story.js');
  assert.deepEqual(Object.keys(BULLETINS).sort(), ['11', '12', '4']);
  for (const { headline, body } of Object.values(BULLETINS)) {
    assert.equal(headline, headline.toUpperCase());
    assert.ok(body.length < 60, body);
  }
  assert.equal(BULLETINS[12].headline, 'DISTRICT 12 EXCEEDS ITS QUOTA');
});

test('al salir su nombre en la urna, una línea con sus papeles', async () => {
  const { papersLine } = await import('../lib/story.js');
  assert.equal(papersLine('12', { 12: 5, 11: 4, 4: 3 }), 'Su nombre estaba cinco veces en la urna.');
  assert.equal(papersLine('4', { 12: 5, 11: 4, 4: 11 }), 'Su nombre estaba once veces en la urna.');
});

test('el cierre dice quién fue a la arena, con cuántos papeles, y cuántos fragmentos salieron al aire', async () => {
  const { endingLines } = await import('../lib/story.js');
  const story = { ...createStory(), papers: { 12: 9, 11: 4, 4: 3 }, fragments: ['12-viga', '4-cuenco', '7-tronco', '13-signal'] };
  assert.deepEqual(endingLines(story, '11'), [
    'Oliva fue a la arena. Su nombre estaba cuatro veces en la urna, el de Ash nueve y el de Marin tres.',
    'Salieron al aire 4 de 13 fragmentos.',
  ]);
  assert.deepEqual(endingLines({ ...story, fragments: ['12-viga'] }, null), ['Los fragmentos no alcanzaron para una transmisión. Quedan en el archivo.']);
  assert.equal(endingLines({ ...story, fragments: [] }, '12')[1], 'Ningún fragmento salió al aire.');
});
