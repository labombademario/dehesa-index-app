// Estado de la app: datos (con caché) y lo del usuario (idioma, perfil, cesta, avisos, explotación), guardado en el teléfono.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { webJson } from './fv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import type { AppData, Lang, Price } from './types';
import type { AlertRule } from './logic';
import { bundled, cached, refresh } from './api';
import { translate } from './i18n';
import { applyTheme, type Mode } from './theme';
import { useColorScheme } from 'react-native';
import { date as fmtDay } from './format';
import { USER_KEY, runCheck, syncBackgroundTask, euCcOf } from './notify';

export type Profile = 'cereal' | 'dairy' | 'pig' | 'buyer';
/** 'US', 'CA' o el código del país de la UE (ES, IT, FR, DE...). España usa los precios generales; el resto, los suyos (data/app/v1/eu/<CC>.json). */
export type Market = string;
// Países de la UE con precios propios en data/app/v1/eu (más España); un código fuera de la lista (UK, CH, AR…) no pide ese fichero
export const EU_CCS = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];
export const isEu = (m: Market) => EU_CCS.includes(m);
export interface CropLine { id: string; product: 'trigo' | 'maiz' | 'cebada'; ha: string; yld: string; cost: string }
export interface UserState {
  v: 1;
  lang: Lang;
  theme: 'auto' | 'light' | 'dark';
  onboarded: boolean;
  profile: Profile;
  market: Market;
  basket: string[];
  alerts: AlertRule[];
  crops: CropLine[];
  milk: { cows: string; kg: string; cost: string };
  pig: { n: string; kg: string; cost: string };
  /** países fijados en «Mis países» (si nunca se ha tocado, solo el del mercado elegido) */
  favCountries?: string[];
}

// Cesta inicial por perfil y mercado: claves región:producto de data/app/v1/prices.json
const PRESETS: Record<'ES' | 'US' | 'CA', Record<Profile, string[]>> = {
  ES: { cereal: ['eu:trigo', 'eu:maiz', 'eu:cebada', 'eu:urea', 'eu:diesel'], dairy: ['eu:leche', 'eu:maiz', 'eu:harina_soja', 'eu:diesel'], pig: ['eu:cerdo', 'eu:maiz', 'eu:cebada', 'eu:harina_soja'], buyer: ['eu:trigo', 'eu:maiz', 'eu:cerdo', 'eu:leche', 'eu:cordero', 'eu:oliva'] },
  US: { cereal: ['us:maiz', 'us:trigo', 'us:diesel', 'eu:urea'], dairy: ['us:leche', 'us:maiz', 'us:harina_soja', 'us:diesel'], pig: ['us:cerdo', 'us:maiz', 'us:harina_soja', 'us:diesel'], buyer: ['us:maiz', 'us:trigo', 'us:leche', 'us:cerdo', 'us:vaca'] },
  CA: { cereal: ['ca:trigo', 'ca:canola_elevador', 'ca:cebada', 'ca:trigo_cwrs_ab'], dairy: ['ca:leche', 'ca:cebada', 'ca:maiz'], pig: ['ca:cerdo', 'ca:cerdo_ab', 'ca:cebada', 'ca:maiz'], buyer: ['ca:trigo', 'ca:canola_elevador', 'ca:cerdo', 'ca:leche'] },
};
// Otros países de la UE: solo productos de ESE país ('@' = el país elegido); nada de España ni de otro país
const EU_PRESET: Record<Profile, string[]> = { cereal: ['@:trigo', '@:maiz', '@:cebada', '@:trigo_duro'], dairy: ['@:leche', '@:mantequilla', '@:maiz', '@:cebada'], pig: ['@:cerdo', '@:lechon', '@:maiz', '@:cebada'], buyer: ['@:trigo', '@:maiz', '@:cerdo', '@:leche', '@:vaca', '@:cordero', '@:pollo', '@:oliva'] };
export function presetFor(market: Market, profile: Profile): string[] {
  if (market === 'ES' || market === 'US' || market === 'CA') return PRESETS[market][profile];
  return EU_PRESET[profile].map(k => k.replace('@', market));
}
export const BASKET_MAX = 8;
/** Nombre de la fuente en el idioma de la app (los datos lo traen en español: «Comisión Europea · Agri-food», «Defra (Reino Unido)») */
export function srcName(n: string, L: Lang): string {
  const W: Record<string, Record<Lang, string>> = { 'Comisión Europea': { es: 'Comisión Europea', en: 'European Commission', fr: 'Commission européenne', it: 'Commissione europea' }, 'Banco Mundial': { es: 'Banco Mundial', en: 'World Bank', fr: 'Banque mondiale', it: 'Banca Mondiale' }, 'Reino Unido': { es: 'Reino Unido', en: 'UK', fr: 'Royaume-Uni', it: 'Regno Unito' } };
  for (const w in W) n = n.split(w).join(W[w][L] ?? w);
  return n;
}
/** « · Último dato: 2 ago 2026» para un precio viejo para su frecuencia; '' si está al día */
export function staleSuffix(p: Price | undefined, L: Lang, t: (k: string, ...v: (string | number)[]) => string): string {
  return p?.stale ? ' · ' + t('staleData', fmtDay(p.date, L)) : '';
}

