// Qué ha cambiado hoy (como brief.html de la web): cambios reales en los datos de Dehesa en las últimas 24 horas, leídos de data/daily-brief.json.
// No son noticias: nuevos datos, cambios históricos detectados, conjuntos con retraso y próximas actualizaciones. Sin cifras calculadas aquí.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, SectionTitle, Note } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { numAuto, pct, date as fmtDate, localTime } from '../lib/format';
import { webJson, countryName } from '../lib/fv';
import { loadGloss } from '../lib/gloss';
import { tl } from '../lib/labelTl';
import { BT } from '../lib/briefText';
import { tx, flag } from '../lib/tx';

type Mv = { k: string; label: string; unit: string; period: string; value: number; changePct: number | null; sourceId?: string; prevPeriod?: string; prevValue?: number; gapDays?: number };
type Brief = {
  generatedAt: string; since: string; windowHours: number;
  counts: { datasetsUpdated: number; newPeriods: number; newSeries: number; newDatasets: number; revisions: number; stale: number; upcoming: number };
  datasets: { file: string; name: string; changed: number | null }[]; newDatasets: { file: string; name: string; series?: number }[];
  movers: Mv[]; gapMovers: Mv[]; newData: Mv[]; byCountry: Record<string, Mv[]>;
  cashBids: { asOf: string; marketsUpdated: number; groups: { state: string; stateName: string; commodityName: string; commodityClass: string | null; deliveryPoint: string | null; unit: string; markets: number; lead: { market: string; pct: number; value: number } }[] };
  revisions: { series: string; label: string; unit: string; period: string; old: number; new: number; pct: number }[];
  stale: { workflow: string; name: string; status: string }[]; upcoming: { workflow: string; name: string; nextRun: string }[];
};
const UN: Record<string, Record<string, string>> = { 'thousand t': { es: 'mil t', en: 'thousand t', fr: 'milliers de t', it: 'migliaia di t' }, 'thousand ha': { es: 'mil ha', en: 'thousand ha', fr: 'milliers d’ha', it: 'migliaia di ha' }, 'kg/ha': { es: 'kg/ha', en: 'kg/ha', fr: 'kg/ha', it: 'kg/ha' } };
const IDX: Record<string, number> = { es: 0, en: 1, fr: 2, it: 3 };

