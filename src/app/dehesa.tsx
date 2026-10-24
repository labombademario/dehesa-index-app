// Mercados Dehesa (como dehesa.html): cerdo ibérico (censo MAPA), pastos (precio de la tierra y renta, MAPA), corcho (producción por comunidad y valor, MITECO) y productos del monte (Anuario forestal 2021).
// Lee data/dehesa.json de la web. Solo cifras oficiales ya publicadas; lo que no tiene fuente abierta se declara pendiente. No se calcula ni se estima nada en la app.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle } from '../components/ui';
import { Chips } from '../components/Chips';
import { RangeChart } from '../components/RangeChart';
import { C, changeColor } from '../lib/theme';
import { num, pct, date as fmtDate } from '../lib/format';
import { webJson } from '../lib/fv';
import { tx, type T4 } from '../lib/tx';
import { openSafe } from '../lib/openLink';

type Pt = [string, number];
type Src = { name: string; url: string };
type Dehesa = {
  pigs: { period: string; es: { total: Pt[]; iberian: Pt[]; iberianFattening: Pt[]; iberianSows: Pt[] }; provinces: { code: string; name: string; iberian: number; total: number; share: number }[]; source: Src };
  pasture: { years: number[]; areas: Record<string, { name: T4; price: number[]; rent: number[] }>; provYear: number; provinces: { code: string; name: string; price: number }[]; source: Src };
  cork: { production: { years: number[]; total: (number | null)[]; ccaa: Record<string, (number | null)[]>; names: Record<string, string>; yearNotes: Record<string, string>; estimatedAN: number[]; totalIsSum: number[]; source: Src };
    anuario2021: { series: { year: number; production: number; value: number }[]; prices2021: { year: number; ccaa: { code: string; name: string; price: number }[]; total: { price: number } }; source: Src } };
  forest: Record<string, { year: number; production: number; value: number; est?: boolean }[] | Src>;
};
const FOREST: [string, string, T4, string][] = [
  ['pineNut', '🌰', { es: 'Piñón', en: 'Pine nuts', fr: 'Pignons', it: 'Pinoli' }, 't'],
  ['chestnut', '🌰', { es: 'Castaña', en: 'Chestnut', fr: 'Châtaigne', it: 'Castagna' }, 't'],
  ['truffle', '🍄', { es: 'Trufa', en: 'Truffle', fr: 'Truffe', it: 'Tartufo' }, 'kg'],
  ['mushrooms', '🍄', { es: 'Setas', en: 'Mushrooms', fr: 'Champignons', it: 'Funghi' }, 'kg'],
  ['resin', '🌲', { es: 'Resina', en: 'Resin', fr: 'Résine', it: 'Resina' }, 't'],
];
const link = (s: Src, L: string) => <Pressable onPress={() => openSafe(s.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{tx(L as 'es', { es: 'Fuente: ', en: 'Source: ', fr: 'Source : ', it: 'Fonte: ' }) + s.name}</Text></Pressable>;
const small = { fontSize: 12.5, color: C.textMuted } as const;

export default function DehesaScreen() {
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const cw = Math.min(width, 700) - 32 - 28;
  const [d, setD] = useState<Dehesa | null>(null);
  const [done, setDone] = useState(false);
  const [fk, setFk] = useState('pineNut');
  useEffect(() => { webJson('data/dehesa.json', 6 * 3600e3).then(x => { setD(x); setDone(true); }); }, []);
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  const title = T('Mercados Dehesa', 'Dehesa markets', 'Marchés de la dehesa', 'Mercati della dehesa');
  const iso = (p: string) => (p.length === 7 ? p + '-01' : p);
  const pg = d?.pigs, pa = d?.pasture, ck = d?.cork, fo = d?.forest;
  const lastOf = (a: Pt[]) => a[a.length - 1];
  const yoyOf = (a: Pt[]) => (a.length > 2 && a[a.length - 3][1] ? (a[a.length - 1][1] / a[a.length - 3][1] - 1) * 100 : null);
  const fArr = fo ? (fo[fk] as { year: number; production: number; value: number; est?: boolean }[]) : [];
  const fl = fArr[fArr.length - 1];
  const fu = FOREST.find(x => x[0] === fk)!;
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">🌳 {title}</Text>
      {!d ? <Note>{done ? t('noDataNow') : t('loading')}</Note> : <>
        <Note>{T('Solo cifras oficiales ya publicadas. Lo que no tiene fuente abierta (precio del cerdo ibérico y de la bellota, serie continua del precio del corcho) queda pendiente.', 'Official published figures only. What has no open source (Iberian pig and acorn prices, a continuous cork price series) is pending.', 'Uniquement des chiffres officiels déjà publiés. Ce qui n’a pas de source ouverte (prix du porc ibérique et du gland, série continue du prix du liège) reste en attente.', 'Solo cifre ufficiali già pubblicate. Ciò che non ha fonte aperta (prezzo del maiale iberico e della ghianda, serie continua del prezzo del sughero) resta in sospeso.')}</Note>
        {pg ? <>
          <SectionTitle>{'🐖 ' + T('Cerdo ibérico', 'Iberian pig', 'Porc ibérique', 'Maiale iberico') + ' · ' + fmtDate(pg.period, L)}</SectionTitle>
          <Card>
            <Row first title={T('Censo ibérico (España)', 'Iberian herd (Spain)', 'Cheptel ibérique (Espagne)', 'Capi iberici (Spagna)')} sub={T('Cabezas, ', 'Head, ', 'Têtes, ', 'Capi, ') + fmtDate(lastOf(pg.es.iberian)[0], L)} right={num(lastOf(pg.es.iberian)[1], L, 0)} rightSub={yoyOf(pg.es.iberian) == null ? undefined : pct(yoyOf(pg.es.iberian)!, L)} rightColor={changeColor(yoyOf(pg.es.iberian))} />
            <Row title={T('Cebo ibérico', 'Iberian fattening', 'Engraissement ibérique', 'Ingrasso iberico')} right={num(lastOf(pg.es.iberianFattening)[1], L, 0)} rightSub={yoyOf(pg.es.iberianFattening) == null ? undefined : pct(yoyOf(pg.es.iberianFattening)!, L)} rightColor={changeColor(yoyOf(pg.es.iberianFattening))} />
            <Row title={T('Cerdas ibéricas', 'Iberian sows', 'Truies ibériques', 'Scrofe iberiche')} right={num(lastOf(pg.es.iberianSows)[1], L, 0)} rightSub={yoyOf(pg.es.iberianSows) == null ? undefined : pct(yoyOf(pg.es.iberianSows)!, L)} rightColor={changeColor(yoyOf(pg.es.iberianSows))} />
          </Card>
          <Text style={small}>{T('La variación compara con el mismo mes del año anterior.', 'Change is against the same month a year earlier.', 'La variation compare au même mois un an plus tôt.', 'La variazione confronta con lo stesso mese dell’anno prima.')}</Text>
          <RangeChart key="ib" points={pg.es.iberian.map(x => [iso(x[0]), x[1]] as Pt)} unit={T('cabezas', 'head', 'têtes', 'capi')} label={T('Censo ibérico', 'Iberian herd', 'Cheptel ibérique', 'Capi iberici')} width={cw} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Provincias con más ibérico', 'Top Iberian provinces', 'Provinces avec le plus d’ibérique', 'Province con più iberico')}</Text>
          <Card>{pg.provinces.map((p, i) => <Row key={p.code} first={i === 0} title={p.name} sub={num(p.share, L, 1) + ' % ' + T('del porcino provincial', 'of the provincial herd', 'du cheptel porcin provincial', 'dei suini provinciali')} right={num(p.iberian, L, 0)} />)}</Card>
          {link(pg.source, L)}
        </> : null}
        {pa ? <>
          <SectionTitle>{'🌾 ' + T('Pastos', 'Pasture', 'Pâturages', 'Pascoli') + ' · ' + pa.years[pa.years.length - 1]}</SectionTitle>
          <Card>{Object.keys(pa.areas).map((k, i) => {
            const a = pa.areas[k], n = a.price.length, pr = a.price[n - 1], pp = a.price[n - 2];
            return <Row key={k} first={i === 0} title={tx(L, a.name)} sub={T('Renta: ', 'Rent: ', 'Loyer : ', 'Affitto: ') + num(a.rent[n - 1], L, 0) + ' €/ha/' + T('año', 'year', 'an', 'anno')} right={num(pr, L, 0) + ' €/ha'} rightSub={pp ? pct((pr / pp - 1) * 100, L) : undefined} rightColor={pp ? changeColor((pr / pp - 1) * 100) : undefined} />;
          })}</Card>
          <Text style={small}>{T('Precio medio de la tierra de pastizal y renta, por comunidad. La variación compara con el año anterior.', 'Average pasture land price and rent by region. Change is against the previous year.', 'Prix moyen des terres de pâturage et loyer, par région. La variation compare à l’année précédente.', 'Prezzo medio dei terreni a pascolo e affitto, per regione. La variazione confronta con l’anno precedente.')}</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Provincias de dehesa', 'Dehesa provinces', 'Provinces de dehesa', 'Province di dehesa') + ' · ' + pa.provYear}</Text>
          <Card>{pa.provinces.map((p, i) => <Row key={p.code} first={i === 0} title={p.name} right={num(p.price, L, 0) + ' €/ha'} />)}</Card>
          {link(pa.source, L)}
        </> : null}
        {ck ? <>
          <SectionTitle>{'🪵 ' + T('Corcho: producción', 'Cork: production', 'Liège : production', 'Sughero: produzione')}</SectionTitle>
          {(() => {
            const P = ck.production, n = P.years.length - 1, tot = P.total[n], yr = P.years[n];
            const pts = P.years.map((y, i) => [y + '-01-01', P.total[i]] as [string, number | null]).filter((x): x is Pt => x[1] != null);
            const rows = Object.keys(P.ccaa).filter(k => P.ccaa[k][n] != null).sort((a, b) => (P.ccaa[b][n] as number) - (P.ccaa[a][n] as number));
            return <>
              <Card>
                <Row first title={T('Total España', 'Spain total', 'Total Espagne', 'Totale Spagna') + ' · ' + yr} sub={P.totalIsSum.includes(yr) ? T('Suma de las comunidades con dato', 'Sum of regions with data', 'Somme des régions avec donnée', 'Somma delle regioni con dato') : undefined} right={tot == null ? '—' : num(tot, L, 0) + ' t'} />
                {rows.map(k => <Row key={k} title={P.names[k] ?? k} right={num(P.ccaa[k][n] as number, L, 0) + ' t'} />)}
              </Card>
              <RangeChart key="cork" points={pts} unit="t" label={T('Producción de corcho', 'Cork production', 'Production de liège', 'Produzione di sughero')} width={cw} />
              <Text style={small}>{T('Avisos del dato: Andalucía (35.000 t en 2020-2022) es una estimación del propio MITECO; en 2024 no hay total nacional y la cifra es la suma de las comunidades con dato; 2005 y 2007 son muy bajos tal como los publica el ministerio.', 'Data warnings: Andalucía (35,000 t in 2020-2022) is an estimate by MITECO itself; 2024 has no national total and the figure is the sum of regions with data; 2005 and 2007 are very low as published by the ministry.', 'Avertissements : l’Andalousie (35 000 t en 2020-2022) est une estimation du MITECO lui-même ; 2024 n’a pas de total national et le chiffre est la somme des régions avec donnée ; 2005 et 2007 sont très bas tels que publiés par le ministère.', 'Avvisi sul dato: l’Andalusia (35.000 t nel 2020-2022) è una stima del MITECO stesso; il 2024 non ha totale nazionale e la cifra è la somma delle regioni con dato; il 2005 e il 2007 sono molto bassi così come li pubblica il ministero.')}</Text>
              {link(P.source, L)}
            </>;
          })()}
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Precio del corcho en 2021 (dato puntual)', 'Cork price in 2021 (single data point)', 'Prix du liège en 2021 (donnée ponctuelle)', 'Prezzo del sughero nel 2021 (dato puntuale)')}</Text>
          <Card>
            {ck.anuario2021.prices2021.ccaa.map((c, i) => <Row key={c.code} first={i === 0} title={c.name} right={num(c.price, L, 0) + ' €/t'} />)}
            <Row title={T('Total', 'Total', 'Total', 'Totale')} right={num(ck.anuario2021.prices2021.total.price, L, 0) + ' €/t'} />
          </Card>
          <Text style={small}>{T('Corcho de reproducción, precios facilitados por las comunidades al MITECO. Es una foto única, no una serie viva: no existe una serie continua abierta del precio del corcho.', 'Reproduction cork, prices supplied by the regions to MITECO. A single snapshot, not a live series: there is no open continuous cork price series.', 'Liège de reproduction, prix fournis par les régions au MITECO. Une photo unique, pas une série vivante : il n’existe pas de série continue ouverte du prix du liège.', 'Sughero da riproduzione, prezzi forniti dalle regioni al MITECO. Una sola istantanea, non una serie viva: non esiste una serie continua aperta del prezzo del sughero.')}</Text>
          {link(ck.anuario2021.source, L)}
        </> : null}
        {fo ? <>
          <SectionTitle>{'🌲 ' + T('Productos del monte', 'Woodland products', 'Produits de la forêt', 'Prodotti del bosco')}</SectionTitle>
          <Chips items={FOREST.map(f => ({ value: f[0], label: f[1] + ' ' + tx(L, f[2]) }))} value={fk} onChange={setFk} />
          {fl ? <>
            <Card>
              <Row first title={tx(L, fu[2]) + ' · ' + fl.year + (fl.est ? ' *' : '')} sub={T('Producción', 'Production', 'Production', 'Produzione')} right={num(fl.production, L, 0) + ' ' + fu[3]} />
              <Row title={T('Valor', 'Value', 'Valeur', 'Valore')} sub={T('Estimado por el MITECO, miles de euros', 'Estimated by MITECO, thousand euro', 'Estimé par le MITECO, milliers d’euros', 'Stimato dal MITECO, migliaia di euro')} right={num(fl.value, L, 0) + ' k€'} />
            </Card>
            <RangeChart key={fk} points={fArr.map(x => [x.year + '-01-01', x.production] as Pt)} unit={fu[3]} label={tx(L, fu[2])} width={cw} />
            {fArr.some(x => x.est) ? <Text style={small}>{T('* Dato estimado.', '* Estimated figure.', '* Donnée estimée.', '* Dato stimato.')}</Text> : null}
          </> : null}
          {link(fo.source as Src, L)}
        </> : null}
      </>}
    </Screen>
  );
}
