// Francia: ríos que se quedan sin agua (ONDE, OFB) por departamento y mes — como #fronde de la web. Lee data/fr-onde.json (Licence Ouverte 2.0).
// Cada mes (mayo a septiembre) se visitan ~3.300 puntos de pequeños ríos y se anota si el agua corre, está parada o el cauce está seco.
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, TextInput, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle, Segmented } from '../components/ui';
import { Chips } from '../components/Chips';
import { RangeChart } from '../components/RangeChart';
import { C } from '../lib/theme';
import { num, date as fmtDate } from '../lib/format';
import { webJson } from '../lib/fv';
import { norm } from '../lib/logic';
import { tx } from '../lib/tx';

type Cnt = [number, number, number];   // corre, parada sin corriente, seca
type Doc = { asOf: string; source: { name: string; url: string; license: string }; deptNames: Record<string, string>; months: { month: string; total: Cnt; departments: Record<string, Cnt> }[] };
const sum = (v: Cnt) => v[0] + v[1] + v[2];

export default function Onde() {
  const { user, t } = useApp();
  const L = user.lang;
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  const { width } = useWindowDimensions();
  const cw = Math.min(width, 700) - 32 - 28;
  const [d, setD] = useState<Doc | null>(null);
  const [done, setDone] = useState(false);
  const [mk, setMk] = useState<string | null>(null);
  const [dept, setDept] = useState<string>('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'dry' | 'all'>('dry');
  useEffect(() => { webJson('data/fr-onde.json', 12 * 3600e3).then(x => { setD(x); setDone(true); }); }, []);
  const big = useMemo(() => (d ? d.months.filter(m => sum(m.total) >= 1000) : []), [d]);
  const main = d ? d.months.find(m => m.month === mk) ?? [...d.months].reverse().find(m => sum(m.total) >= 1500) ?? d.months[d.months.length - 1] : null;
  const p1 = (v: number) => num(v, L, 1) + ' %';
  if (!d || !main) return <Screen><Stack.Screen options={{ title: 'ONDE' }} /><Note>{done ? t('noDataNow') : t('loading')}</Note></Screen>;
  const tot = main.total, n = sum(tot), mm = main.month.slice(5), yr = +main.month.slice(0, 4);
  const prev = big.filter(m => m.month.slice(5) === mm && +m.month.slice(0, 4) < yr);
  const avg = prev.length ? prev.reduce((a, m) => a + 100 * m.total[2] / sum(m.total), 0) / prev.length : null;
  const rank = Object.keys(main.departments).map(id => ({ id, v: main.departments[id] })).filter(x => sum(x.v) >= 5)
    .map(x => ({ id: x.id, name: d.deptNames[x.id] ?? x.id, share: 100 * (kind === 'dry' ? x.v[2] : x.v[1] + x.v[2]) / sum(x.v), n: sum(x.v) })).sort((a, b) => b.share - a.share);
  const k = norm(q.trim());
  const found = k ? Object.keys(d.deptNames).filter(id => norm(d.deptNames[id]).includes(k) || id === k).slice(0, 6) : [];
  const series = (id: string, dry: boolean): [string, number][] => d.months.map(m => { const v = id ? m.departments[id] : m.total; if (!v || sum(v) < (id ? 5 : 1000)) return null; return [m.month + '-01', 100 * (dry ? v[2] : v[1] + v[2]) / sum(v)] as [string, number]; }).filter((x): x is [string, number] => !!x);
  const hist = series(dept, kind === 'dry');
  const title = T('Ríos sin agua en Francia', 'Rivers running dry in France', 'Cours d’eau à sec en France', 'Fiumi senza acqua in Francia');
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">💧 {title}</Text>
      <Note>{T('Cada mes, de mayo a septiembre, el Observatoire national des étiages (OFB) visita unos 3.300 puntos de pequeños ríos y anota si el agua corre, si hay agua pero no corre o si el cauce está seco. Es la señal más directa de sequía en los ríos franceses.', 'Every month from May to September France’s National Low-Flow Observatory (OFB) visits about 3,300 points on small rivers and records whether water is flowing, standing without flow, or the bed is dry. It is the most direct sign of drought in French rivers.', 'Chaque mois, de mai à septembre, l’Observatoire national des étiages (OFB) visite environ 3 300 points sur de petits cours d’eau et note si l’eau s’écoule, stagne ou si le lit est à sec. C’est le signe le plus direct de sécheresse sur les cours d’eau français.', 'Ogni mese, da maggio a settembre, l’Osservatorio nazionale delle magre (OFB) visita circa 3.300 punti su piccoli corsi d’acqua e annota se l’acqua scorre, ristagna o l’alveo è asciutto. È il segnale più diretto di siccità sui fiumi francesi.')}</Note>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Mes', 'Month', 'Mois', 'Mese')}</Text>
      <Chips items={[...big].reverse().map(m => ({ value: m.month, label: fmtDate(m.month, L) }))} value={main.month} onChange={setMk} />
      <Card>
        <Row first title={T('Puntos visitados', 'Points visited', 'Points visités', 'Punti visitati')} right={num(n, L, 0)} />
        <Row title={T('Cauce seco', 'Dry bed', 'Lit à sec', 'Alveo asciutto')} sub={num(tot[2], L, 0) + ' ' + T('puntos', 'points', 'points', 'punti')} right={p1(100 * tot[2] / n)} rightColor={C.negative} />
        <Row title={T('Agua parada, sin corriente', 'Standing water, no flow', 'Eau stagnante, sans écoulement', 'Acqua ferma, senza corrente')} sub={num(tot[1], L, 0) + ' ' + T('puntos', 'points', 'points', 'punti')} right={p1(100 * tot[1] / n)} />
        {avg != null ? <Row title={T('Media del mismo mes', 'Same-month average', 'Moyenne du même mois', 'Media dello stesso mese') + ' ' + prev[0].month.slice(0, 4) + '–' + prev[prev.length - 1].month.slice(0, 4)} sub={T('cauce seco', 'dry bed', 'lit à sec', 'alveo asciutto')} right={p1(avg)} /> : null}
      </Card>
      <SectionTitle>{T('Departamentos', 'Departments', 'Départements', 'Dipartimenti')}</SectionTitle>
      <Segmented value={kind} onChange={setKind} options={[{ value: 'dry', label: T('Cauce seco', 'Dry bed', 'Lit à sec', 'Alveo asciutto') }, { value: 'all', label: T('Seco o sin corriente', 'Dry or no flow', 'Sec ou sans écoulement', 'Asciutto o senza corrente') }]} />
      <Card>{rank.slice(0, 12).map((x, i) => <Row key={x.id} first={i === 0} title={x.name} sub={num(x.n, L, 0) + ' ' + T('puntos', 'points', 'points', 'punti')} right={p1(x.share)} onPress={() => setDept(x.id)} />)}</Card>
      <Text style={{ fontSize: 12.5, color: C.textMuted }}>{T('Los 12 departamentos con más porcentaje en ' + fmtDate(main.month, L) + '. Toca uno para ver su histórico; solo se cuentan departamentos con 5 o más puntos visitados.', 'The 12 departments with the highest share in ' + fmtDate(main.month, L) + '. Tap one for its history; only departments with 5 or more points visited are counted.', 'Les 12 départements avec la plus forte part en ' + fmtDate(main.month, L) + '. Touchez-en un pour son historique ; seuls les départements avec 5 points visités ou plus sont comptés.', 'I 12 dipartimenti con la quota più alta a ' + fmtDate(main.month, L) + '. Tocca per lo storico; si contano solo i dipartimenti con 5 o più punti visitati.')}</Text>
      <SectionTitle>{(dept ? d.deptNames[dept] ?? dept : T('Toda Francia', 'All of France', 'Toute la France', 'Tutta la Francia')) + ' · ' + T('histórico', 'history', 'historique', 'storico')}</SectionTitle>
      <TextInput value={q} onChangeText={setQ} placeholder={T('Buscar departamento', 'Search department', 'Rechercher un département', 'Cerca dipartimento')} placeholderTextColor={C.textMuted} autoCorrect={false} clearButtonMode="while-editing"
        style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: C.text }} />
      {found.length ? <Card>{found.map((id, i) => <Row key={id} first={i === 0} title={d.deptNames[id]} sub={id} onPress={() => { setDept(id); setQ(''); }} />)}</Card> : null}
      {dept ? <Pressable onPress={() => setDept('')} accessibilityRole="button"><Text style={{ color: C.accent, fontWeight: '600' }}>‹ {T('Toda Francia', 'All of France', 'Toute la France', 'Tutta la Francia')}</Text></Pressable> : null}
      {hist.length > 2 ? <RangeChart key={dept + kind} points={hist} unit="%" label={kind === 'dry' ? T('Cauce seco', 'Dry bed', 'Lit à sec', 'Alveo asciutto') : T('Seco o sin corriente', 'Dry or no flow', 'Sec ou sans écoulement', 'Asciutto o senza corrente')} width={cw} />
        : <Note>{T('Sin histórico suficiente.', 'Not enough history.', 'Historique insuffisant.', 'Storico insufficiente.')}</Note>}
      <Pressable onPress={() => Linking.openURL(d.source.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{T('Fuente: ', 'Source: ', 'Source : ', 'Fonte: ') + d.source.name + ' · ' + d.source.license}</Text></Pressable>
    </Screen>
  );
}
