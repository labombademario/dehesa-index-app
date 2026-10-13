// «Qué ha cambiado hoy»: cada texto que usa la pantalla existe en los 4 idiomas (un fallo así solo se vería al abrir la pantalla).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BT } from './briefText.ts';

test('cambios.tsx: todas las claves s(...) existen en BT con 4 idiomas no vacíos', () => {
  const src = readFileSync(new URL('../app/cambios.tsx', import.meta.url), 'utf8');
  const keys = [...new Set([...src.matchAll(/\bs\('([A-Za-z]+)'\)/g)].map(m => m[1]))];
  assert.ok(keys.length >= 20);
  for (const k of keys) {
    assert.ok(BT[k], 'falta la clave ' + k);
    assert.equal(BT[k].length, 4, k);
    for (const x of BT[k]) assert.ok(typeof x === 'string' && x.length > 0, k + ' vacío');
  }
});