export default function Cambios() {
  const { user, t } = useApp();
  const L = user.lang;
  const [b, setB] = useState<Brief | null>(null);
  const [done, setDone] = useState(false);
  const [more, setMore] = useState<Record<string, boolean>>({});
  const [, setGl] = useState(false);
  useEffect(() => { webJson('data/daily-brief.json', 1800e3).then((d: Brief | null) => { setB(d); setDone(true); }); }, []);
  useEffect(() => { loadGloss(L).then(() => setGl(v => !v)); }, [L]);
  const s = (k: string) => BT[k][IDX[L] ?? 0];
  const un = (u: string) => (u ? ' ' + (UN[u]?.[L] ?? u) : '');
  const lab = (x: { label: string }) => tl(x.label, L);
  const cc = (k: string) => k.split('/')[0];
  const mvRow = (x: Mv, i: number, showCountry = true) => (
    <Row key={x.k} first={i === 0} title={lab(x)} sub={(showCountry ? flag(cc(x.k)) + ' ' + countryName(cc(x.k), L) + ' · ' : '') + x.period} right={`${numAuto(x.value, L)}${un(x.unit)}`}
      rightSub={x.changePct != null ? pct(x.changePct, L) : undefined} rightColor={changeColor(x.changePct)} />
  );
  const list = <T,>(id: string, arr: T[], n: number, render: (x: T, i: number) => React.ReactNode) => {
    if (!arr.length) return <Card><Row first title={s('none')} /></Card>;
    const open = more[id]; const shown = open ? arr : arr.slice(0, n);
    return <>
      <Card>{shown.map(render)}</Card>
      {arr.length > n ? <Card><Row first title={(open ? s('less') : s('more')) + (open ? '' : ' (' + arr.length + ')')} right="›" onPress={() => setMore({ ...more, [id]: !open })} /></Card> : null}
    </>;
  };
  const dsName = (d: { name: string; file: string }) => { const n = d.name.replace(/^Update /, ''); return /^data\/.+\.json$/.test(n) ? n.replace(/^data\//, '').replace(/\.json$/, '').replace(/-stats$/, '').replace(/-/g, ' ') : n; };
  const zone = b?.byCountry?.[user.market] ?? [];
  const title = s('title');
  return (
    <Screen refresh>
      <Stack.Screen options={{ title }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{title}</Text>
      {!done ? <Note>{t('loading')}</Note> : !b ? <Note>{s('nobrief')}</Note> : <>
        <Text style={{ fontSize: 13, color: C.textMuted }}>{s('sub')}</Text>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{s('gen')}: {(() => { const lt = localTime(b.generatedAt, L); return lt.day + ' ' + lt.time; })()} · {s('win')}: {b.windowHours} h</Text>
        <Card>
          <Row first title={s('cDs')} right={String(b.counts.datasetsUpdated)} />
          <Row title={s('cNew')} right={String(b.counts.newPeriods)} />
          <Row title={s('cRev')} right={String(b.counts.revisions)} />
          <Row title={s('cStale')} right={String(b.counts.stale)} />
          <Row title={s('cUp')} right={String(b.counts.upcoming)} />
          {b.counts.newDatasets ? <Row title={s('cNewDs')} right={String(b.counts.newDatasets)} /> : null}
        </Card>

        <SectionTitle>{s('zoneT')}</SectionTitle>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{s('zoneH').replace('{c}', flag(user.market) + ' ' + countryName(user.market, L))}</Text>
        {zone.length ? list('zone', zone, 6, (x, i) => mvRow(x, i, false)) : <Card><Row first title={s('zoneNone')} /></Card>}

        <SectionTitle>{s('movers')}</SectionTitle>
        {list('movers', b.movers, 12, (x, i) => mvRow(x, i))}

        {b.gapMovers.length ? <>
          <SectionTitle>{s('gapmv')}</SectionTitle>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{s('gapmvH')}</Text>
          {list('gap', b.gapMovers, 6, (x, i) => (
            <Row key={x.k} first={i === 0} title={lab(x)} sub={flag(cc(x.k)) + ' ' + countryName(cc(x.k), L) + ' · ' + s('gapmvN').replace('{p}', x.prevPeriod ?? '').replace('{n}', String(Math.round((x.gapDays ?? 0) / 30)))}
              right={`${numAuto(x.value, L)}${un(x.unit)}`} rightSub={x.changePct != null ? pct(x.changePct, L) : undefined} rightColor={changeColor(x.changePct)} />
          ))}
        </> : null}

        <SectionTitle>{s('newd')}</SectionTitle>
        {list('newd', b.newData, 15, (x, i) => mvRow(x, i))}

        {b.cashBids?.groups?.length ? <>
          <SectionTitle>{tx(L, { es: 'Precios locales de grano (EE. UU.)', en: 'US local grain prices', fr: 'Prix locaux des grains (É.-U.)', it: 'Prezzi locali dei cereali (USA)' })}</SectionTitle>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'Variación del último día en mercados de USDA; cada fila es un estado, producto y especificación.', en: 'Last-day change in USDA markets; each row is one state, commodity and specification.', fr: 'Variation du dernier jour sur les marchés USDA ; chaque ligne est un État, un produit et une spécification.', it: 'Variazione dell’ultimo giorno nei mercati USDA; ogni riga è uno stato, un prodotto e una specifica.' })}</Text>
          {list('cb', b.cashBids.groups, 8, (g, i) => (
            <Row key={g.stateName + g.commodityName + (g.commodityClass ?? '') + (g.deliveryPoint ?? '') + i} first={i === 0} title={g.stateName + ' · ' + g.commodityName} sub={[g.commodityClass, g.deliveryPoint, g.lead.market].filter(Boolean).join(' · ')}
              right={`${numAuto(g.lead.value, L)} $/${g.unit}`} rightSub={pct(g.lead.pct, L)} rightColor={changeColor(g.lead.pct)} onPress={() => router.push('/localesus')} />
          ))}
        </> : null}

        <SectionTitle>{s('revs')}</SectionTitle>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{s('revH')}</Text>
        {list('revs', b.revisions, 8, (r, i) => (
          <Row key={r.series + r.period + i} first={i === 0} title={lab(r)} sub={flag(cc(r.series)) + ' ' + countryName(cc(r.series), L) + ' · ' + r.period}
            right={`${numAuto(r.old, L)} → ${numAuto(r.new, L)}${un(r.unit)}`} rightSub={pct(r.pct, L)} />
        ))}

        <SectionTitle>{s('ds')}</SectionTitle>
        {list('ds', b.datasets, 10, (d, i) => <Row key={d.file} first={i === 0} title={dsName(d)} right={d.changed != null ? `${d.changed} ${s('changed')}` : s('changedC')} />)}

        <SectionTitle>{s('stale')}</SectionTitle>
        {list('stale', b.stale, 6, (x, i) => <Row key={x.workflow} first={i === 0} title={'⚠️ ' + x.name.replace(/^Update /, '')} right={x.status} />)}

        <SectionTitle>{s('up')}</SectionTitle>
        {list('up', b.upcoming, 8, (u, i) => { const lt = localTime(u.nextRun, L); return <Row key={u.workflow} first={i === 0} title={u.name.replace(/^Update /, '')} right={lt.time} rightSub={lt.day} />; })}

        {b.newDatasets.length ? <>
          <SectionTitle>{s('newDs')}</SectionTitle>
          {list('nds', b.newDatasets, 6, (d, i) => <Row key={d.file} first={i === 0} title={dsName(d)} />)}
        </> : null}
        <View style={{ height: 8 }} />
        <Text style={{ fontSize: 12, color: C.textMuted }}>{fmtDate(b.generatedAt.slice(0, 10), L)} · dehesaindex.com</Text>
      </>}
    </Screen>
  );
}
