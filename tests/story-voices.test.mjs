// La historia con trasfondo: la voz de cada uno al llegar, su familia, la pregunta de la comida, las plazas y el visor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROTAGONISTS, STORY_DAYS, createStory, endingLines } from '../lib/story.js';
import { plazaDraws } from '../lib/plazas.js';
import { visorState, PORTIONS_TOTAL } from '../lib/visor.js';

const clear = (text) => !text.includes(':') && !/tesela/i.test(text) && !text.includes(' · ');

test('cada uno se presenta con su voz al llegar, en cuatro líneas cortas', () => {
  for (const d of STORY_DAYS) {
    const { name, voice } = PROTAGONISTS[d];
    assert.equal(voice.length, 4, d);
    assert.match(voice[0], new RegExp(name), 'la primera línea dice quién es');
    for (const line of voice) assert.ok(line.length < 110 && clear(line), line);
  }
});

test('su familia es la que depende de él o ella, con nombres propios', () => {
  assert.deepEqual(PROTAGONISTS[12].family.map((f) => f.name), ['Nora', 'Tomi']);
  assert.deepEqual(PROTAGONISTS[11].family.map((f) => f.name), ['Mamá', 'Lila', 'Brisa']);
  assert.deepEqual(PROTAGONISTS[4].family.map((f) => f.name), ['Inés']);
  for (const d of STORY_DAYS) for (const f of PROTAGONISTS[d].family) assert.ok(['sick', 'child', 'adult', 'elder'].includes(f.kind), f.name);
});

test('la pregunta de la comida cuenta primero lo que pasa en su casa', () => {
  assert.match(PROTAGONISTS[12].quota, /Tomi/);
  assert.match(PROTAGONISTS[12].refused, /Tomi/);
  assert.match(PROTAGONISTS[4].refused, /abuela/);
  for (const d of STORY_DAYS) assert.ok(clear(PROTAGONISTS[d].quota) && clear(PROTAGONISTS[d].refused), d);
});

test('el cierre vuelve a la familia de quien fue a la arena', () => {
  const story = { ...createStory(), fragments: [] };
  assert.ok(endingLines(story, '12').includes('Nora y Tomi siguen esperando en el Distrito 12.'));
  assert.ok(endingLines(story, '4').includes('Inés sigue esperando en el Distrito 4.'));
});

test('en cada plaza se ve qué siente cada uno, y quien sale se despide', () => {
  const draws = plazaDraws({ protagonist: 'tribute-21' }, { 12: 5, 11: 4, 4: 3 });
  for (const d of draws) assert.ok(d.reaction && clear(d.reaction), d.district);
  assert.equal(draws[0].reaction, PROTAGONISTS[12].saved);
  assert.equal(draws[1].reaction, PROTAGONISTS[11].reaped);
  assert.equal(draws[1].farewell, PROTAGONISTS[11].farewell);
  assert.equal(draws[0].farewell, null);
});

test('el visor muestra lo que importa de su vida', () => {
  const story = createStory();
  const ash = visorState({ id: '12', story });
  assert.equal(ash.name, 'Ash');
  assert.equal(ash.papers, 5);
  assert.equal(ash.days, 3);
  assert.equal(ash.family.length, 2);
  assert.deepEqual(ash.portions, { left: 2, total: PORTIONS_TOTAL });
  assert.equal(visorState({ id: '4', story }).days, 1);
  const fed = visorState({ id: '12', story: { ...story, tesserae: { 12: 1 }, papers: { ...story.papers, 12: 6 } } });
  assert.ok(fed.portions.left > ash.portions.left, 'pedir comida llena la casa');
  assert.equal(fed.papers, 6, 'y suma su nombre en la urna');
});

test('el pulso sube en la jornada y al decidir, y está tranquilo el resto del tiempo', () => {
  const story = createStory();
  const calm = visorState({ id: '11', story }).pulse;
  const working = visorState({ id: '11', story, moment: 'job' }).pulse;
  const deciding = visorState({ id: '11', story, moment: 'decision' }).pulse;
  assert.ok(working > deciding && deciding > calm, `${calm} ${deciding} ${working}`);
});
