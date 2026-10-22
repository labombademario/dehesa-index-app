// Lluvia y temperatura del Reino Unido (22-oct-2026), como la zona «Reino Unido» de sequia.html: lluvia sobre lo normal (media 1991-2020)
// del último mes y de los últimos 3, 6 y 12 meses por nación y región, y temperatura del mes. Lee data/uk-climate.json (Met Office, HadUK-Grid, OGL v3.0).
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note, SectionTitle } from '../components/ui';
import { C } from '../lib/theme';
import { num } from '../lib/format';
import { tx } from '../lib/tx';
import { webJson } from '../lib/fv';

const RN: Record<string, [string, string, string, string]> = { UK: ['Reino Unido', 'United Kingdom', 'Royaume-Uni', 'Regno Unito'], ENG: ['Inglaterra', 'England', 'Angleterre', 'Inghilterra'], WAL: ['Gales', 'Wales', 'Pays de Galles', 'Galles'], SCO: ['Escocia', 'Scotland', 'Écosse', 'Scozia'], NIR: ['Irlanda del Norte', 'Northern Ireland', 'Irlande du Nord', 'Irlanda del Nord'],
  ENG_N: ['Norte de Inglaterra', 'England N', 'Nord de l’Angleterre', 'Inghilterra N'], ENG_S: ['Sur de Inglaterra', 'England S', 'Sud de l’Angleterre', 'Inghilterra S'], ENG_ENE: ['Inglaterra E y NE', 'England E & NE', 'Angleterre E et NE', 'Inghilterra E e NE'], ENG_NW: ['Inglaterra NO y norte de Gales', 'England NW & N Wales', 'Angleterre NO et nord du pays de Galles', 'Inghilterra NO e Galles N'],
  ENG_SW: ['Inglaterra SO y sur de Gales', 'England SW & S Wales', 'Angleterre SO et sud du pays de Galles', 'Inghilterra SO e Galles S'], ENG_SE: ['Inglaterra SE y centro-sur', 'England SE & central S', 'Angleterre SE et centre-sud', 'Inghilterra SE e centro-sud'], MID: ['Midlands', 'Midlands', 'Midlands', 'Midlands'], EAN: ['East Anglia', 'East Anglia', 'East Anglia', 'East Anglia'],
  SCO_N: ['Norte de Escocia', 'Scotland N', 'Nord de l’Écosse', 'Scozia N'], SCO_E: ['Este de Escocia', 'Scotland E', 'Est de l’Écosse', 'Scozia E'], SCO_W: ['Oeste de Escocia', 'Scotland W', 'Ouest de l’Écosse', 'Scozia O'] };
const LI = { es: 0, en: 1, fr: 2, it: 3 } as const;
type Reg = { rain: [string, number][]; rainNormal: (number | null)[]; tmean?: [string, number][]; tmeanNormal?: (number | null)[] };
function pctN(r: Reg, n: number): number | null {
  if (!r.rain || r.rain.length < n) return null; let s = 0, sn = 0;
  for (let i = r.rain.length - n; i < r.rain.length; i++) { const nm = r.rainNormal[+r.rain[i][0].slice(5, 7) - 1]; if (nm == null) return null; s += r.rain[i][1]; sn += nm; }
  return sn ? (s / sn) * 100 : null;
}
const tone = (p: number | null) => (p == null ? C.text : p < 70 ? '#B3261E' : p < 90 ? '#B8863A' : p > 130 ? '#1D5178' : C.text);

