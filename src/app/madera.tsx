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
import { CountrySelect } from '../components/CountryPicker';

type Prices = { months: string[]; series: Record<string, (number | null)[]>; last: string; base: string };
type Removals = { years: number[]; countries: Record<string, { series: Record<string, (number | null)[]>; estimated: number[]; last: number }> };
type WoodPx = { ppi?: { source?: { name?: string }; unit?: string; countries: Record<string, Record<string, [string, number][]>> }; national?: { SE?: { series: { id: string; pts: [string, number][] }[] } } };
const PX: Record<string, T4> = {
  h: { es: 'Precios de la madera', en: 'Timber prices', fr: 'Prix du bois', it: 'Prezzi del legname' },
  ppi: { es: 'Industria de la madera (precio de productor)', en: 'Wood industry (producer price)', fr: 'Industrie du bois (prix producteur)', it: 'Industria del legno (prezzo alla produzione)' },
  saw: { es: 'Aserrado (precio de productor)', en: 'Sawmilling (producer price)', fr: 'Sciage (prix producteur)', it: 'Segagione (prezzo alla produzione)' },
  sawlog: { es: 'Trozas de pino y abeto (kr/m³)', en: 'Pine and spruce sawlogs (SEK/m³)', fr: 'Grumes de pin et d’épicéa (SEK/m³)', it: 'Tronchi di pino e abete (SEK/m³)' },
  pulp: { es: 'Madera de trituración (kr/m³)', en: 'Pulpwood (SEK/m³)', fr: 'Bois de trituration (SEK/m³)', it: 'Legname da triturazione (SEK/m³)' },
  y12: { es: 'en 12 meses', en: 'over 12 months', fr: 'sur 12 mois', it: 'in 12 mesi' },
  yq: { es: 'vs. mismo trimestre del año anterior', en: 'vs. same quarter last year', fr: 'vs. même trimestre un an avant', it: 'vs. stesso trimestre anno prima' },
  none: { es: 'No tenemos precios de la madera de este país.', en: 'We have no timber prices for this country.', fr: 'Nous n’avons pas de prix du bois pour ce pays.', it: 'Non abbiamo prezzi del legname per questo paese.' },
  note: { es: 'Índice de precios de productor de la industria (2021 = 100), no el precio de la madera en rollo. Suecia: precios de liquidación de madera en rollo (Skogsstyrelsen, kr/m³ sin corteza). Fuente: Eurostat sts_inpp_m.', en: 'Industry producer price index (2021 = 100), not the roundwood price. Sweden: roundwood settlement prices (Skogsstyrelsen, SEK/m³ under bark). Source: Eurostat sts_inpp_m.', fr: 'Indice des prix à la production de l’industrie (2021 = 100), pas le prix du bois rond. Suède : prix de règlement du bois rond (Skogsstyrelsen, SEK/m³ sans écorce). Source : Eurostat sts_inpp_m.', it: 'Indice dei prezzi alla produzione dell’industria (2021 = 100), non il prezzo del legname tondo. Svezia: prezzi di liquidazione del legname tondo (Skogsstyrelsen, SEK/m³ senza corteccia). Fonte: Eurostat sts_inpp_m.' },
};
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
  const [px, setPx] = useState<WoodPx | null>(null);
  const [done, setDone] = useState(false);
  const [k, setK] = useState('total');
  const [cc, setCc] = useState('DE');
  useEffect(() => { Promise.all([webJson('data/wood-prices-de.json', 12 * 3600e3), webJson('data/wood-removals.json', 24 * 3600e3), webJson('data/eu-wood-prices.json', 12 * 3600e3)]).then(([a, b, w]) => { setPr(a); setRm(b); setPx(w); setDone(true); if (b?.countries?.[user.market]) setCc(user.market); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cw = Math.min(width, 700) - 32 - 28;
  const pts: [string, number][] = pr ? pr.months.map((m, i) => [m, pr.series[k]?.[i]] as [string, number | null | undefined]).filter((p): p is [string, number] => p[1] != null) : [];
  const last = pts[pts.length - 1], prev = pts[pts.length - 2], yago = last ? pts.find(p => p[0] === (+last[0].slice(0, 4) - 1) + last[0].slice(4)) : undefined;
  const c = rm?.countries[cc], yi = c && rm ? rm.years.indexOf(c.last) : -1;
  const v = (key: string, i: number) => (c && i >= 0 ? c.series[key]?.[i] ?? null : null);
  const tot: [string, number][] = c && rm ? rm.years.map((y, i) => [String(y), c.series['TOTAL.RW']?.[i]] as [string, number | null | undefined]).filter((p): p is [string, number] => p[1] != null) : [];
  // Último valor y comparación con el mismo periodo un año antes (mensual 'YYYY-MM' o trimestral 'YYYYKn').
  const yoy = (pts?: [string, number][]) => { if (!pts || !pts.length) return null; const a = pts[pts.length - 1], k = (+a[0].slice(0, 4) - 1) + a[0].slice(4), b = pts.find(p => p[0] === k); return { a, b: b && b[1] ? b : null }; };
  const sePts = (id: string) => px?.national?.SE?.series.find(x => x.id === id)?.pts;
  const pxRows: { label: string; pts?: [string, number][]; q: boolean }[] = [
    { label: tx(L, PX.ppi), pts: px?.ppi?.countries?.[cc]?.C16, q: false },
    { label: tx(L, PX.saw), pts: px?.ppi?.countries?.[cc]?.C161, q: false },
    ...(cc === 'SE' ? [{ label: tx(L, PX.sawlog), pts: sePts('se-roundwood-sawlogs-pine-and-spruce'), q: true }, { label: tx(L, PX.pulp), pts: sePts('se-roundwood-pulpwood-total'), q: true }] : []),
  ].filter(r => r.pts && r.pts.length);
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
          <CountrySelect items={Object.keys(rm.countries).map(x => ({ value: x, label: countryName(x, L), flag: flag(x) }))} value={cc} onChange={setCc} />
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
        {rm && c && px ? <>
          <SectionTitle>{tx(L, PX.h) + ' — ' + countryName(cc, L)}</SectionTitle>
          {pxRows.length ? <Card>{pxRows.map((r, i) => { const y = yoy(r.pts)!; return <Row key={r.label} first={i === 0} title={r.label + ' · ' + (r.q ? y.a[0].replace('K', ' T') : fmtDate(y.a[0], L))} right={num(y.a[1], L, r.q ? 0 : 1)} rightSub={y.b ? pct((y.a[1] / y.b[1] - 1) * 100, L) + ' ' + tx(L, r.q ? PX.yq : PX.y12) : undefined} />; })}</Card> : <Note>{tx(L, PX.none)}</Note>}
          <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, PX.note)}</Text>
        </> : null}
        {!pr && !rm ? <Note>{t('noDataNow')}</Note> : null}
      </>}
      <View />
    </Screen>
  );
}
