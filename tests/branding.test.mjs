import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('la marca es el sello de Panem: el header lo muestra y no dice "La chispa"', () => {
  const header = read('components/panem/SiteHeader.js');
  assert.match(header, /assets\/brand\/panem-seal\.png/);
  assert.doesNotMatch(header, /chispa/i);
});

test('título, nombre de la aplicación y favicon son de Panem, sin "La chispa"', () => {
  const layout = read('app/layout.js');
  assert.match(layout, /default: 'Panem'/);
  assert.match(layout, /applicationName: 'Panem'/);
  assert.doesNotMatch(layout, /la chispa/i);
  assert.ok(existsSync('app/icon.png'), 'el favicon es el sello (app/icon.png)');
  assert.ok(!existsSync('app/icon.svg'), 'ya no queda el favicon viejo');
});

test('los assets de la marca existen', () => {
  assert.ok(existsSync('public/assets/brand/panem-seal.png'));
  assert.ok(existsSync('docs/reference/panem-flag.webp'), 'imagen de origen del sello');
  assert.ok(existsSync('scripts/extract_brand.py'));
});

test('el README se titula Panem', () => {
  assert.match(read('README.md').split('\n')[0], /^# Panem$/);
});

test('el acento de la interfaz es el dorado del sello y no el naranja anterior', () => {
  const css = read('app/globals.css');
  assert.match(css, /--gold: #d4af37/);
  assert.doesNotMatch(css, /--spark/);
});
