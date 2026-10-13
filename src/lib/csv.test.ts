import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, csvCell, csvFileName } from './csv.ts';

test('csvCell: comillas, separadores y fórmulas', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('di"jo'), '"di""jo"');
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(NaN), '');
  assert.equal(csvCell(4.39), '4.39');
});
test('buildCsv: cabecera, BOM, una fila por punto válido y fuente en cada fila', () => {
  const t = buildCsv([['2026-10-09', 4.3565], ['2026-10-12', 4.394], ['2026-10-13', NaN as any]], { series: 'Maíz, Iowa', unit: '$/bu', source: 'USDA AMS', license: 'US-PD' });
  const lines = t.trim().split('\r\n');
  assert.ok(t.startsWith('﻿date,value,unit,series'));
  assert.equal(lines.length, 3);
  assert.equal(lines[2], '2026-10-12,4.394,$/bu,"Maíz, Iowa",,USDA AMS,US-PD,');
});
test('csvFileName: sin acentos ni espacios', () => {
  assert.equal(csvFileName('Maíz · Iowa (EE. UU.)'), 'dehesa-index-maiz-iowa-ee-uu.csv');
  assert.equal(csvFileName('***'), 'dehesa-index-serie.csv');
});
