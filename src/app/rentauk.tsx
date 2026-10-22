// Renta agraria por región de Inglaterra (22-oct-2026), como el bloque «Renta agraria de la región» de region.html: la cuenta de Defra (Total income from
// farming for the regions of England) de cada región ITL1, de dónde sale la producción y el reparto por territorio (ITL3). Lee data/uk-tiff-regions.json (OGL v3.0).
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note, SectionTitle, LineChart } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { num, pct } from '../lib/format';
import { tx } from '../lib/tx';
import { webJson } from '../lib/fv';
import type { Lang } from '../lib/types';

type L4 = [string, string, string, string];
const LI: Record<Lang, number> = { es: 0, en: 1, fr: 2, it: 3 };
const REG: [string, L4][] = [['TLK', ['Suroeste', 'South West', 'Sud-Ouest', 'Sud-Ovest']], ['TLF', ['Midlands del Este', 'East Midlands', 'Midlands de l’Est', 'Midlands orientali']], ['TLH', ['Este de Inglaterra', 'East of England', 'Est de l’Angleterre', 'Inghilterra orientale']],
  ['TLG', ['Midlands del Oeste', 'West Midlands', 'Midlands de l’Ouest', 'Midlands occidentali']], ['TLIJ', ['Londres y Sudeste', 'London and South East', 'Londres et Sud-Est', 'Londra e Sud-Est']], ['TLD', ['Noroeste', 'North West', 'Nord-Ouest', 'Nord-Ovest']],
  ['TLE', ['Yorkshire y Humber', 'Yorkshire and the Humber', 'Yorkshire-et-Humber', 'Yorkshire e Humber']], ['TLC', ['Noreste', 'North East', 'Nord-Est', 'Nord-Est']]];
const ACC: [number, L4][] = [[12, ['Producción', 'Output', 'Production', 'Produzione']], [25, ['Consumos (semilla, energía, abono, pienso…)', 'Inputs (seed, energy, fertiliser, feed…)', 'Consommations (semences, énergie, engrais, aliments…)', 'Consumi (sementi, energia, concimi, mangimi…)']],
  [27, ['Valor añadido bruto', 'Gross value added', 'Valeur ajoutée brute', 'Valore aggiunto lordo']], [28, ['Amortizaciones', 'Depreciation', 'Amortissements', 'Ammortamenti']], [31, ['Ayudas', 'Subsidies', 'Aides', 'Aiuti']],
  [33, ['Salarios', 'Wages', 'Salaires', 'Salari']], [34, ['Arrendamientos', 'Rent', 'Fermages', 'Affitti']], [35, ['Intereses', 'Interest', 'Intérêts', 'Interessi']]];
const PROD: Record<number, L4> = { 1: ['Cereales', 'Cereals', 'Céréales', 'Cereali'], 2: ['Cultivos industriales', 'Industrial crops', 'Cultures industrielles', 'Colture industriali'], 3: ['Forrajes', 'Forage', 'Fourrages', 'Foraggi'], 4: ['Hortalizas y horticultura', 'Vegetables and horticulture', 'Légumes et horticulture', 'Ortaggi e orticoltura'],
  5: ['Patata', 'Potatoes', 'Pommes de terre', 'Patate'], 6: ['Fruta', 'Fruit', 'Fruits', 'Frutta'], 7: ['Otros cultivos', 'Other crops', 'Autres cultures', 'Altre colture'], 8: ['Ganado (carne)', 'Livestock (meat)', 'Bétail (viande)', 'Bestiame (carne)'],
  9: ['Leche, huevos y otros', 'Milk, eggs and other', 'Lait, œufs et autres', 'Latte, uova e altro'], 10: ['Otras actividades agrarias', 'Other farm activities', 'Autres activités agricoles', 'Altre attività agricole'], 11: ['Diversificación', 'Diversification', 'Diversification', 'Diversificazione'] };

