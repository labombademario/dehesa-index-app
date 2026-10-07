#!/usr/bin/env node
// Copia la ultima version de data/app/v1 dentro de la app (src/data/bundled.json) para el primer arranque sin conexion.
// Origen: el repositorio de la web al lado (../dehesa-index) o, si no esta, https://dehesaindex.com/data/app/v1/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL = path.resolve(ROOT, '..', 'dehesa-index', 'data', 'app', 'v1');
const FILES = ['prices.json', 'today.json', 'news.json', 'countries.json', 'sections.json'];
async function get(f) {
  if (fs.existsSync(path.join(LOCAL, f))) return JSON.parse(fs.readFileSync(path.join(LOCAL, f), 'utf8'));
  const r = await fetch('https://dehesaindex.com/data/app/v1/' + f);
  if (!r.ok) throw new Error(f + ': HTTP ' + r.status);
  return r.json();
}
const out = {};
for (const f of FILES) out[f.replace('.json', '')] = await get(f);
out.bundledAt = out.prices.generatedAt;
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'bundled.json'), JSON.stringify(out) + '\n');
console.log('bundled.json:', out.prices.prices.length, 'precios, generado', out.bundledAt);
