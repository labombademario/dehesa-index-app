// Formato de data/app/v1 en dehesaindex.com (lo genera scripts/build-app-views.mjs en el repositorio de la web).
export type Lang = 'es' | 'en' | 'fr' | 'it';
export type T4 = Record<Lang, string>;

export interface Price {
  id: string;
  product: string;
  region: 'eu' | 'us' | 'uk' | 'ca';
  name: T4;
  place: T4;
  unit: T4;
  currency: string;
  value: number;
  changePct: number | null;
  date: string;
  frequency: string;
  sourceId: string;
  sourceName: string;
  comparability: string | null;
  note: { es: string } | null;
  points: [string, number][];
  yearAgo: { date: string; value: number } | null;
}

export interface CalendarEvent { id: string; name: string; agency: string; at: string }

export interface Today {
  index: { value: number; period: string; changeMoMPct: number; changeYoYPct: number; base: { period: string; value: number } } | null;
  newDatasets: { file: string; name: string; series: number }[];
  revisions: number;
  calendar: CalendarEvent[];
}

export interface NewsItem { id: string; title: string; source: string; country: string; lang: string; date: string; url: string; region: string }
export interface Country { code: string; name: T4; coveragePct: number | null; url: string }
export interface Section {
  id: string;
  group: 'production' | 'trade' | 'costs' | 'data';
  name: T4;
  url: string;
  figure?: { value: number | string; unit: string | T4; label: T4; period: string; sourceId: string; sourceName: string };
}

export interface AppData {
  prices: Price[];
  today: Today;
  news: NewsItem[];
  countries: Country[];
  sections: Section[];
  fetchedAt: string | null;   // null = copia incluida en la app (sin conexion desde la instalacion)
}

export interface CountrySeries { id: string; label: string; labelT?: T4; unit: string; frequency: string; latest: number; period: string; changePct: number | null; sourceId: string; file?: string; points: [string, number][] }
export interface CountryGroup { id: string; title: T4; total: number; series: CountrySeries[] }
export interface CountryProfile { country: string; seriesTotal: number; latestPeriod: string | null; firstPeriod: string | null; sources: string[]; sourceNames: Record<string, string>; groups: CountryGroup[]; hash?: string }

export interface MapMetric { id: string; label: T4; unit: string; dec: number; ramp: 'green' | 'warm'; period: string | null; vals: Record<string, number> }
export interface CountryMap { country: string; viewBox: string; regions: { id: string; name: T4; d: string }[]; metrics: MapMetric[]; hash?: string }

export interface RegionPoint { period: string; value: number; points?: [number | string, number][] }
export interface RegionRecord {
  eaa: (RegionPoint & { k: string })[];
  crops: { k: string; area: RegionPoint | null; prod: { period: string; value: number } | null }[];
  animals: (RegionPoint & { k: string })[];
  milk: RegionPoint | null;
  farms: { period: string; HLD?: number; HA?: number; EUR?: number; LSU?: number; AWU?: number } | null;
}
export interface RegionData { country: string; units: Record<string, string>; source: { name: string; url: string; license: string } | null; labels: Record<string, T4>; regions: Record<string, RegionRecord>; hash?: string }
