// Estado de la app: datos (con caché) y lo del usuario (idioma, perfil, cesta, avisos, explotación), guardado en el teléfono.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import type { AppData, Lang, Price } from './types';
import type { AlertRule } from './logic';
import { bundled, cached, refresh } from './api';
import { translate } from './i18n';
import { USER_KEY, runCheck, syncBackgroundTask } from './notify';

export type Profile = 'cereal' | 'dairy' | 'pig' | 'buyer';
export type Market = 'ES' | 'US' | 'CA';
export interface CropLine { id: string; product: 'trigo' | 'maiz' | 'cebada'; ha: string; yld: string; cost: string }
export interface UserState {
  v: 1;
  lang: Lang;
  onboarded: boolean;
  profile: Profile;
  market: Market;
  basket: string[];
  alerts: AlertRule[];
  crops: CropLine[];
  milk: { cows: string; kg: string; cost: string };
  pig: { n: string; kg: string; cost: string };
}

// Cesta inicial por perfil y mercado: claves región:producto de data/app/v1/prices.json
export const PRESETS: Record<Market, Record<Profile, string[]>> = {
  ES: { cereal: ['eu:trigo', 'eu:maiz', 'eu:cebada', 'eu:urea', 'eu:diesel'], dairy: ['eu:leche', 'eu:maiz', 'eu:harina_soja', 'eu:diesel'], pig: ['eu:cerdo', 'eu:maiz', 'eu:cebada', 'eu:harina_soja'], buyer: ['eu:trigo', 'eu:maiz', 'eu:cerdo', 'eu:leche', 'eu:cordero', 'eu:oliva'] },
  US: { cereal: ['us:maiz', 'us:trigo', 'us:diesel', 'eu:urea'], dairy: ['us:leche', 'us:maiz', 'us:harina_soja', 'us:diesel'], pig: ['us:cerdo', 'us:maiz', 'us:harina_soja', 'us:diesel'], buyer: ['us:maiz', 'us:trigo', 'us:leche', 'us:cerdo', 'us:vaca'] },
  CA: { cereal: ['ca:trigo', 'ca:canola_elevador', 'ca:cebada', 'ca:trigo_cwrs_ab'], dairy: ['ca:leche', 'ca:cebada', 'ca:maiz'], pig: ['ca:cerdo', 'ca:cerdo_ab', 'ca:cebada', 'ca:maiz'], buyer: ['ca:trigo', 'ca:canola_elevador', 'ca:cerdo', 'ca:leche'] },
};
export const BASKET_MAX = 8;

function deviceLang(): Lang {
  try { const l = getLocales()[0]?.languageCode; if (l === 'es' || l === 'en' || l === 'fr' || l === 'it') return l; } catch { /* nada */ }
  return 'es';
}
export function defaults(): UserState {
  return { v: 1, lang: deviceLang(), onboarded: false, profile: 'cereal', market: 'ES', basket: [], alerts: [],
    crops: [{ id: 'c1', product: 'trigo', ha: '40', yld: '6.5', cost: '1150' }, { id: 'c2', product: 'maiz', ha: '15', yld: '11', cost: '2100' }],
    milk: { cows: '120', kg: '9500', cost: '38' }, pig: { n: '2000', kg: '88', cost: '1.55' } };
}
export function resolvePreset(prices: Price[], keys: string[]): string[] {
  return keys.map(k => { const [r, p] = k.split(':'); return prices.find(x => x.region === r && x.product === p)?.id; }).filter((x): x is string => !!x);
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
}
const C = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => bundled());
  const [user, setUserState] = useState<UserState>(defaults);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

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
  useEffect(() => { if (ready && data.fetchedAt) runCheck(data, user.alerts.filter(a => a.on), user.lang).catch(() => {}); }, [data, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) syncBackgroundTask(user.alerts.some(a => a.on)); }, [ready, user.alerts]);

  const setUser = useCallback((patch: Partial<UserState> | ((u: UserState) => Partial<UserState>)) => {
    setUserState(prev => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      AsyncStorage.setItem(USER_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({
    data, refreshing, offline, reload, user, setUser, ready,
    t: (key, ...vars) => translate(user.lang, key, ...vars),
    price: (id: string) => data.prices.find(p => p.id === id),
  }), [data, refreshing, offline, reload, user, setUser, ready]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}
