import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { MAP_IDS } from '../data/districts.js';

const svg = existsSync('public/assets/panem.svg') ? readFileSync('public/assets/panem.svg', 'utf8') : '';

test('panem.svg tiene viewBox 1000x744', () => {
  assert.match(svg, /viewBox="0 0 1000 744"/);
});

test('panem.svg tiene un path por pieza con id district-{id}', () => {
  for (const id of MAP_IDS) {
    const re = new RegExp(`<path[^>]*id="district-${id}"[^>]*\\sd="M[^"]{20,}"`);
    assert.match(svg, re, `falta district-${id}`);
  }
});

test('hay un sello PNG por pieza', () => {
  for (const id of MAP_IDS) assert.ok(existsSync(`public/assets/seals/${id}.png`), `falta sello ${id}`);
});
