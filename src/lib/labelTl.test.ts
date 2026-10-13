import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setGloss, tl } from './labelTl.ts';
test('traduce solo si todas las partes están en el glosario', () => {
  setGloss('es', { t: { 'fruit and vegetables': 'frutas y hortalizas', peaches: 'melocotones', 'farmgate price': 'precio en finca' } });
  assert.equal(tl('Fruit and vegetables: Peaches · Farmgate price', 'es'), 'Frutas y hortalizas: melocotones · precio en finca');
  assert.equal(tl('Fruit and vegetables: Lemons · Farmgate price', 'es'), 'Fruit and vegetables: Lemons · Farmgate price');
  assert.equal(tl('Pigmeat: R', 'es'), 'Pigmeat: R');
});
