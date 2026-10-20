// Provincias de España: clima del mes frente a lo normal (NASA POWER) y censos de ganado (MAPA), como en «Mi mercado» de la web.
// Lee data/app/v1/prov/ES.json (scripts/build-app-prov.mjs). No se calcula ni se estima nada en la app.
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle, Segmented } from '../components/ui';
import { RangeChart } from '../components/RangeChart';
import { C, changeColor } from '../lib/theme';
import { num, pct, date as fmtDate } from '../lib/format';
import { webJson } from '../lib/fv';
import { norm } from '../lib/logic';
import { tx } from '../lib/tx';

type Clim = { city: string; m: [string, number, number, number | null, number, number, number][] };
type Prov = { id: string; name: string; climate: Clim | null; live: Record<string, [string, number][]> };
type Doc = { baseline: string; climateAsOf: string; climateSource: { name: string; url: string }; liveSource: { name: string; url: string }; provinces: Prov[] };
const SP: Record<string, [string, string, string, string]> = { bovino: ['🐄 Vacuno', '🐄 Cattle', '🐄 Bovins', '🐄 Bovini'], ovino: ['🐑 Ovino', '🐑 Sheep', '🐑 Ovins', '🐑 Ovini'], caprino: ['🐐 Caprino', '🐐 Goats', '🐐 Caprins', '🐐 Caprini'], porcino: ['🐖 Porcino', '🐖 Pigs', '🐖 Porcins', '🐖 Suini'] };
const LI = { es: 0, en: 1, fr: 2, it: 3 } as const;
const iso = (p: string) => (p.length === 7 ? p + '-01' : p);

