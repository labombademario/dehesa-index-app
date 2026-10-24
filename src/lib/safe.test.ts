import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataPath, param, parseJson, safeUrl, validMain } from './safe.ts';

test('safeUrl: solo https a un host normal', () => {
  assert.equal(safeUrl('https://dehesaindex.com/metodologia.html'), 'https://dehesaindex.com/metodologia.html');
  assert.equal(safeUrl('https://www.ine.pt/xportal?x=1#a'), 'https://www.ine.pt/xportal?x=1#a');
  for (const bad of ['http://dehesaindex.com', 'javascript:alert(1)', 'tel:+34600000000', 'sms:123', 'itms-services://?action=download',
    'whatsapp://send?text=x', 'https://user:pass@evil.com/', 'https://evil.com\n.dehesaindex.com', 'https:///x', 'https://localhost/', '', null, 42, 'https://a b.com']) {
    assert.equal(safeUrl(bad as any), '', String(bad));
  }
});

test('param: forma de los parámetros de pantalla', () => {
  assert.equal(param('es', 'cc'), 'ES');
  assert.equal(param(['FR', 'IT'], 'cc'), 'FR');
  assert.equal(param('ESP', 'cc'), '');
  assert.equal(param('../ES', 'cc'), '');
  assert.equal(param('de-meat-kuhfleisch-e-p-öko', 'id'), 'de-meat-kuhfleisch-e-p-öko');
  assert.equal(param('product:cereales_trigo_es', 'id'), 'product:cereales_trigo_es');
  assert.equal(param('<script>', 'id'), '');
  assert.equal(param('a/b', 'id'), '');
  assert.equal(param('x'.repeat(500), 'id'), '');
  assert.equal(param('es-a,es-b', 'ids'), 'es-a,es-b');
  assert.equal(param('Castilla y León', 'text'), 'Castilla y León');
  assert.equal(param('a<b', 'text'), '');
  assert.equal(param(undefined, 'flag'), '');
});

test('dataPath: rutas relativas normales', () => {
  assert.equal(dataPath('series/ES/crops.json'), 'series/ES/crops.json');
  for (const bad of ['../secret.json', 'series/../../x.json', '/etc/passwd.json', 'https://evil.com/x.json', 'series//x.json', 'x.js', 'a?b.json']) assert.equal(dataPath(bad), '', bad);
});

test('parseJson: rechaza vacío, enorme, no JSON y no objeto', () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
  assert.throws(() => parseJson(''));
  assert.throws(() => parseJson('<html>'));
  assert.throws(() => parseJson('[1,2]'));
  assert.throws(() => parseJson('null'));
  assert.throws(() => parseJson('{"a":"' + 'x'.repeat(200) + '"}', 100));
});

test('validMain: forma mínima de los ficheros principales', () => {
  assert.equal(validMain('prices', { prices: [] }), true);
  assert.equal(validMain('prices', { prices: 'x' }), false);
  assert.equal(validMain('news', {}), false);
  assert.equal(validMain('today', {}), true);
});
