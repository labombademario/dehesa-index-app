import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAlert, cropMargin, herdMargin, ratio, movers, norm } from './logic.ts';
import { num, pct, date, decimalsFor } from './format.ts';

const P = (id: string, value: number, changePct: number | null, yearAgo: number | null = null): any =>
  ({ id, value, changePct, yearAgo: yearAgo == null ? null : { date: '2025-09-28', value: yearAgo } });

test('avisos: cumplido, falta y pausado', () => {
  const wheat = P('t', 264.1, 0.5);
  assert.deepEqual(evaluateAlert({ id: 'a', priceId: 't', cond: 'ge', value: 270, on: true }, wheat), { kind: 'gap', gap: 270 - 264.1 });
  assert.deepEqual(evaluateAlert({ id: 'a', priceId: 't', cond: 'le', value: 270, on: true }, wheat), { kind: 'hit' });
  assert.deepEqual(evaluateAlert({ id: 'a', priceId: 't', cond: 'le', value: 270, on: false }, wheat), { kind: 'paused' });
  assert.deepEqual(evaluateAlert({ id: 'a', priceId: 'x', cond: 'le', value: 1, on: true }, undefined), { kind: 'missing' });
});

test('margen de cultivo y precio de equilibrio', () => {
  const m = cropMargin(40, 6.5, 1150, 264.1);
  assert.equal(Math.round(m.income), 68666);
  assert.equal(m.cost, 46000);
  assert.equal(Math.round(m.breakEven! * 10) / 10, 176.9);
  assert.ok(m.cushionPct! > 33 && m.cushionPct! < 33.1);
  assert.equal(cropMargin(0, 0, 0, 264.1).breakEven, null);
});

test('margen ganadero', () => {
  const m = herdMargin(120 * 9500, 0.4553, 0.38);
  assert.equal(Math.round(m.margin), Math.round(120 * 9500 * (0.4553 - 0.38)));
});

test('relación de precios con y sin dato de hace un año', () => {
  const r = ratio(P('l', 45.53, 0, 51.36), P('m', 260, 0, 219), 1000 / 100);
  assert.ok(Math.abs(r!.now - 1.751) < 0.001);
  assert.ok(Math.abs(r!.ago! - 2.345) < 0.001);
  assert.equal(ratio(P('l', 1, 0), P('m', 2, 0))!.ago, null);
  assert.equal(ratio(undefined, P('m', 2, 0)), null);
});

test('lo que más se mueve, en valor absoluto', () => {
  const ps = [P('a', 1, 0.5), P('b', 1, -1.7), P('c', 1, null), P('d', 1, 4.5)];
  assert.deepEqual(movers(ps, ['a', 'b', 'c', 'd']).map(p => p.id), ['d', 'b', 'a']);
});

test('formato en cuatro idiomas', () => {
  assert.equal(num(264.1, 'es'), '264,1');
  assert.equal(num(264.1, 'en'), '264.1');
  assert.equal(decimalsFor(2.2371), 3);
  assert.equal(pct(-1.68, 'es'), '−1,7 %');
  assert.equal(pct(0.53, 'en'), '+0.5%');
  assert.equal(date('2026-09-27', 'es'), '27 sep 2026');
  assert.equal(date('2026-08', 'fr'), 'août 2026');
  assert.equal(norm('Gasóleo'), 'gasoleo');
});