function deviceLang(): Lang {
  try { const l = getLocales()[0]?.languageCode; if (l === 'es' || l === 'en' || l === 'fr' || l === 'it') return l; } catch { /* nada */ }
  return 'es';
}
export function defaults(): UserState {
  return { v: 1, lang: deviceLang(), theme: 'auto', onboarded: false, profile: 'cereal', market: 'ES', basket: [], alerts: [],
    crops: [{ id: 'c1', product: 'trigo', ha: '40', yld: '6.5', cost: '1150' }, { id: 'c2', product: 'maiz', ha: '15', yld: '11', cost: '2100' }],
    milk: { cows: '120', kg: '9500', cost: '38' }, pig: { n: '2000', kg: '88', cost: '1.55' } };
}
export function resolvePreset(prices: Price[], keys: string[]): string[] {
  const out = keys.map(k => { const [r, p] = k.split(':'); return /^[A-Z]{2}$/.test(r) ? prices.find(x => x.cc === r && x.product === p)?.id : prices.find(x => x.region === r && !x.cc && x.product === p)?.id; }).filter((x): x is string => !!x);
  // Un país que no publica los productos del perfil (p. ej. Chipre o Letonia sin cereales) no se queda con la cesta vacía:
  // se completa con otros precios de ESE país, nunca de otro
  const cc = keys.map(k => k.split(':')[0]).find(r => /^[A-Z]{2}$/.test(r) && r !== 'ES' && r !== 'US' && r !== 'CA');
  if (cc && out.length < 4) for (const x of prices) { if (out.length >= 4) break; if (x.cc === cc && !out.includes(x.id)) out.push(x.id); }
  return out;
}

interface Ctx {
  data: AppData;
  refreshing: boolean;
  offline: boolean;
  reload: () => Promise<void>;
  user: UserState;
  setUser: (patch: Partial<UserState> | ((u: UserState) => Partial<UserState>)) => void;
  t: (key: string, ...vars: (string | number)[]) => string;
  price: (id: string) => Price | undefined;
  ready: boolean;
  mode: Mode;
  /** Carga los precios de un país de la UE (para la bienvenida y los ajustes) */
  loadEu: (cc: string) => Promise<void>;
}
const C = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => bundled());
  const [user, setUserState] = useState<UserState>(defaults);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [eu, setEu] = useState<Record<string, Price[]>>({});
  const loadEu = useCallback(async (cc: string) => {
    if (!cc || cc === 'ES' || !isEu(cc)) return;
    const d = await webJson('data/app/v1/eu/' + cc + '.json', 6 * 3600e3);
    if (d?.prices) setEu(o => ({ ...o, [cc]: d.prices as Price[] }));
  }, []);
  const system = useColorScheme();
  const mode: Mode = user.theme === 'dark' ? 'dark' : user.theme === 'light' ? 'light' : system === 'dark' ? 'dark' : 'light';
  applyTheme(mode); // antes de pintar los hijos, para que lean la paleta nueva

  const reload = useCallback(async () => {
    setRefreshing(true);
    try { setData(await refresh()); setOffline(false); } catch { setOffline(true); } finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const c = await cached(); if (c && c.prices.length) setData(c);
      try { const raw = await AsyncStorage.getItem(USER_KEY); if (raw) setUserState({ ...defaults(), ...JSON.parse(raw) }); } catch { /* datos corruptos: valores por defecto */ }
      setReady(true);
      reload();
    })();
  }, [reload]);

  // Avisos: comprobar cada vez que llegan datos y mantener la tarea de segundo plano solo si hay avisos activos
  // (con merged, que ya incluye los precios de otros países de la UE cargados: un aviso sobre el trigo de Francia también se comprueba)
  useEffect(() => { if (ready) syncBackgroundTask(user.alerts.some(a => a.on)); }, [ready, user.alerts]);

  const setUser = useCallback((patch: Partial<UserState> | ((u: UserState) => Partial<UserState>)) => {
    setUserState(prev => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      AsyncStorage.setItem(USER_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // País del usuario y, además, los de los precios de su cesta y sus avisos (p. ej. alguien de España que sigue el trigo de Francia)
  const euNeeded = useMemo(() => [...new Set([user.market, ...user.basket.map(euCcOf), ...user.alerts.map(a => euCcOf(a.priceId))].filter((x): x is string => !!x))].sort().join(','), [user.market, user.basket, user.alerts]);
  useEffect(() => { if (ready) euNeeded.split(',').filter(Boolean).forEach(cc => { loadEu(cc); }); }, [ready, euNeeded, loadEu]);
  const merged = useMemo<AppData>(() => { const extra = Object.values(eu).flat(); return extra.length ? { ...data, prices: data.prices.concat(extra.filter(x => !data.prices.some(y => y.id === x.id))) } : data; }, [data, eu]);
  useEffect(() => { if (ready && merged.fetchedAt) runCheck(merged, user.alerts.filter(a => a.on), user.lang).catch(() => {}); }, [merged, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo<Ctx>(() => ({
    data: merged, loadEu, refreshing, offline, reload, user, setUser, ready, mode,
    t: (key, ...vars) => translate(user.lang, key, ...vars),
    price: (id: string) => merged.prices.find(p => p.id === id),
  }), [merged, loadEu, refreshing, offline, reload, user, setUser, ready, mode]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}