export default function Provincias() {
  const { user } = useApp();
  const L = user.lang;
  const { p: p0 } = useLocalSearchParams<{ p?: string }>();
  const { width } = useWindowDimensions();
  const cw = Math.min(width, 700) - 32 - 28;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [done, setDone] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(p0 ? String(p0) : null);
  const [sp, setSp] = useState('bovino');
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  useEffect(() => { webJson('data/app/v1/prov/ES.json', 6 * 3600e3).then(d => { setDoc(d); setDone(true); }); }, []);
  const list = useMemo(() => { const k = norm(q.trim()); return (doc?.provinces ?? []).filter(x => !k || norm(x.name).includes(k)); }, [doc, q]);
  const pv = doc?.provinces.find(x => x.id === sel) ?? null;
  const species = pv ? Object.keys(SP).filter(k => pv.live[k]) : [];
  const spCur = species.includes(sp) ? sp : species[0];
  const live = pv && spCur ? pv.live[spCur] : null;
  const last = pv?.climate?.m[pv.climate.m.length - 1];
  const title = T('Provincias de España', 'Provinces of Spain', 'Provinces d’Espagne', 'Province della Spagna');
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{pv ? pv.name : title}</Text>
      {!doc ? <Note>{done ? T('Sin datos ahora mismo.', 'No data right now.', 'Pas de données pour le moment.', 'Nessun dato al momento.') : T('Cargando…', 'Loading…', 'Chargement…', 'Caricamento…')}</Note> : !pv ? <>
        <Note>{T('Elige una provincia: lluvia y temperatura del mes frente a lo normal y censos de ganado.', 'Pick a province: rainfall and temperature for the month against normal, and livestock counts.', 'Choisissez une province : pluie et température du mois par rapport à la normale, et effectifs d’élevage.', 'Scegli una provincia: pioggia e temperatura del mese rispetto alla norma ed effettivi zootecnici.')}</Note>
        <TextInput value={q} onChangeText={setQ} placeholder={T('Buscar provincia', 'Search province', 'Rechercher une province', 'Cerca provincia')} placeholderTextColor={C.textMuted} autoCorrect={false} clearButtonMode="while-editing"
          style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: C.text }} />
        <Card>{list.map((x, i) => <Row key={x.id} first={i === 0} title={x.name} sub={[x.climate ? '🌦️' : '', Object.keys(x.live).length ? '🐄' : ''].filter(Boolean).join(' ')} onPress={() => setSel(x.id)} />)}</Card>
      </> : <>
        <Pressable onPress={() => setSel(null)} accessibilityRole="button"><Text style={{ color: C.accent, fontWeight: '600' }}>‹ {T('Otra provincia', 'Another province', 'Autre province', 'Altra provincia')}</Text></Pressable>
        {last && pv.climate ? <>
          <SectionTitle>{'🌦️ ' + T('Clima', 'Climate', 'Climat', 'Clima')}</SectionTitle>
          <Text style={{ fontSize: 12.5, color: C.textMuted }}>{T(`Punto de ${pv.climate.city}. Frente a la media ${doc.baseline} del mismo mes.`, `Point at ${pv.climate.city}. Against the ${doc.baseline} average for the same month.`, `Point de ${pv.climate.city}. Par rapport à la moyenne ${doc.baseline} du même mois.`, `Punto di ${pv.climate.city}. Rispetto alla media ${doc.baseline} dello stesso mese.`)}</Text>
          <Card>
            <Row first title={T('Lluvia', 'Rainfall', 'Pluie', 'Pioggia') + ' · ' + fmtDate(last[0], L)} sub={T('Normal: ', 'Normal: ', 'Normale : ', 'Norma: ') + num(last[2], L, 1) + ' mm'} right={num(last[1], L, 1) + ' mm'} rightSub={last[3] == null ? undefined : pct(last[3], L)} rightColor={changeColor(last[3])} />
            <Row title={T('Temperatura media', 'Mean temperature', 'Température moyenne', 'Temperatura media') + ' · ' + fmtDate(last[0], L)} sub={T('Normal: ', 'Normal: ', 'Normale : ', 'Norma: ') + num(last[5], L, 1) + ' °C'} right={num(last[4], L, 1) + ' °C'} rightSub={(last[6] >= 0 ? '+' : '−') + num(Math.abs(last[6]), L, 1) + ' °C'} rightColor={changeColor(-last[6])} />
          </Card>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Lluvia frente a lo normal (%)', 'Rainfall against normal (%)', 'Pluie par rapport à la normale (%)', 'Pioggia rispetto alla norma (%)')}</Text>
          <RangeChart key={pv.id + 'r'} points={pv.climate.m.filter(x => x[3] != null).map(x => [iso(x[0]), x[3] as number] as [string, number])} unit="%" label={T('Lluvia frente a lo normal', 'Rainfall against normal', 'Pluie par rapport à la normale', 'Pioggia rispetto alla norma')} width={cw} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Temperatura frente a lo normal (°C)', 'Temperature against normal (°C)', 'Température par rapport à la normale (°C)', 'Temperatura rispetto alla norma (°C)')}</Text>
          <RangeChart key={pv.id + 't'} points={pv.climate.m.map(x => [iso(x[0]), x[6]] as [string, number])} unit="°C" label={T('Temperatura frente a lo normal', 'Temperature against normal', 'Température par rapport à la normale', 'Temperatura rispetto alla norma')} width={cw} />
          <Pressable onPress={() => Linking.openURL(doc.climateSource.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{T('Fuente: ', 'Source: ', 'Source : ', 'Fonte: ') + doc.climateSource.name}</Text></Pressable>
        </> : null}
        {live && spCur ? <>
          <SectionTitle>{'🐄 ' + T('Ganadería', 'Livestock', 'Élevage', 'Zootecnia')}</SectionTitle>
          <Segmented options={species.map(k => ({ value: k, label: SP[k][LI[L]] }))} value={spCur} onChange={setSp} />
          <Card>
            <Row first title={SP[spCur][LI[L]]} sub={T('Censo de ', 'Count in ', 'Effectif de ', 'Censimento di ') + fmtDate(live[live.length - 1][0], L)} right={num(live[live.length - 1][1], L, 0)}
              rightSub={live.length > 2 && live[live.length - 3][1] ? pct((live[live.length - 1][1] / live[live.length - 3][1] - 1) * 100, L) : undefined} rightColor={live.length > 2 && live[live.length - 3][1] ? changeColor((live[live.length - 1][1] / live[live.length - 3][1] - 1) * 100) : undefined} />
          </Card>
          <Text style={{ fontSize: 12.5, color: C.textMuted }}>{T('Cabezas en total (mayo y noviembre). La variación compara con el mismo mes del año anterior.', 'Total head (May and November). Change is against the same month a year earlier.', 'Total de têtes (mai et novembre). La variation compare au même mois un an plus tôt.', 'Totale capi (maggio e novembre). La variazione confronta con lo stesso mese dell’anno prima.')}</Text>
          <RangeChart key={pv.id + spCur} points={live.map(x => [iso(x[0]), x[1]] as [string, number])} unit={T('cabezas', 'head', 'têtes', 'capi')} label={SP[spCur][LI[L]]} width={cw} />
          <Pressable onPress={() => Linking.openURL(doc.liveSource.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{T('Fuente: ', 'Source: ', 'Source : ', 'Fonte: ') + doc.liveSource.name}</Text></Pressable>
        </> : null}
      </>}
    </Screen>
  );
}
