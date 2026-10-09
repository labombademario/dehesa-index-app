// Datos de dehesaindex.com/data/app/v1 con caché en el teléfono y copia incluida para el primer arranque sin conexión.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData, CountryProfile, CountryMap, RegionData } from './types';

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

// Mapa de un pais (data/app/v1/map/<CC>.json): contornos de regiones y metricas, con copia en el telefono.
const mapMem: Record<string, CountryMap> = {};
export async function loadMap(cc: string): Promise<{ map: CountryMap | null; offline: boolean }> {
  const key = 'dehesa:map:' + cc;
  let stored: CountryMap | null = mapMem[cc] ?? null;
  if (!stored) { try { const raw = await AsyncStorage.getItem(key); stored = raw ? JSON.parse(raw) : null; } catch { stored = null; } }
  try {
    const m = await getJson(BASE + 'manifest.json?t=' + Date.now());
    const h = m.maps?.[cc]?.hash as string | undefined;
    if (!h) return { map: null, offline: false };
    if (stored && stored.hash === h) { mapMem[cc] = stored; return { map: stored, offline: false }; }
    const fresh: CountryMap = await getJson(BASE + 'map/' + cc + '.json?h=' + h, 25000);
    mapMem[cc] = fresh;
    try { await AsyncStorage.setItem(key, JSON.stringify(fresh)); } catch { /* sin espacio */ }
    return { map: fresh, offline: false };
  } catch {
    if (stored) mapMem[cc] = stored;
    return { map: stored, offline: true };
  }
}
export function mapFromMemory(cc: string): CountryMap | null { return mapMem[cc] ?? null; }

// Datos por region de un pais (data/app/v1/region/<CC>.json)
const regMem: Record<string, RegionData> = {};
export async function loadRegionData(cc: string): Promise<RegionData | null> {
  const key = 'dehesa:region:' + cc;
  let stored: RegionData | null = regMem[cc] ?? null;
  if (!stored) { try { const raw = await AsyncStorage.getItem(key); stored = raw ? JSON.parse(raw) : null; } catch { stored = null; } }
  try {
    const m = await getJson(BASE + 'manifest.json?t=' + Date.now());
    const h = m.regionData?.[cc]?.hash as string | undefined;
    if (!h) return null;
    if (stored && stored.hash === h) { regMem[cc] = stored; return stored; }
    const fresh: RegionData = await getJson(BASE + 'region/' + cc + '.json?h=' + h, 25000);
    regMem[cc] = fresh;
    try { await AsyncStorage.setItem(key, JSON.stringify(fresh)); } catch { /* sin espacio */ }
    return fresh;
  } catch { if (stored) regMem[cc] = stored; return stored; }
}

// Catalogo completo de un pais (data/catalog/<CC>.json de la web: todas sus series, sin puntos). Pesa hasta ~400 KB: solo al explorar.
export interface CatSeries { id: string; label: string; unit: string; freq: string; group: string; latestPeriod: string; latest: number; changePct: number | null; sourceId: string; file: string }
const catMem: Record<string, CatSeries[]> = {};
export async function loadCatalog(cc: string): Promise<CatSeries[] | null> {
  if (catMem[cc]) return catMem[cc];
  try {
    const r = await getJson('https://dehesaindex.com/data/catalog/' + cc + '.json', 30000);
    return (catMem[cc] = (r.series ?? []).filter((s: any) => s.file && typeof s.latest === 'number' && s.latestPeriod));
  } catch { return null; }
}
export function catalogFromMemory(cc: string): CatSeries[] | null { return catMem[cc] ?? null; }

// PAC: asignaciones por pais del Reglamento (UE) 2021/2115 (data/app/v1/pac.json)
export type PacData = { sourceName: string; url: string; act: string; consolidated: string; unit: string; years: string[]; direct: [string, number[]][]; rural: [string, number[]][] };
let pacMem: PacData | null = null;
export async function loadPac(): Promise<PacData | null> {
  if (pacMem) return pacMem;
  try {
    const m = await getJson(BASE + 'manifest.json?t=' + Date.now());
    const h = m.files?.['pac.json']?.hash as string | undefined;
    if (!h) return null;
    const d = await getJson(BASE + 'pac.json?h=' + h);
    pacMem = d.pac as PacData;
    try { await AsyncStorage.setItem('dehesa:pac', JSON.stringify(pacMem)); } catch { /* */ }
  } catch {
    try { const raw = await AsyncStorage.getItem('dehesa:pac'); if (raw) pacMem = JSON.parse(raw); } catch { /* */ }
  }
  return pacMem;
}

// Resumen diario y semanal (data/app/v1/summary.json)
export type SummaryData = {
  daily: { at: string; counts: { datasets: number; periods: number; series: number; revisions: number };
    movers: { cc: string; label: string; labelT?: Record<string, string>; unit: string; period: string; value: number; changePct: number }[];
    revisions: { cc: string; label: string; labelT?: Record<string, string>; unit: string; period: string; old: number; new: number; pct: number }[] } | null;
  weekly: { week: string; from: string; to: string; items: number; sources: number; topics: [string, number][]; regions: [string, number][];
    top: { h: string; source: string; url: string; date: string; region: string; topic: string; lang: string }[] } | null;
};
let sumMem: SummaryData | null = null;
export async function loadSummary(): Promise<SummaryData | null> {
  if (sumMem) return sumMem;
  try {
    const m = await getJson(BASE + 'manifest.json?t=' + Date.now());
    const h = m.files?.['summary.json']?.hash as string | undefined;
    if (!h) return null;
    const d = await getJson(BASE + 'summary.json?h=' + h);
    sumMem = d.summary as SummaryData;
    try { await AsyncStorage.setItem('dehesa:summary', JSON.stringify(sumMem)); } catch { /* */ }
  } catch {
    try { const raw = await AsyncStorage.getItem('dehesa:summary'); if (raw) sumMem = JSON.parse(raw); } catch { /* */ }
  }
  return sumMem;
}
