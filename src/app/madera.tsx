// Madera (como la pestaña Madera de precios.html): precio de la madera de los bosques estatales de Alemania (Destatis, índice 2015=100, mensual)
// y cortas de madera en rollo por país (Eurostat, miles de m³, anual).
import React, { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle } from '../components/ui';
import { Chips } from '../components/Chips';
import { RangeChart } from '../components/RangeChart';
import { C } from '../lib/theme';
import { num, pct, date as fmtDate } from '../lib/format';
import { webJson, countryName } from '../lib/fv';
import { tx, fill, flag, type T4 } from '../lib/tx';

type Prices = { months: string[]; series: Record<string, (number | null)[]>; last: string; base: string };
type Removals = { years: number[]; countries: Record<string, { series: Record<string, (number | null)[]>; estimated: number[]; last: number }> };
const P: Record<string, T4> = {
  total: { es: 'Madera en rollo (total)', en: 'Roundwood (total)', fr: 'Bois rond (total)', it: 'Legname tondo (totale)' },
  logs: { es: 'Trozas (madera de sierra)', en: 'Sawlogs', fr: 'Grumes (bois de sciage)', it: 'Tronchi da sega' },
  pulp: { es: 'Madera industrial (trituración)', en: 'Industrial wood (pulpwood)', fr: 'Bois d’industrie (trituration)', it: 'Legname industriale (triturazione)' },
  fuel: { es: 'Leña', en: 'Fuelwood', fr: 'Bois de feu', it: 'Legna da ardere' },
  spruce: { es: 'Trozas de abeto (Fichte)', en: 'Spruce logs (Fichte)', fr: 'Grumes d’épicéa (Fichte)', it: 'Tronchi di abete rosso (Fichte)' },
  pine: { es: 'Trozas de pino (Kiefer)', en: 'Pine logs (Kiefer)', fr: 'Grumes de pin (Kiefer)', it: 'Tronchi di pino (Kiefer)' },
  beech: { es: 'Trozas de haya (Buche)', en: 'Beech logs (Buche)', fr: 'Grumes de hêtre (Buche)', it: 'Tronchi di faggio (Buche)' },
  oak: { es: 'Trozas de roble (Eiche)', en: 'Oak logs (Eiche)', fr: 'Grumes de chêne (Eiche)', it: 'Tronchi di quercia (Eiche)' },
  douglas: { es: 'Trozas de douglasia', en: 'Douglas fir logs', fr: 'Grumes de douglas', it: 'Tronchi di douglasia' },
};
const R: Record<string, T4> = { 'TOTAL.RW': { es: 'Total', en: 'Total', fr: 'Total', it: 'Totale' }, 'CONIF.RW': { es: 'Coníferas', en: 'Conifers', fr: 'Résineux', it: 'Conifere' }, 'NCONIF.RW': { es: 'Frondosas', en: 'Broadleaves', fr: 'Feuillus', it: 'Latifoglie' }, 'TOTAL.RW_IN': { es: 'Industrial (trozas, trituración y otros)', en: 'Industrial (logs, pulpwood and other)', fr: 'Industriel (grumes, trituration et autres)', it: 'Industriale (tronchi, triturazione e altro)' }, 'TOTAL.RW_FW': { es: 'Leña', en: 'Fuelwood', fr: 'Bois de feu', it: 'Legna da ardere' } };

