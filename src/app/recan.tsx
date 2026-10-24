// Costes y rentas de las explotaciones españolas (como la sección RECAN de la web; data/recan.json, MAPA, CC BY 4.0).
// Cada cifra es la que publica el MAPA para una comunidad autónoma, un tipo de explotación y una dimensión económica: no se promedia nada.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle } from '../components/ui';
import { Chips } from '../components/Chips';
import { RangeChart } from '../components/RangeChart';
import { C } from '../lib/theme';
import { num } from '../lib/format';
import { webJson } from '../lib/fv';
import { RT } from '../lib/recanText';
import { tx, fill } from '../lib/tx';
import { openSafe } from '../lib/openLink';

type Doc = { years: number[]; ccaa: string[]; types: [string, string][]; dims: string[]; vars: [string, string, string][]; rows: [number, number, number, number, number | null, number | null, (number | null)[]][]; source: { url: string } };
const KEY = ['SE025', 'SE010', 'SE131', 'SE270', 'SE605', 'SE410', 'SE420', 'SE425'];

export default function Recan() {
  const { user, t } = useApp();
  const L = user.lang, li = L === 'en' ? 0 : L === 'fr' ? 1 : L === 'it' ? 2 : -1;
  const tr = (s: string) => (li < 0 ? s : RT[s]?.[li as 0 | 1 | 2] ?? s);
  const { width } = useWindowDimensions();
  const [d, setD] = useState<Doc | null | undefined>(undefined);
  const [y, setY] = useState(-1), [c, setC] = useState(-1), [ty, setTy] = useState(-1), [dm, setDm] = useState(-1), [grp, setGrp] = useState('');
  useEffect(() => { webJson('data/recan.json', 24 * 3600e3).then((x: any) => setD(x ?? null)); }, []);
  // combinaciones que existen: se arranca en el último año, la comunidad y el tipo con más explotaciones
  const init = useMemo(() => {
    if (!d) return null;
    const yi = d.years.length - 1, rs = d.rows.filter(r => r[0] === yi);
    const best = rs.slice().sort((a, b) => (b[5] ?? 0) - (a[5] ?? 0))[0];
    return best ? { y: yi, c: best[1], t: best[2], d: best[3] } : null;
  }, [d]);
  if (d === undefined) return <Screen><Stack.Screen options={{ title: 'RECAN' }} /><Note>{t('loading')}</Note></Screen>;
  if (!d || !init) return <Screen><Stack.Screen options={{ title: 'RECAN' }} /><Note>{t('noDataNow')}</Note></Screen>;
  const Y = y < 0 ? init.y : y, CC = c < 0 ? init.c : c, TY = ty < 0 ? init.t : ty;
  const avail = d.rows.filter(r => r[0] === Y && r[1] === CC);
  const types = Array.from(new Set(avail.map(r => r[2]))).sort((a, b) => tr(d.types[a][1]).localeCompare(tr(d.types[b][1]), L));
  const T2 = types.includes(TY) ? TY : types[0];
  const dims = avail.filter(r => r[2] === T2).map(r => r[3]).sort((a, b) => a - b);
  const DM = dm >= 0 && dims.includes(dm) ? dm : dims[Math.floor((dims.length - 1) / 2)];
  const row = avail.find(r => r[2] === T2 && r[3] === DM);
  const vi = (code: string) => d.vars.findIndex(v => v[0] === code);
  const unit = (u: string) => u.replace('/expl.', '').replace('€/ha', '€/ha');
  const evo = (code: string) => d.rows.filter(r => r[1] === CC && r[2] === T2 && r[3] === DM && r[6][vi(code)] != null).sort((a, b) => a[0] - b[0]).map(r => [String(d.years[r[0]]), r[6][vi(code)] as number] as [string, number]);
  const rank = d.rows.filter(r => r[0] === Y && r[2] === T2 && r[3] === DM && r[6][vi('SE420')] != null).sort((a, b) => (b[6][vi('SE420')] ?? 0) - (a[6][vi('SE420')] ?? 0));
  const mx = Math.max(1, ...rank.map(r => Math.abs(r[6][vi('SE420')] ?? 0)));
  const cw = Math.min(width, 700) - 32 - 28;
  const ccaaSorted = d.ccaa.map((n, i) => i).filter(i => d.rows.some(r => r[0] === Y && r[1] === i)).sort((a, b) => d.ccaa[a].localeCompare(d.ccaa[b], 'es'));
  return (
    <Screen>
      <Stack.Screen options={{ title: tx(L, { es: 'Costes y rentas', en: 'Farm costs and income', fr: 'Coûts et revenus', it: 'Costi e redditi' }) }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">💶 {tx(L, { es: 'Costes y rentas de las explotaciones (España)', en: 'Farm costs and income (Spain)', fr: 'Coûts et revenus des exploitations (Espagne)', it: 'Costi e redditi delle aziende (Spagna)' })}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{tx(L, { es: 'Lo que produce, gasta y gana una explotación media según la Red Contable Agraria Nacional del MAPA, por comunidad, tipo y tamaño económico.', en: 'What an average farm produces, spends and earns, from the Spanish farm accountancy network (RECAN), by region, type and economic size.', fr: 'Ce que produit, dépense et gagne une exploitation moyenne selon le réseau comptable agricole espagnol (RECAN), par région, type et dimension économique.', it: 'Quanto produce, spende e guadagna un’azienda media secondo la rete contabile agricola spagnola (RECAN), per regione, tipo e dimensione economica.' })}</Text>
      <Chips items={d.years.map((yy, i) => ({ value: String(i), label: String(yy) })).reverse()} value={String(Y)} onChange={v => setY(+v)} />
      <Chips items={ccaaSorted.map(i => ({ value: String(i), label: d.ccaa[i] }))} value={String(CC)} onChange={v => setC(+v)} />
      {types.length ? <Chips items={types.map(i => ({ value: String(i), label: tr(d.types[i][1]) }))} value={String(T2)} onChange={v => setTy(+v)} /> : null}
      {dims.length > 1 ? <Chips items={dims.map(i => ({ value: String(i), label: tr(d.dims[i]) }))} value={String(DM)} onChange={v => setDm(+v)} /> : null}
      {!row ? <Note>{tx(L, { es: 'No hay datos para esta combinación.', en: 'No data for this combination.', fr: 'Pas de données pour cette combinaison.', it: 'Nessun dato per questa combinazione.' })}</Note> : <>
        <SectionTitle>{tr(d.types[T2][1]) + ' · ' + d.ccaa[CC] + ' · ' + d.years[Y]}</SectionTitle>
        <Text style={{ fontSize: 12.5, color: C.textMuted }}>{fill(tx(L, { es: 'Dimensión: {0} · {1} explotaciones en la muestra', en: 'Size: {0} · {1} farms in the sample', fr: 'Dimension : {0} · {1} exploitations dans l’échantillon', it: 'Dimensione: {0} · {1} aziende nel campione' }), tr(d.dims[DM]), row[4] != null ? num(row[4], L, 0) : '–')}</Text>
        <Card>{KEY.map(k => vi(k)).filter(i => i >= 0 && row[6][i] != null).map((i, k) => <Row key={i} first={k === 0} title={tr(d.vars[i][1])} right={num(row[6][i] as number, L, (row[6][i] as number) < 100 ? 2 : 0) + ' ' + unit(d.vars[i][2])} />)}</Card>
        {evo('SE420').length > 1 ? <RangeChart key={[CC, T2, DM].join('-')} points={evo('SE420')} unit="€" label={tr('Renta Neta de explotación')} width={cw} /> : null}
        {rank.length > 1 ? <>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{tx(L, { es: 'Renta neta por comunidad (mismo tipo y tamaño)', en: 'Net income by region (same type and size)', fr: 'Revenu net par région (même type et taille)', it: 'Reddito netto per regione (stesso tipo e dimensione)' })}</Text>
          <Card>{rank.map((r, k) => { const v = r[6][vi('SE420')] as number; return (
            <View key={r[1]} style={{ paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 14, color: C.text, fontWeight: r[1] === CC ? '700' : '400' }}>{d.ccaa[r[1]]}</Text><Text style={{ fontSize: 14, fontWeight: '600', color: v < 0 ? C.negative : C.text, fontVariant: ['tabular-nums'] }}>{num(v, L, 0)} €</Text></View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: C.surfaceAlt, marginTop: 5 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: v < 0 ? C.negative : C.accent, opacity: r[1] === CC ? 1 : 0.6, width: `${Math.max(2, Math.abs(v) / mx * 100)}%` }} /></View>
            </View>); })}</Card>
        </> : null}
      </>}
      <Pressable onPress={() => openSafe(d.source.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{tx(L, { es: 'Fuente: MAPA, RECAN (CC BY 4.0)', en: 'Source: MAPA, RECAN (CC BY 4.0)', fr: 'Source : MAPA, RECAN (CC BY 4.0)', it: 'Fonte: MAPA, RECAN (CC BY 4.0)' })}</Text></Pressable>
    </Screen>
  );
}
