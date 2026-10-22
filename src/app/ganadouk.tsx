// Ganadería del Reino Unido (22-oct-2026), como la pestaña «Reino Unido» de ganaderia.html: mercado semanal de vacuno y corderos de Irlanda del Norte
// (DAERA; data/uk-ni-market-stats.json) y cabaña ganadera de Escocia según el censo de junio (Gobierno de Escocia; data/uk-scotland-stats.json). OGL.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note, SectionTitle, LineChart } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { num, pct, date as fmtDate } from '../lib/format';
import { tx } from '../lib/tx';
import { webJson } from '../lib/fv';
import type { Lang } from '../lib/types';

type L4 = [string, string, string, string];
type S = { id: string; latestPeriod: string; points: [string, number][] };
const LI: Record<Lang, number> = { es: 0, en: 1, fr: 2, it: 3 };
const CATS: [string, L4][] = [['steers', ['Añojos y novillos', 'Steers', 'Bouvillons', 'Manzi castrati']], ['heifers', ['Novillas', 'Heifers', 'Génisses', 'Manze']], ['young-bulls', ['Toros jóvenes', 'Young bulls', 'Jeunes bovins', 'Vitelloni']], ['cows', ['Vacas', 'Cows', 'Vaches', 'Vacche']], ['lambs', ['Corderos', 'Lambs', 'Agneaux', 'Agnelli']]];
const SCO: [string, L4][] = [['uk-sco-cattle-total-cattle', ['Vacuno, total', 'Cattle, total', 'Bovins, total', 'Bovini, totale']], ['uk-sco-cattle-total-female-dairy-cattle', ['Hembras de aptitud lechera', 'Female dairy cattle', 'Femelles laitières', 'Femmine da latte']],
  ['uk-sco-cattle-total-female-beef-cattle', ['Hembras de aptitud cárnica', 'Female beef cattle', 'Femelles allaitantes', 'Femmine da carne']], ['uk-sco-sheep-total-sheep', ['Ovino, total', 'Sheep, total', 'Ovins, total', 'Ovini, totale']],
  ['uk-sco-sheep-lambs', ['Corderos', 'Lambs', 'Agneaux', 'Agnelli']], ['uk-sco-pigs-total-pigs', ['Porcino, total', 'Pigs, total', 'Porcins, total', 'Suini, totale']], ['uk-sco-poultry-total-poultry', ['Aves, total', 'Poultry, total', 'Volailles, total', 'Pollame, totale']]];
const pid = (c: string, g: string) => (c === 'lambs' ? 'uk-ni-lambs-all-' + g : 'uk-ni-' + c + '-' + (g === 'r3' ? 'r3-price' : 'all-grades-' + g));
const byId = (d: any): Record<string, S> => { const o: Record<string, S> = {}; (d?.countries?.UK?.series || []).forEach((s: S) => { o[s.id] = s; }); return o; };

