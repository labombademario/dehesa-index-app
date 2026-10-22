// Frutas, hortalizas y frutos secos (12-oct-2026): lee los mismos ficheros que la web (data/fv-products.json, data/eu/fruta/<id>.json,
// data/series/ES/*.json y data/spain-crops/crops-<grupo>.json) y guarda la última copia en el teléfono para verlos sin conexión.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from './types';

const WEB = 'https://dehesaindex.com/';
export type Stage = 'pack' | 'farm' | 'retail';
export interface FvLatest { d: string; v: number; p: number | null; pd: string | null; y: number | null; variant: string; stage: Stage; series: string }
export interface FvProduct {
  id: string; group: 'veg' | 'fruit' | 'nut'; name: Record<Lang, string>; emoji: string;
  eu?: { family: string; series: { id: string; variant: string; stage: Stage }[]; latest: Record<string, FvLatest> };
  perc?: { file: string; id: string; m: string; v: number; y: number | null; first: string };
  crops?: { group: string; code: string; campaign: string; status: string | null; area: number | null; production: number | null; extra?: { fresh?: string; ind?: string; glass?: string } };
}
export interface FvDoc { generatedAt: string; countries: string[]; products: FvProduct[] }

const mem: Record<string, any> = {};
// peticiones en curso: dos pantallas que piden el mismo fichero a la vez lo bajan y lo guardan una sola vez
const inflight: Record<string, Promise<any | null>> = {};
function getCached(path: string, maxAgeMs: number): Promise<any | null> {
  return inflight[path] ??= getCached1(path, maxAgeMs).finally(() => { delete inflight[path]; });
}
async function getCached1(path: string, maxAgeMs: number): Promise<any | null> {
  const key = 'dehesa:web:' + path;
  if (mem[path] && Date.now() - mem[path].at < maxAgeMs) return mem[path].body;
  let stored: { at: number; body: any } | null = null;
  try { const raw = await AsyncStorage.getItem(key); stored = raw ? JSON.parse(raw) : null; } catch { stored = null; }
  if (stored && Date.now() - stored.at < maxAgeMs) { mem[path] = stored; return stored.body; }
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(WEB + path + '?t=' + Math.floor(Date.now() / 3600e3), { signal: ctrl.signal }); clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const body = await r.json(); const rec = { at: Date.now(), body }; mem[path] = rec;
    try { await AsyncStorage.setItem(key, JSON.stringify(rec)); } catch { /* sin espacio: solo en memoria */ }
    return body;
  } catch {
    return stored ? stored.body : null;   // sin conexión: la última copia, aunque sea vieja
  }
}
/** Lector genérico de ficheros JSON de la web con caché (también lo usan siembra y sequía) */
export const webJson = getCached;

export function loadFv(): Promise<FvDoc | null> { return getCached('data/fv-products.json', 3 * 3600e3); }
/** Serie semanal de la Comisión: [[YYYY-MM-DD, €/kg]] del país pedido */
export async function loadEuSeries(id: string, cc: string): Promise<[string, number][] | null> {
  const d = await getCached('data/eu/fruta/' + id + '.json', 6 * 3600e3); if (!d) return null;
  const r = ((d.regions ?? []) as { c: string; d: number[]; v: number[] }[]).find(x => x.c === cc); if (!r) return [];
  const e0 = Date.UTC(2000, 0, 1);
  return r.d.map((dd, i) => [new Date(e0 + dd * 864e5).toISOString().slice(0, 10), r.v[i] / 100] as [string, number]);
}
/** Precio percibido del MAPA: [[YYYY-MM, €/kg]] */
export async function loadPerc(file: string, id: string): Promise<[string, number][] | null> {
  const d = await getCached(file, 12 * 3600e3); if (!d) return null;
  const s = (d.series as { id: string; points: [string, number][] }[]).find(x => x.id === id);
  return s ? s.points.map(p => [p[0], p[1] / 100] as [string, number]) : [];
}
export interface CropRow { c: string; n: string; t: (number | null)[]; v: Record<string, (number | null)[]> }
export interface CropsDoc { provinces: Record<string, string>; campaigns: Record<string, { status?: string; crops: CropRow[] }>; source?: { url: string } }
export function loadCrops(group: string): Promise<CropsDoc | null> { return getCached('data/spain-crops/crops-' + group + '.json', 24 * 3600e3); }

