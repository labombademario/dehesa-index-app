// Datos de dehesaindex.com/data/app/v1 con caché en el teléfono y copia incluida para el primer arranque sin conexión.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData, CountryProfile } from './types';

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

// Ficha de un pais (data/app/v1/country/<CC>.json): se baja al abrir el pais y se guarda en el telefono para verla sin conexion.
const profileMem: Record<string, CountryProfile> = {};
export async function loadCountry(cc: string): Promise<{ profile: CountryProfile | null; offline: boolean }> {
  const key = 'dehesa:country:' + cc;
  let stored: CountryProfile | null = profileMem[cc] ?? null;
  if (!stored) { try { const raw = await AsyncStorage.getItem(key); stored = raw ? JSON.parse(raw) : null; } catch { stored = null; } }
  try {
    const m = await getJson(BASE + 'manifest.json?t=' + Date.now());
    const h = m.countries?.[cc]?.hash as string | undefined;
    if (!h) return { profile: null, offline: false };   // este pais no tiene ficha
    if (stored && stored.hash === h) { profileMem[cc] = stored; return { profile: stored, offline: false }; }
    const fresh: CountryProfile = await getJson(BASE + 'country/' + cc + '.json?h=' + h);
    profileMem[cc] = fresh;
    try { await AsyncStorage.setItem(key, JSON.stringify(fresh)); } catch { /* sin espacio */ }
    return { profile: fresh, offline: false };
  } catch {
    if (stored) profileMem[cc] = stored;
    return { profile: stored, offline: true };
  }
}
export function countryFromMemory(cc: string): CountryProfile | null { return profileMem[cc] ?? null; }

// Historico completo para los rangos de los graficos (6 meses ... maximo). Se baja al abrir el grafico y se queda en memoria.
type Pts = [string, number][];
const histMem: Record<string, Pts> = {};
export async function loadPriceHistory(id: string, version: string): Promise<Pts | null> {
  if (histMem[id]) return histMem[id];
  try {
    const r = await getJson(BASE + 'history/' + id.replace(/[^A-Za-z0-9_.-]/g, '_') + '.json?v=' + encodeURIComponent(version));
    return (histMem[id] = r.points as Pts);
  } catch { return null; }
}
const chunkMem: Record<string, Map<string, Pts>> = {};
export async function loadSeriesHistory(file: string, id: string): Promise<Pts | null> {
  try {
    if (!chunkMem[file]) {
      const r = await getJson('https://dehesaindex.com/data/' + file, 25000);
      const m = new Map<string, Pts>();
      for (const s of (r.series ?? [])) if (Array.isArray(s.points)) m.set(s.id, s.points.filter((x: any) => typeof x[1] === 'number'));
      chunkMem[file] = m;
    }
    return chunkMem[file].get(id) ?? null;
  } catch { return null; }
}