export default function RentaUK() {
  const { user, t } = useApp();
  const L = user.lang, li = LI[L];
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  const { width } = useWindowDimensions();
  const [D, setD] = useState<any>(null);
  const [done, setDone] = useState(false);
  const [r, setR] = useState('TLK');
  useEffect(() => { webJson('data/uk-tiff-regions.json', 24 * 3600e3).then(d => { setD(d); setDone(true); }); }, []);
  const title = T('Renta agraria de Inglaterra', 'England farm income', 'Revenu agricole de l’Angleterre', 'Reddito agricolo dell’Inghilterra');
  if (!D?.itl1) return <Screen><Stack.Screen options={{ title }} /><Note>{done ? t('noDataNow') : t('loading')}</Note></Screen>;
  const Y: string[] = D.years, n = Y.length, R = D.itl1[r];
  const byNo = (no: number): (number | null)[] | null => { if (!R) return null; const k = Object.keys(R.items).find(x => x.startsWith(no + ' ')); return k ? R.items[k] : null; };
  const m = (v: number | null | undefined) => (v == null ? '—' : (v < 0 ? '−' : '') + '£' + num(Math.abs(v), L, Math.abs(v) >= 100 ? 0 : 1) + (L === 'en' ? 'm' : ' M'));
  const ch = (a: number | null | undefined, b: number | null | undefined) => (a != null && b != null && b > 0 ? (a / b - 1) * 100 : null);
  const tf = byNo(36), ha = R?.perHa?.['Total income from farming'], tot = byNo(12);
  const prods = Array.from({ length: 11 }, (_, i) => i + 1).map(i => ({ i, v: byNo(i)?.[n - 1] ?? null })).filter(x => x.v != null && x.v > 0).sort((a, b) => b.v! - a.v!);
  const pre = r === 'TLIJ' ? ['TLI', 'TLJ'] : [r];
  const terr = Object.keys(D.itl3 || {}).map(k => D.itl3[k]).filter((a: any) => pre.includes(a.r) && a.items['Total income from farming']?.[n - 1] != null)
    .map((a: any) => ({ n: a.n as string, v: a.items['Total income from farming'][n - 1] as number, p: a.items['Total income from farming'][n - 2] as number | null })).sort((a: any, b: any) => b.v - a.v);
  const series = (tf || []).filter((v): v is number => v != null);
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Note>{T('Cuenta agraria de cada región de Inglaterra según Defra: lo que vale lo producido, lo que cuesta producirlo y lo que queda como renta de los agricultores. Millones de libras, precios corrientes.', 'Defra’s agricultural account for each region of England: what output is worth, what it costs and what is left as farmers’ income. £ million, current prices.', 'Compte agricole de chaque région d’Angleterre selon Defra : valeur de la production, coûts et revenu des agriculteurs. Millions de livres, prix courants.', 'Conto agricolo di ogni regione dell’Inghilterra secondo Defra: valore della produzione, costi e reddito degli agricoltori. Milioni di sterline, prezzi correnti.')}</Note>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REG.filter(x => D.itl1[x[0]]).map(([k, nm]) => (
          <Pressable key={k} onPress={() => setR(k)} accessibilityRole="button" accessibilityState={{ selected: k === r }} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: k === r ? C.accent : C.surfaceAlt }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: k === r ? C.accentInk : C.text }}>{nm[li]}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle>{T('Renta agraria', 'Farm income', 'Revenu agricole', 'Reddito agricolo') + ' · ' + Y[n - 1]}</SectionTitle>
      <Card style={{ padding: 14, gap: 4 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] }}>{m(tf?.[n - 1])}</Text>
        <Text style={{ fontSize: 13, color: changeColor(ch(tf?.[n - 1], tf?.[n - 2])) }}>{ch(tf?.[n - 1], tf?.[n - 2]) == null ? '' : pct(ch(tf?.[n - 1], tf?.[n - 2]), L) + ' ' + T('frente a', 'vs', 'vs', 'vs') + ' ' + Y[n - 2]}</Text>
        {ha?.[n - 1] != null ? <Text style={{ fontSize: 13, color: C.textMuted }}>£{num(ha[n - 1], L, 0)} {T('por hectárea', 'per hectare', 'par hectare', 'per ettaro')}</Text> : null}
        {series.length > 2 ? <View style={{ marginTop: 8 }}><LineChart points={series} width={Math.min(width - 60, 640)} height={120} label={T('Renta agraria', 'Farm income', 'Revenu agricole', 'Reddito agricolo') + ' ' + Y[0] + '–' + Y[n - 1]} /><Text style={{ fontSize: 11.5, color: C.textMuted }}>{Y[0]} – {Y[n - 1]}</Text></View> : null}
      </Card>
      <SectionTitle>{T('De la producción a la renta', 'From output to income', 'De la production au revenu', 'Dalla produzione al reddito')}</SectionTitle>
      <Card>
        {ACC.map(([no, nm], i) => { const v = byNo(no); if (!v || v[n - 1] == null || (!v[n - 1] && !v[n - 2])) return null; const c = ch(v[n - 1], v[n - 2]); return (
          <View key={no} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
            <Text style={{ flex: 1, fontSize: 14, color: C.text }}>{nm[li]}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>{m(v[n - 1])}{c == null ? '' : '  '}<Text style={{ fontSize: 12, color: changeColor(c) }}>{c == null ? '' : pct(c, L)}</Text></Text>
          </View>); })}
      </Card>
      <SectionTitle>{T('De dónde sale la producción', 'Where output comes from', 'D’où vient la production', 'Da dove viene la produzione')}</SectionTitle>
      <Card style={{ padding: 14, gap: 8 }}>
        {prods.map(x => (
          <View key={x.i} style={{ gap: 3 }} accessible accessibilityLabel={`${PROD[x.i][li]}: ${m(x.v)}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13.5, color: C.text }}>{PROD[x.i][li]}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>{m(x.v)}{tot?.[n - 1] ? ' · ' + num((x.v! / tot[n - 1]!) * 100, L, 1) + ' %' : ''}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.surfaceAlt, overflow: 'hidden' }}><View style={{ width: `${(x.v! / prods[0].v!) * 100}%`, height: 8, backgroundColor: C.accent }} /></View>
          </View>
        ))}
      </Card>
      {terr.length ? <>
        <SectionTitle>{T('Por territorio', 'By area', 'Par territoire', 'Per territorio')}</SectionTitle>
        <Card>
          {terr.map((a: any, i: number) => { const c = ch(a.v, a.p); return (
            <View key={a.n} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <Text style={{ flex: 1, fontSize: 14, color: C.text }}>{a.n}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>{m(a.v)}{c == null ? '' : '  '}<Text style={{ fontSize: 12, color: changeColor(c) }}>{c == null ? '' : pct(c, L)}</Text></Text>
            </View>); })}
        </Card>
      </> : null}
      <Note>{(r === 'TLIJ' ? T('Defra publica Londres y el Sudeste como una sola región. ', 'Defra publishes London and the South East as one region. ', 'Defra publie Londres et le Sud-Est comme une seule région. ', 'Defra pubblica Londra e il Sud-Est come un’unica regione. ') : '') + T('La renta agraria (Total Income from Farming) es lo que queda a agricultores y socios tras pagar consumos, amortizaciones, salarios, arrendamientos e intereses, ayudas incluidas. Solo Inglaterra. Fuente: Defra (OGL v3.0).', 'Total Income from Farming is what is left to farmers and partners after inputs, depreciation, wages, rent and interest, including subsidies. England only. Source: Defra (OGL v3.0).', 'Le revenu agricole (Total Income from Farming) est ce qui reste aux agriculteurs après consommations, amortissements, salaires, fermages et intérêts, aides comprises. Angleterre uniquement. Source : Defra (OGL v3.0).', 'Il reddito agricolo (Total Income from Farming) è ciò che resta agli agricoltori dopo consumi, ammortamenti, salari, affitti e interessi, aiuti compresi. Solo Inghilterra. Fonte: Defra (OGL v3.0).')}</Note>
    </Screen>
  );
}