export default function LluviaUK() {
  const { user, t } = useApp();
  const L = user.lang;
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  const [D, setD] = useState<{ regions: Record<string, Reg>; source?: { updated?: string } } | null>(null);
  const [done, setDone] = useState(false);
  const [sel, setSel] = useState('UK');
  useEffect(() => { webJson('data/uk-climate.json', 12 * 3600e3).then(d => { setD(d); setDone(true); }); }, []);
  const title = T('Lluvia en el Reino Unido', 'UK rainfall', 'Pluie au Royaume-Uni', 'Pioggia nel Regno Unito');
  if (!D?.regions?.UK) return <Screen><Stack.Screen options={{ title }} /><Note>{done ? t('noDataNow') : t('loading')}</Note></Screen>;
  const r = D.regions[sel] ?? D.regions.UK, last = r.rain[r.rain.length - 1];
  const tm = r.tmean?.[r.tmean.length - 1], tn = tm && r.tmeanNormal ? r.tmeanNormal[+tm[0].slice(5, 7) - 1] : null;
  const name = (k: string) => (RN[k] ? RN[k][LI[L]] : k);
  const kp = (lab: string, val: string, sub: string, color?: string) => (
    <View style={{ minWidth: 130, flexGrow: 1, flexBasis: '42%' }} accessible accessibilityLabel={`${lab}: ${val} ${sub}`}>
      <Text style={{ fontSize: 12, color: C.textMuted }}>{lab}</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: color ?? C.text, fontVariant: ['tabular-nums'] }}>{val}</Text>
      <Text style={{ fontSize: 12, color: C.textMuted }}>{sub}</Text>
    </View>
  );
  const ofn = T('de lo normal', 'of normal', 'de la normale', 'della norma');
  const p1 = pctN(r, 1), p3 = pctN(r, 3), p6 = pctN(r, 6), p12 = pctN(r, 12);
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Note>{T('Cuánto ha llovido frente a lo normal (media 1991-2020) en cada nación y región. Varios meses seguidos por debajo del 70 % son señal de sequía.', 'How much it has rained compared with normal (1991-2020 average) in each nation and region. Several months in a row below 70% signal drought.', 'Pluie par rapport à la normale (moyenne 1991-2020) dans chaque nation et région. Plusieurs mois de suite sous 70 % signalent une sécheresse.', 'Pioggia rispetto alla norma (media 1991-2020) in ogni nazione e regione. Diversi mesi di fila sotto il 70% segnalano siccità.')}</Note>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Object.keys(D.regions).map(k => (
          <Pressable key={k} onPress={() => setSel(k)} accessibilityRole="button" accessibilityState={{ selected: k === sel }}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: k === sel ? C.accent : C.surfaceAlt }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: k === sel ? C.accentInk : C.text }}>{name(k)}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle>{name(sel)}</SectionTitle>
      <Card style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 18 }}>
        {kp(T('Lluvia de ', 'Rainfall in ', 'Pluie de ', 'Pioggia di ') + last[0], num(last[1], L, 1) + ' mm', p1 == null ? '' : num(p1, L, 0) + ' % ' + ofn, tone(p1))}
        {kp(T('Últimos 3 meses', 'Last 3 months', '3 derniers mois', 'Ultimi 3 mesi'), p3 == null ? '—' : num(p3, L, 0) + ' %', ofn, tone(p3))}
        {kp(T('Últimos 6 meses', 'Last 6 months', '6 derniers mois', 'Ultimi 6 mesi'), p6 == null ? '—' : num(p6, L, 0) + ' %', ofn, tone(p6))}
        {kp(T('Últimos 12 meses', 'Last 12 months', '12 derniers mois', 'Ultimi 12 mesi'), p12 == null ? '—' : num(p12, L, 0) + ' %', ofn, tone(p12))}
        {tm ? kp(T('Temperatura media ', 'Mean temperature ', 'Température moyenne ', 'Temperatura media ') + tm[0], num(tm[1], L, 1) + ' °C', tn == null ? '' : (tm[1] - tn >= 0 ? '+' : '−') + num(Math.abs(tm[1] - tn), L, 1) + ' °C ' + T('frente a lo normal', 'vs. normal', 'par rapport à la normale', 'rispetto alla norma')) : null}
      </Card>
      <SectionTitle>{T('Últimos 3 meses por zona', 'Last 3 months by area', '3 derniers mois par zone', 'Ultimi 3 mesi per zona')}</SectionTitle>
      <Card>
        {Object.keys(D.regions).map((k, i) => { const p = pctN(D.regions[k], 3); return (
          <Pressable key={k} onPress={() => setSel(k)} accessibilityRole="button" style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
            <Text style={{ fontSize: 15, color: C.text, fontWeight: k === sel ? '700' : '400' }}>{name(k)}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: tone(p), fontVariant: ['tabular-nums'] }}>{p == null ? '—' : num(p, L, 0) + ' %'}</Text>
          </Pressable>); })}
      </Card>
      <Note>{T('Porcentajes calculados por Dehesa Index sobre la media 1991-2020 de cada mes; no es un índice oficial de sequía. Fuente: Met Office, HadUK-Grid (OGL v3.0).', 'Percentages calculated by Dehesa Index against each month’s 1991-2020 average; not an official drought index. Source: Met Office, HadUK-Grid (OGL v3.0).', 'Pourcentages calculés par Dehesa Index par rapport à la moyenne 1991-2020 de chaque mois ; ce n’est pas un indice officiel de sécheresse. Source : Met Office, HadUK-Grid (OGL v3.0).', 'Percentuali calcolate da Dehesa Index rispetto alla media 1991-2020 di ogni mese; non è un indice ufficiale di siccità. Fonte: Met Office, HadUK-Grid (OGL v3.0).')}{D.source?.updated ? ' · ' + D.source.updated : ''}</Note>
    </Screen>
  );
}
