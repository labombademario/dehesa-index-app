// Vino a granel (como la pestaña Vino de precios.html): precio medio semanal en España (MAPA) y mensual en Francia por tipo (FranceAgriMer),
// en EUR por hectolitro, tinto y blanco. Las variaciones las calcula Dehesa Index con esos precios.
import React, { useEffect, useState } from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, Segmented, SectionTitle } from '../components/ui';
import { Chips } from '../components/Chips';
import { RangeChart } from '../components/RangeChart';
import { C } from '../lib/theme';
import { num, date as fmtDate, pct } from '../lib/format';
import { webJson, countryName } from '../lib/fv';
import { tx, flag } from '../lib/tx';

type Pts = [string, number][];
type Doc = { es?: { weeks: { from: string; to: string; week: string; white: number | null; red: number | null }[] }; fr?: { series: Record<string, Pts> } };
const COL = { red: { es: 'Tinto', en: 'Red', fr: 'Rouge', it: 'Rosso' }, white: { es: 'Blanco', en: 'White', fr: 'Blanc', it: 'Bianco' } };
const FRT = { vsig_var: { es: 'Sin DOP/IGP, con variedad', en: 'No PDO/PGI, with variety', fr: 'Sans AOP/IGP, avec cépage', it: 'Senza DOP/IGP, con vitigno' }, vsig: { es: 'Sin DOP/IGP, sin variedad', en: 'No PDO/PGI, no variety', fr: 'Sans AOP/IGP, sans cépage', it: 'Senza DOP/IGP, senza vitigno' }, igp: { es: 'IGP', en: 'PGI', fr: 'IGP', it: 'IGP' }, aop: { es: 'DOP', en: 'PDO', fr: 'AOP', it: 'DOP' } };

export default function Vino() {
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const [d, setD] = useState<Doc | null>(null);
  const [done, setDone] = useState(false);
  const [cc, setCc] = useState<'ES' | 'FR'>(user.market === 'FR' ? 'FR' : 'ES');
  useEffect(() => { setCc(user.market === 'FR' ? 'FR' : 'ES'); }, [user.market]);
  const [col, setCol] = useState<'red' | 'white'>('red');
  const [ft, setFt] = useState<keyof typeof FRT>('vsig_var');
  useEffect(() => { webJson('data/wine-prices.json', 6 * 3600e3).then(x => { setD(x); setDone(true); }); }, []);
  const cw = Math.min(width, 700) - 32 - 28;
  let pts: Pts = [], weekly = false;
  if (d && cc === 'ES' && d.es) { weekly = true; pts = d.es.weeks.filter(w => w[col] != null).map(w => [w.to, w[col] as number]); }
  if (d && cc === 'FR' && d.fr) pts = d.fr.series[col + '.' + ft] ?? [];
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const yKey = last ? (weekly ? null : (+last[0].slice(0, 4) - 1) + last[0].slice(4)) : null;
  const yago = last ? (weekly ? pts.reduce<[string, number] | null>((b, p) => { const dd = Math.abs(Date.parse(p[0]) - (Date.parse(last[0]) - 364 * 864e5)); return dd <= 10 * 864e5 && (!b || dd < Math.abs(Date.parse(b[0]) - (Date.parse(last[0]) - 364 * 864e5))) ? p : b; }, null) : pts.find(p => p[0] === yKey) ?? null) : null;
  const frTypes = d?.fr ? (Object.keys(FRT) as (keyof typeof FRT)[]).filter(k => d.fr!.series['red.' + k] && d.fr!.series['white.' + k]) : [];
  return (
    <Screen>
      <Stack.Screen options={{ title: tx(L, { es: 'Vino a granel', en: 'Bulk wine', fr: 'Vin en vrac', it: 'Vino sfuso' }) }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">🍷 {tx(L, { es: 'Vino a granel', en: 'Bulk wine', fr: 'Vin en vrac', it: 'Vino sfuso' })}</Text>
      {!d ? <Note>{done ? t('noDataNow') : t('loading')}</Note> : <>
        <Chips items={(['ES', 'FR'] as const).filter(k => (k === 'ES' ? d.es : d.fr)).map(k => ({ value: k, label: countryName(k, L), flag: flag(k) }))} value={cc} onChange={setCc} />
        <Segmented options={[{ value: 'red' as const, label: tx(L, COL.red) }, { value: 'white' as const, label: tx(L, COL.white) }]} value={col} onChange={setCol} />
        {cc === 'FR' && frTypes.length ? <Chips items={frTypes.map(k => ({ value: k, label: tx(L, FRT[k]) }))} value={ft} onChange={setFt} /> : null}
        {last ? <>
          <SectionTitle>{tx(L, COL[col]) + (cc === 'FR' ? ' · ' + tx(L, FRT[ft]) : '')}</SectionTitle>
          <Card>
            <Row first title={weekly ? tx(L, { es: 'Semana hasta el ', en: 'Week to ', fr: 'Semaine au ', it: 'Settimana al ' }) + fmtDate(last[0], L) : fmtDate(last[0], L)} right={num(last[1], L, 2) + ' €/hl'} />
            {prev ? <Row title={weekly ? tx(L, { es: 'Semana anterior', en: 'Previous week', fr: 'Semaine précédente', it: 'Settimana precedente' }) : tx(L, { es: 'Mes anterior', en: 'Previous month', fr: 'Mois précédent', it: 'Mese precedente' })} right={num(prev[1], L, 2) + ' €/hl'} rightSub={pct((last[1] / prev[1] - 1) * 100, L)} /> : null}
            {yago ? <Row title={tx(L, { es: 'Hace un año', en: 'A year ago', fr: 'Il y a un an', it: 'Un anno fa' })} right={num(yago[1], L, 2) + ' €/hl'} rightSub={pct((last[1] / yago[1] - 1) * 100, L)} /> : null}
          </Card>
          {pts.length > 1 ? <RangeChart key={cc + col + ft} points={pts} unit="€/hl" label={tx(L, COL[col])} width={cw} /> : null}
        </> : <Note>{t('noDataNow')}</Note>}
        <Text style={{ fontSize: 12, color: C.textMuted }}>{cc === 'ES'
          ? tx(L, { es: 'Precio medio semanal nacional del vino a granel. Fuente: MAPA, boletín semanal de precios del vino.', en: 'National weekly average bulk wine price. Source: MAPA (Spanish Ministry of Agriculture), weekly wine price bulletin.', fr: 'Prix moyen hebdomadaire national du vin en vrac. Source : MAPA (ministère espagnol de l’Agriculture), bulletin hebdomadaire.', it: 'Prezzo medio settimanale nazionale del vino sfuso. Fonte: MAPA (ministero spagnolo dell’Agricoltura), bollettino settimanale.' })
          : tx(L, { es: 'Precio medio mensual de compra a granel comunicado a la Comisión Europea; sale con un mes de retraso. Fuente: FranceAgriMer (Licence Ouverte 2.0).', en: 'Monthly average bulk purchase price reported to the European Commission; published a month late. Source: FranceAgriMer (Licence Ouverte 2.0).', fr: 'Prix moyen mensuel d’achat en vrac communiqué à la Commission européenne ; publié avec un mois de retard. Source : FranceAgriMer (Licence Ouverte 2.0).', it: 'Prezzo medio mensile di acquisto sfuso comunicato alla Commissione europea; esce con un mese di ritardo. Fonte: FranceAgriMer (Licence Ouverte 2.0).' })}</Text>
      </>}
    </Screen>
  );
}