export default function Madera() {
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const [pr, setPr] = useState<Prices | null>(null);
  const [rm, setRm] = useState<Removals | null>(null);
  const [done, setDone] = useState(false);
  const [k, setK] = useState('total');
  const [cc, setCc] = useState('DE');
  useEffect(() => { Promise.all([webJson('data/wood-prices-de.json', 12 * 3600e3), webJson('data/wood-removals.json', 24 * 3600e3)]).then(([a, b]) => { setPr(a); setRm(b); setDone(true); }); }, []);
  const cw = Math.min(width, 700) - 32 - 28;
  const pts: [string, number][] = pr ? pr.months.map((m, i) => [m, pr.series[k]?.[i]] as [string, number | null | undefined]).filter((p): p is [string, number] => p[1] != null) : [];
  const last = pts[pts.length - 1], prev = pts[pts.length - 2], yago = last ? pts.find(p => p[0] === (+last[0].slice(0, 4) - 1) + last[0].slice(4)) : undefined;
  const c = rm?.countries[cc], yi = c && rm ? rm.years.indexOf(c.last) : -1;
  const v = (key: string, i: number) => (c && i >= 0 ? c.series[key]?.[i] ?? null : null);
  const tot: [string, number][] = c && rm ? rm.years.map((y, i) => [String(y), c.series['TOTAL.RW']?.[i]] as [string, number | null | undefined]).filter((p): p is [string, number] => p[1] != null) : [];
  return (
    <Screen>
      <Stack.Screen options={{ title: tx(L, { es: 'Madera', en: 'Timber', fr: 'Bois', it: 'Legname' }) }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">🌲 {tx(L, { es: 'Madera', en: 'Timber', fr: 'Bois', it: 'Legname' })}</Text>
      {!done ? <Note>{t('loading')}</Note> : <>
        {pr && last ? <>
          <SectionTitle>{flag('DE') + ' ' + tx(L, { es: 'Alemania: precio de la madera de los bosques estatales', en: 'Germany: state-forest timber prices', fr: 'Allemagne : prix du bois des forêts domaniales', it: 'Germania: prezzi del legname delle foreste statali' })}</SectionTitle>
          <Chips items={Object.keys(P).filter(x => pr.series[x]).map(x => ({ value: x, label: tx(L, P[x]) }))} value={k} onChange={setK} />
          <Card>
            <Row first title={tx(L, P[k]) + ' · ' + fmtDate(last[0], L)} right={num(last[1], L, 1)} rightSub={tx(L, { es: 'índice ', en: 'index ', fr: 'indice ', it: 'indice ' }) + pr.base} />
            {prev ? <Row title={tx(L, { es: 'Mes anterior', en: 'Previous month', fr: 'Mois précédent', it: 'Mese precedente' })} right={num(prev[1], L, 1)} rightSub={pct((last[1] / prev[1] - 1) * 100, L)} /> : null}
            {yago ? <Row title={tx(L, { es: 'Hace un año', en: 'A year ago', fr: 'Il y a un an', it: 'Un anno fa' })} right={num(yago[1], L, 1)} rightSub={pct((last[1] / yago[1] - 1) * 100, L)} /> : null}
          </Card>
          <RangeChart key={k} points={pts} unit={pr.base} label={tx(L, P[k])} width={cw} />
          <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'Índice de precios (2015 = 100), no €/m³. Fuente: Statistisches Bundesamt (Destatis), tabla 61231-0002; Datenlizenz Deutschland 2.0.', en: 'Price index (2015 = 100), not €/m³. Source: Statistisches Bundesamt (Destatis), table 61231-0002; Datenlizenz Deutschland 2.0.', fr: 'Indice de prix (2015 = 100), pas des €/m³. Source : Statistisches Bundesamt (Destatis), tableau 61231-0002 ; Datenlizenz Deutschland 2.0.', it: 'Indice dei prezzi (2015 = 100), non €/m³. Fonte: Statistisches Bundesamt (Destatis), tabella 61231-0002; Datenlizenz Deutschland 2.0.' })}</Text>
        </> : null}
        {rm ? <>
          <SectionTitle>{tx(L, { es: 'Cortas de madera en rollo', en: 'Roundwood removals', fr: 'Récolte de bois rond', it: 'Tagli di legname tondo' })}</SectionTitle>
          <Chips items={Object.keys(rm.countries).map(x => ({ value: x, label: countryName(x, L), flag: flag(x) }))} value={cc} onChange={setCc} />
          {c ? <>
            <Card>{['TOTAL.RW', 'CONIF.RW', 'NCONIF.RW', 'TOTAL.RW_IN', 'TOTAL.RW_FW'].filter(x => v(x, yi) != null).map((x, i) => {
              const a = v(x, yi), b = v(x, yi - 1);
              return <Row key={x} first={i === 0} title={tx(L, R[x]) + (i === 0 ? ' · ' + c.last + (c.estimated.includes(c.last) ? ' *' : '') : '')} right={num(a!, L, 0) + ' ' + tx(L, { es: 'mil m³', en: 'thousand m³', fr: 'milliers de m³', it: 'migliaia di m³' })} rightSub={b ? pct((a! / b - 1) * 100, L) : undefined} />;
            })}</Card>
            {tot.length > 1 ? <RangeChart key={'r' + cc} points={tot} unit={tx(L, { es: 'mil m³', en: 'thousand m³', fr: 'milliers de m³', it: 'migliaia di m³' })} label={tx(L, R['TOTAL.RW'])} width={cw} /> : null}
            {c.estimated.length ? <Text style={{ fontSize: 12, color: C.textMuted }}>{fill(tx(L, { es: '* Dato estimado por el país ({0}).', en: '* Figure estimated by the country ({0}).', fr: '* Donnée estimée par le pays ({0}).', it: '* Dato stimato dal paese ({0}).' }), c.estimated.join(', '))}</Text> : null}
          </> : null}
          <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'Fuente: Eurostat, for_remov (cuestionario conjunto del sector forestal).', en: 'Source: Eurostat, for_remov (Joint Forest Sector Questionnaire).', fr: 'Source : Eurostat, for_remov (questionnaire conjoint sur le secteur forestier).', it: 'Fonte: Eurostat, for_remov (questionario congiunto sul settore forestale).' })}</Text>
        </> : null}
        {!pr && !rm ? <Note>{t('noDataNow')}</Note> : null}
      </>}
      <View />
    </Screen>
  );
}