export const COUNTRY: Record<string, [string, string, string, string]> = { AT: ['Austria', 'Austria', 'Autriche', 'Austria'], BE: ['Bélgica', 'Belgium', 'Belgique', 'Belgio'], BG: ['Bulgaria', 'Bulgaria', 'Bulgarie', 'Bulgaria'], CY: ['Chipre', 'Cyprus', 'Chypre', 'Cipro'], CZ: ['Chequia', 'Czechia', 'Tchéquie', 'Cechia'], DE: ['Alemania', 'Germany', 'Allemagne', 'Germania'], DK: ['Dinamarca', 'Denmark', 'Danemark', 'Danimarca'], EL: ['Grecia', 'Greece', 'Grèce', 'Grecia'], ES: ['España', 'Spain', 'Espagne', 'Spagna'], FR: ['Francia', 'France', 'France', 'Francia'], HR: ['Croacia', 'Croatia', 'Croatie', 'Croazia'], HU: ['Hungría', 'Hungary', 'Hongrie', 'Ungheria'], IT: ['Italia', 'Italy', 'Italie', 'Italia'], LT: ['Lituania', 'Lithuania', 'Lituanie', 'Lituania'], LU: ['Luxemburgo', 'Luxembourg', 'Luxembourg', 'Lussemburgo'], LV: ['Letonia', 'Latvia', 'Lettonie', 'Lettonia'], MT: ['Malta', 'Malta', 'Malte', 'Malta'], NL: ['Países Bajos', 'Netherlands', 'Pays-Bas', 'Paesi Bassi'], PL: ['Polonia', 'Poland', 'Pologne', 'Polonia'], PT: ['Portugal', 'Portugal', 'Portugal', 'Portogallo'], RO: ['Rumanía', 'Romania', 'Roumanie', 'Romania'], SE: ['Suecia', 'Sweden', 'Suède', 'Svezia'], SI: ['Eslovenia', 'Slovenia', 'Slovénie', 'Slovenia'], SK: ['Eslovaquia', 'Slovakia', 'Slovaquie', 'Slovacchia'], EE: ['Estonia', 'Estonia', 'Estonie', 'Estonia'], FI: ['Finlandia', 'Finland', 'Finlande', 'Finlandia'], IE: ['Irlanda', 'Ireland', 'Irlande', 'Irlanda'] , US: ['EE. UU.', 'United States', 'États-Unis', 'Stati Uniti'], CA: ['Canadá', 'Canada', 'Canada', 'Canada'], UK: ['Reino Unido', 'United Kingdom', 'Royaume-Uni', 'Regno Unito'], GB: ['Reino Unido', 'United Kingdom', 'Royaume-Uni', 'Regno Unito'], AU: ['Australia', 'Australia', 'Australie', 'Australia'], CH: ['Suiza', 'Switzerland', 'Suisse', 'Svizzera'], NO: ['Noruega', 'Norway', 'Norvège', 'Norvegia'], IS: ['Islandia', 'Iceland', 'Islande', 'Islanda'], MK: ['Macedonia del Norte', 'North Macedonia', 'Macédoine du Nord', 'Macedonia del Nord'], AR: ['Argentina', 'Argentina', 'Argentine', 'Argentina'], CL: ['Chile', 'Chile', 'Chili', 'Cile'], UY: ['Uruguay', 'Uruguay', 'Uruguay', 'Uruguay'], BR: ['Brasil', 'Brazil', 'Brésil', 'Brasile'], MX: ['México', 'Mexico', 'Mexique', 'Messico'], CN: ['China', 'China', 'Chine', 'Cina'], IN: ['India', 'India', 'Inde', 'India'], UA: ['Ucrania', 'Ukraine', 'Ukraine', 'Ucraina'], RU: ['Rusia', 'Russia', 'Russie', 'Russia'] };
const LI: Record<Lang, number> = { es: 0, en: 1, fr: 2, it: 3 };
export function countryName(cc: string, L: Lang): string { return COUNTRY[cc] ? COUNTRY[cc][LI[L]] : cc; }
const STG: Record<Stage, [string, string, string, string]> = { pack: ['salida de almacén', 'packing house', 'sortie de station', 'uscita magazzino'], farm: ['en finca', 'farm-gate', 'à la ferme', 'in azienda'], retail: ['compra del minorista', 'retailer buying', 'achat du détaillant', 'acquisto dettagliante'] };
export function stageName(s: Stage, L: Lang): string { return STG[s] ? STG[s][LI[L]] : s; }
const VAR: Record<string, [string, string, string, string]> = { 'All types and varieties': ['todos los tipos', 'all types', 'tous types', 'tutti i tipi'], 'Round': ['redondo', 'round', 'ronde', 'tondo'], 'Cherry/Special': ['cereza', 'cherry', 'cerise', 'ciliegino'], 'Trusses=Vine/"Grappes"': ['en rama', 'on the vine', 'en grappe', 'a grappolo'], 'National weighted average of all types and varieties': ['media nacional', 'national average', 'moyenne nationale', 'media nazionale'], 'National weighted average of main varieties covering at least 70 % of the representative market in the reference period of the notification': ['media nacional', 'national average', 'moyenne nationale', 'media nazionale'], 'Smooth varieties': ['lisos', 'smooth', 'lisses', 'lisci'], 'White': ['blanco', 'white', 'blanc', 'bianco'], 'Violet': ['morado', 'purple', 'violet', 'viola'], 'Spring': ['tierno', 'spring', 'nouveau', 'fresco'], 'Yellow flesh': ['carne amarilla', 'yellow flesh', 'chair jaune', 'polpa gialla'], 'White flesh': ['carne blanca', 'white flesh', 'chair blanche', 'polpa bianca'], 'Flat': ['plano (paraguayo)', 'flat', 'plate', 'piatta'], 'Closed': ['cerrado', 'closed', 'fermé', 'chiuso'], 'Conference': ['Conferencia', 'Conference', 'Conférence', 'Conference'], 'Golden delicious': ['Golden', 'Golden', 'Golden', 'Golden'] };
export function variantName(v: string, L: Lang): string { return VAR[v] ? VAR[v][LI[L]] : v; }

// Lo que cobra el agricultor fuera de España (data/fv-farm.json): INSEE en Francia, Eurostat en el resto. Nunca datos de otro país.
export interface FarmIdx { src: 'insee' | 'eurostat'; freq: 'M' | 'Q'; code: string; note?: string | null; pts: [string, number][] }
export interface FarmAbs { src: 'eurostat'; freq: 'A'; code: string; note?: string | null; unit: string; pts: [string, number][] }
export interface FarmDoc { products: Record<string, Record<string, { idx?: FarmIdx; abs?: FarmAbs }>> }
export async function loadFarm(): Promise<FarmDoc | null> { return (await getCached('data/fv-farm.json', 12 * 3600e3)) as FarmDoc | null; }
