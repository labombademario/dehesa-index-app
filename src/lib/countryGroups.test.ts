import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOf, groupCodes } from './countryGroups.ts';

test('grupos de la norma de país', () => {
  assert.equal(groupOf('ES'), 'ez'); assert.equal(groupOf('EL'), 'ez'); assert.equal(groupOf('BG'), 'ez');
  assert.equal(groupOf('PL'), 'eu'); assert.equal(groupOf('UK'), 'eu'); assert.equal(groupOf('EU'), 'eu');
  assert.equal(groupOf('US'), 'am'); assert.equal(groupOf('ar'), 'am');
  assert.equal(groupOf('AU'), 'ow'); assert.equal(groupOf('CN'), 'ow');
});
test('agrupa en el orden zona euro, Europa, América, resto', () => {
  const g = groupCodes(['AU', 'US', 'PL', 'FR', 'ES'], x => x);
  assert.deepEqual(g.map(x => x.k), ['ez', 'eu', 'am', 'ow']);
  assert.deepEqual(g[0].items, ['FR', 'ES']);
});
