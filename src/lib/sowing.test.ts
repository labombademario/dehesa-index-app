// Misma lógica que js/siembra.js de la web: se comprueba contra data/sowing/es.json del repo de la web si está al lado (../dehesa-index).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sowRows, sowPlan } from './sowing.ts';

const F = new URL('../../../dehesa-index/data/sowing/es.json', import.meta.url);

test('Extremadura: la patata es la de mayor ingreso y el maiz grano va en el reparto', { skip: !existsSync(F) }, () => {
  const doc = JSON.parse(readFileSync(F, 'utf8'));
  const rows = sowRows(doc, 'EX', {});
  assert.ok(rows.length >= 5);
  assert.equal(rows[0].k, 'R1000');
  assert.ok(rows.every(r => r.margin === null));
  const p = sowPlan(rows, 70);
  assert.equal(p.anyCost, false);
  assert.ok(p.parts.some(x => x.x.k === 'C1500'));
  assert.ok(Math.abs(p.parts.reduce((a, x) => a + x.s, 0) + p.unassigned - 1) < 1e-6);
});

test('con costes propios ordena por margen y deja fuera los que no tienen coste', { skip: !existsSync(F) }, () => {
  const doc = JSON.parse(readFileSync(F, 'utf8'));
  const rows = sowRows(doc, 'EX', { 'ES:C1110': '550', 'ES:I1110': '900' });
  assert.equal(rows[0].k, 'C1110');
  assert.ok(rows.find(r => r.k === 'I1110')!.margin! < 0);
  const p = sowPlan(rows, 70);
  assert.ok(p.excluded.length > 0 && p.negative.some(x => x.k === 'I1110'));
});
