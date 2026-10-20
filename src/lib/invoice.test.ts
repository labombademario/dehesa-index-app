import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, compute, lookup, num, parseDate } from './invoice.ts';

test('números y fechas como en la web', () => {
  assert.equal(num('268,5'), 268.5); assert.equal(num('1.234,56'), 1234.56); assert.equal(num('1,234.56'), 1234.56);
  assert.ok(isNaN(num('1.500')));   // ambiguo: no se adivina
  assert.equal(parseDate('15/05/2026'), '2026-05-15'); assert.equal(parseDate('2026-02-30'), null);
});
test('semanal: última cotización de los 14 días anteriores; sin dato, la línea no entra', () => {
  const pts: [string, number][] = [['2026-03-01', 250], ['2026-03-08', 260], ['2026-03-15', 270]];
  assert.deepEqual(lookup('weekly', pts, '2026-03-12'), ['2026-03-08', 260]);
  assert.equal(lookup('weekly', pts, '2026-05-01'), null);
  assert.deepEqual(lookup('monthly', [['2026-03-31', 9]], '2026-03-02'), ['2026-03-31', 9]);
  assert.deepEqual(lookup('quarterly', [['2026-Q1', 5]], '2026-02-10'), ['2026-Q1', 5]);
});
test('comparación ponderada por cantidad', () => {
  const pts: [string, number][] = [['2026-03-08', 260], ['2026-04-05', 280]];
  const r = compute('weekly', pts, parse('2026-03-12;10;270\n2026-04-07;30;290\n2026-09-01;5;300'));
  assert.equal(r.lines.length, 2); assert.equal(r.skipped, 1); assert.equal(r.q, 40);
  assert.equal(r.paid, (10 * 270 + 30 * 290) / 40); assert.equal(r.mkt, (10 * 260 + 30 * 280) / 40); assert.equal(r.tot, 10 * 10 + 30 * 10);
});
test('líneas no reconocidas y comas sin separador de columna', () => {
  const p = parse('fecha;cant;precio\n2026-03-12;10;270\nxx;1;2\n2026-05-31,10,240,50');
  assert.equal(p.rows.length, 1); assert.equal(p.bad.length, 2);
});
