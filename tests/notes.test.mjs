// Las notas escritas a mano: lo que dice el papel de verdad (con rayas, columnas, tachaduras), no un resumen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTES, tallyGroups } from '../lib/notes.js';
import { clueById } from '../lib/clues.js';

test('cada nota es de una pista que existe y tiene quién la escribió', () => {
  for (const [id, note] of Object.entries(NOTES)) {
    assert.ok(clueById(id), id);
    assert.match(note.hand, /^(ash|nora|tomi|oliva|teo|ines|perla|marin)$/, id);
    assert.ok(note.blocks.length > 0, id);
  }
});

test('la libreta de Ash cuenta los días sin comida con rayas de a cinco y abajo lo de Tomi', () => {
  const libreta = NOTES['p-12-libreta'];
  const tally = libreta.blocks.find((b) => b.t === 'tally');
  assert.ok(tally.n >= 10);
  assert.ok(libreta.blocks.some((b) => b.t === 'text' && /Tomi/.test(b.s)));
  assert.deepEqual(tallyGroups(13), [5, 5, 3]);
  assert.deepEqual(tallyGroups(5), [5]);
});

test('los textos de las notas son claros', () => {
  const texts = Object.values(NOTES).flatMap((n) => n.blocks.flatMap((b) => [b.s, ...(b.left ?? []), ...(b.right ?? []), b.title].filter(Boolean)));
  for (const s of texts) assert.ok(!/tesela/i.test(s) && s.length < 80, s);
});

test('los documentos del Capitolio son papeles de verdad, de pistas y fragmentos que existen', async () => {
  const { DOCS } = await import('../lib/notes.js');
  for (const [id, doc] of Object.entries(DOCS)) {
    assert.ok(clueById(id), id);
    for (const b of doc.blocks) {
      for (const s of [b.s, ...(b.rows ?? []).flat()].filter(Boolean)) assert.ok(!s.includes(':') && !/tesela/i.test(s), s);
      if (b.t === 'scrawl') assert.ok(b.hand, id);
    }
  }
  assert.ok(DOCS['p-11-envio'].blocks.some((b) => b.t === 'rows'));
});