export default function GanadoUK() {
  const { user, t } = useApp();
  const L = user.lang, li = LI[L];
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  const { width } = useWindowDimensions();
  const [N, setN] = useState<Record<string, S> | null>(null);
  const [Sc, setSc] = useState<Record<string, S> | null>(null);
  const [done, setDone] = useState(false);
  const [cat, setCat] = useState('steers');
  useEffect(() => { Promise.all([webJson('data/uk-ni-market-stats.json', 6 * 3600e3), webJson('data/uk-scotland-stats.json', 24 * 3600e3)]).then(([a, b]) => { setN(byId(a)); setSc(byId(b)); setDone(true); }); }, []);
  const title = T('Ganadería del Reino Unido', 'UK livestock', 'Élevage au Royaume-Uni', 'Zootecnia del Regno Unito');
  const cats = N ? CATS.filter(([c]) => N[pid(c, 'price')]) : [];
  if (!cats.length && !(Sc && Object.keys(Sc).length)) return <Screen><Stack.Screen options={{ title }} /><Note>{done ? t('noDataNow') : t('loading')}</Note></Screen>;
  const ch = (a: number | null | undefined, b: number | null | undefined) => (a != null && b != null && b > 0 ? (a / b - 1) * 100 : null);
  const s0 = N?.[pid(cat, 'price')], cut = s0 ? Date.parse(s0.points[s0.points.length - 1][0]) - 3 * 365 * 864e5 : 0, pts = s0 ? s0.points.filter(p => Date.parse(p[0]) >= cut).map(p => p[1]) : [];
  const sco = Sc ? SCO.filter(([k]) => Sc[k]) : [];
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      {cats.length && N ? <>
        <SectionTitle>{T('Irlanda del Norte: mercado semanal', 'Northern Ireland: weekly market', 'Irlande du Nord : marché hebdomadaire', 'Irlanda del Nord: mercato settimanale')}</SectionTitle>
        <Note>{T('Precio medio en canal que pagan los mataderos, en peniques por kilo (100 peniques = 1 libra), y animales con precio esa semana. Fuente: DAERA.', 'Average deadweight price paid by abattoirs, in pence per kilo (100p = £1), and animals priced that week. Source: DAERA.', 'Prix moyen en carcasse payé par les abattoirs, en pence par kilo (100 p = 1 £), et animaux cotés dans la semaine. Source : DAERA.', 'Prezzo medio a carcassa pagato dai macelli, in pence al chilo (100 p = 1 £), e capi quotati nella settimana. Fonte: DAERA.')}</Note>
        <Card>
          {cats.map(([c, nm], i) => {
            const s = N[pid(c, 'price')], a = s.points[s.points.length - 1], b0 = s.points[s.points.length - 2], b = b0 && Date.parse(a[0]) - Date.parse(b0[0]) <= 10 * 864e5 ? b0 : undefined, hd = N[pid(c, 'head')], h = hd?.points[hd.points.length - 1], r3 = N[pid(c, 'r3')], r = r3?.points[r3.points.length - 1], cc = ch(a[1], b?.[1]);
            return (
              <Pressable key={c} onPress={() => setCat(c)} accessibilityRole="button" accessibilityState={{ selected: c === cat }} android_ripple={{ color: C.surfaceAlt }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: C.border, backgroundColor: c === cat ? C.surfaceAlt : undefined }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{nm[li]}</Text>
                    <Text style={{ fontSize: 12.5, color: C.textMuted }}>{fmtDate(a[0], L)}{h && h[0] === a[0] ? ' · ' + num(h[1], L, 0) + ' ' + T('animales', 'animals', 'animaux', 'capi') : ''}{r && r[0] === a[0] ? ' · R3 ' + num(r[1], L, 1) : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] }}>{num(a[1], L, 1)} p/kg</Text>
                    {cc != null ? <Text style={{ fontSize: 12.5, color: changeColor(cc), fontVariant: ['tabular-nums'] }}>{pct(cc, L)}</Text> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Card>
        {pts.length > 2 ? <Card style={{ padding: 14 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.text, marginBottom: 6 }}>{(CATS.find(x => x[0] === cat)?.[1][li] || '') + ' · ' + T('últimos 3 años, p/kg canal', 'last 3 years, p/kg deadweight', '3 dernières années, p/kg carcasse', 'ultimi 3 anni, p/kg carcassa')}</Text>
          <LineChart points={pts} width={Math.min(width - 60, 640)} height={140} label={T('Evolución semanal del precio', 'Weekly price trend', 'Évolution hebdomadaire du prix', 'Andamento settimanale del prezzo')} />
          <Text style={{ fontSize: 11.5, color: C.textMuted }}>{num(Math.min(...pts), L, 0)} – {num(Math.max(...pts), L, 0)} p/kg</Text>
        </Card> : null}
      </> : null}
      {sco.length && Sc ? <>
        <SectionTitle>{T('Escocia: cabaña ganadera', 'Scotland: livestock numbers', 'Écosse : cheptel', 'Scozia: consistenze') + ' · ' + Sc[sco[0][0]].latestPeriod}</SectionTitle>
        <Card>
          {sco.map(([k, nm], i) => { const p = Sc[k].points, a = p[p.length - 1], b = p[p.length - 2], c = ch(a[1], b?.[1]); return (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <Text style={{ flex: 1, fontSize: 14, color: C.text }}>{nm[li]}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>{num(a[1], L, 0)}{c == null ? '' : '  '}<Text style={{ fontSize: 12, color: changeColor(c) }}>{c == null ? '' : pct(c, L)}</Text></Text>
            </View>); })}
        </Card>
        <Note>{T('Animales censados en junio (censo agrario del Gobierno de Escocia); variación frente al año anterior.', 'Animals counted in June (Scottish Government agricultural census); change vs previous year.', 'Animaux recensés en juin (recensement agricole du gouvernement écossais) ; variation sur un an.', 'Capi censiti a giugno (censimento agricolo del governo scozzese); variazione sull’anno precedente.')}</Note>
      </> : null}
    </Screen>
  );
}
