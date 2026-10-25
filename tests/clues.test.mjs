import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, MARKS, HINTS, MARK_TOTAL, MARKS_FOR_VOICE, clueById } from '../lib/clues.js';
import { FRAGMENTS } from '../lib/fragments.js';

test('tres herramientas: el farol del 12, la llave del 6 y la radio del 3', () => {
  assert.deepEqual(TOOLS.map((t) => [t.id, t.district]), [['farol', '12'], ['llave', '6'], ['radio', '3']]);
});

test('nueve marcas del sinsajo, tres por herramienta, en los lugares que abre cada una', () => {
  assert.equal(MARKS.length, 9);
  assert.equal(MARK_TOTAL, 9);
  assert.equal(MARKS_FOR_VOICE, 6);
  const byTool = (tool) => MARKS.filter((m) => m.tool === tool).map((m) => m.district);
  assert.deepEqual(byTool('farol'), ['2', '7', '3']);
  assert.deepEqual(byTool('llave'), ['1', '8', '10']);
  assert.deepEqual(byTool('radio'), ['5', '11', '13']);
  for (const m of MARKS) assert.ok(TOOLS.some((t) => t.id === m.tool), m.id);
});

test('las pistas del 12: la libreta, el cartel y el nicho', () => {
  assert.deepEqual(HINTS.filter((h) => h.district === '12').map((h) => h.id), ['p-12-turno', 'p-12-costura', 'p-12-libreta', 'p-12-cartel', 'p-12-nicho']);
});

test('los ids no se repiten entre fragmentos, herramientas, marcas y pistas', () => {
  const ids = [...FRAGMENTS, ...TOOLS, ...MARKS, ...HINTS].map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('cada pista es un título y una línea corta, sin dos puntos ni "tesela"', () => {
  for (const c of [...TOOLS, ...MARKS, ...HINTS]) {
    assert.ok(c.title.length > 2 && c.title.length < 40, c.id);
    assert.ok(c.line.length < 110, `${c.id}: ${c.line.length}`);
    assert.ok(!c.line.includes(':') && !c.title.includes(':'), c.id);
    assert.ok(!/tesela/i.test(c.line + c.title), c.id);
  }
});

test('clueById dice qué tipo de pista es cada id', () => {
  assert.equal(clueById('farol').kind, 'tool');
  assert.equal(clueById('farol').title, TOOLS[0].title);
  assert.equal(clueById('m-7-bosque').kind, 'mark');
  assert.equal(clueById('p-12-nicho').kind, 'hint');
  assert.equal(clueById('12-viga').kind, 'fragment');
  assert.equal(clueById('13-signal').kind, 'fragment');
  assert.equal(clueById('nada'), null);
  assert.equal(clueById(undefined), null);
});

test('la tarjeta dice qué se encontró: fragmento, herramienta, marca n/9 o pista', async () => {
  const { clueMeta } = await import('../lib/clues.js');
  const story = { fragments: ['12-viga', '4-cuenco'], tools: ['farol'], marks: ['m-2-cueva', 'm-7-bosque', 'm-3-sotano'], hints: ['p-12-cartel'] };
  assert.equal(clueMeta(clueById('12-viga'), story), 'Fragmento 2/13 · Distrito 12');
  assert.equal(clueMeta(clueById('farol'), story), 'Herramienta · Distrito 12');
  assert.equal(clueMeta(clueById('m-7-bosque'), story), 'Marca del sinsajo 3/9 · Distrito 7');
  assert.equal(clueMeta(clueById('p-12-cartel'), story), 'Pista · Distrito 12');
  assert.equal(clueMeta(clueById('13-signal'), story), 'Fragmento 2/13 · Distrito 13');
});

test('la botella del 4 es una pista que manda al Distrito 3', () => {
  const botella = clueById('p-4-botella');
  assert.equal(botella.kind, 'hint');
  assert.equal(botella.district, '4');
  assert.match(botella.line, /Distrito 3/);
});
