// Datos de dehesaindex.com/data/app/v1 con caché en el teléfono y copia incluida para el primer arranque sin conexión.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData } from './types';

const BASE = 'https://dehesaindex.com/data/app/v1/';
const FILES = ['prices', 'today', 'news', 'countries', 'sections'] as const;
type FileKey = typeof FILES[number];
const CACHE_KEY = 'dehesa:data:v1';

interface Cached { hashes: Partial<Record<FileKey, string>>; bodies: Partial<Record<FileKey, any>>; fetchedAt: string }

function toData(bodies: Partial<Record<FileKey, any>>, fetchedAt: string | null): AppData {
  return {
    prices: bodies.prices?.prices ?? [],
    today: bodies.today ?? { index: null, newDatasets: [], revisions: 0, calendar: [] },
    news: bodies.news?.news ?? [],
    countries: bodies.countries?.countries ?? [],
    sections: bodies.sections?.sections ?? [],
    fetchedAt,
  };
}

export function bundled(): AppData {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const b = require('../data/bundled.json');
  return toData(b, null);
}

export async function cached(): Promise<AppData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: Cached = JSON.parse(raw);
    return toData(c.bodies, c.fetchedAt);
  } catch {
    return null;
  }
}

async function getJson(url: string, timeoutMs = 15000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/** Descarga solo los ficheros cuyo hash cambió (según manifest.json). Si no hay red, lanza y la app sigue con lo guardado. */
export async function refresh(): Promise<AppData> {
  let prev: Cached | null = null;
  try { const raw = await AsyncStorage.getItem(CACHE_KEY); prev = raw ? JSON.parse(raw) : null; } catch { prev = null; }
  const manifest = await getJson(BASE + 'manifest.json?t=' + Date.now());
  const hashes: Partial<Record<FileKey, string>> = {};
  const bodies: Partial<Record<FileKey, any>> = {};
  for (const f of FILES) {
    const h = manifest.files?.[f + '.json']?.hash as string | undefined;
    if (h && prev?.hashes[f] === h && prev.bodies[f]) { bodies[f] = prev.bodies[f]; hashes[f] = h; continue; }
    bodies[f] = await getJson(BASE + f + '.json?h=' + (h ?? Date.now()));
    hashes[f] = bodies[f].hash ?? h;
  }
  const c: Cached = { hashes, bodies, fetchedAt: new Date().toISOString() };
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* sin espacio: seguimos con lo descargado */ }
  return toData(bodies, c.fetchedAt);
}
