// Ficha de una fruta, hortaliza o fruto seco (como producto.html?p=<id> de la web): precio semanal del país elegido con gráfico y tipos,
// comparación entre países; en España, precio percibido del MAPA con su estacionalidad y producción por provincia; en el resto, lo que cobra el
// agricultor en ESE país (INSEE o Eurostat). Nunca se ponen datos de un país en la ficha de otro.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, Note, Segmented, SectionTitle } from '../../components/ui';
import { RangeChart } from '../../components/RangeChart';
import { C } from '../../lib/theme';
import { num, date as fmtDate, pct } from '../../lib/format';
import { loadFv, loadEuSeries, loadPerc, loadCrops, loadFarm, countryName, stageName, variantName, type FvProduct, type CropsDoc, type FarmDoc } from '../../lib/fv';

type Pts = [string, number][];
const DAY = 864e5;

function Bar({ label, value, sub, frac, strong, muted }: { label: string; value: string; sub?: string; frac: number; strong?: boolean; muted?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontSize: 14.5, color: muted ? C.textMuted : C.text, fontWeight: strong ? '700' : '500' }}>{label}</Text>
        <Text style={{ fontSize: 14.5, color: muted ? C.textMuted : C.text, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{value}</Text>
      </View>
      {sub ? <Text style={{ fontSize: 11.5, color: C.textMuted }}>{sub}</Text> : null}
      <View style={{ height: 5, borderRadius: 3, backgroundColor: C.surfaceAlt, marginTop: 5 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: muted ? C.textMuted : C.accent, opacity: strong ? 1 : 0.6, width: `${Math.max(2, frac * 100)}%` }} /></View>
    </View>
  );
}

export default function Fruta() {
  const { id, c } = useLocalSearchParams<{ id: string; c?: string }>();
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const [P, setP] = useState<FvProduct | null>(null);
  const [done, setDone] = useState(false);
  const [cc, setCc] = useState<string>((c as string) || 'ES');
  const [variants, setVariants] = useState<{ id: string; label: string; pts: Pts }[]>([]);
  const [vi, setVi] = useState(0);
  const [perc, setPerc] = useState<Pts | null>(null);
  const [crops, setCrops] = useState<CropsDoc | null>(null);
  const [farm, setFarm] = useState<FarmDoc | null>(null);
  // el país pedido se respeta aunque no tenga precio semanal (antes saltaba a España sin avisar)
  useEffect(() => { loadFv().then(d => { const p = d?.products.find(x => x.id === id) ?? null; setP(p); setDone(true); if (p?.perc) loadPerc(p.perc.file, p.perc.id).then(setPerc); if (p?.crops) loadCrops(p.crops.group).then(setCrops); }); loadFarm().then(setFarm); }, [id]);
  const isES = cc === 'ES';
  const ref = P?.eu?.latest[cc];
  useEffect(() => {
    if (!P?.eu || !ref) { setVariants([]); return; }
    let alive = true;
    const ids = [ref.series].concat(P.eu.series.filter(s => s.stage === ref.stage && s.id !== ref.series).map(s => s.id)).slice(0, 6);
    Promise.all(ids.map(sid => loadEuSeries(sid, cc))).then(rs => {
      if (!alive) return;
      const out = ids.map((sid, i) => ({ id: sid, label: variantName(P.eu!.series.find(s => s.id === sid)!.variant, L), pts: rs[i] ?? [] })).filter(v => v.pts.length > 1);
      setVariants(out.slice(0, 1).concat(out.slice(1).sort((a, b) => b.pts.length - a.pts.length).slice(0, 2))); setVi(0);
    });
    return () => { alive = false; };
  }, [P, cc, L]);
  const nm = P ? P.name[L] : '';
  const cw = Math.min(width, 700) - 32 - 28;
  const ccs = useMemo(() => { const k = P?.eu ? Object.keys(P.eu.latest) : []; if (cc && !k.includes(cc)) k.push(cc); return k.sort((a, b) => countryName(a, L).localeCompare(countryName(b, L), L)); }, [P, L, cc]);
  if (!P) return <Screen><Stack.Screen options={{ title: '' }} /><Note>{done ? t('noDataNow') : t('loading')}</Note></Screen>;
  const v = variants[vi], R = v ? v.pts : [], last = R[R.length - 1], prev = R[R.length - 2];
  const yago = last ? R.reduce<[string, number] | null>((b, p) => { const d = Math.abs(Date.parse(p[0]) - (Date.parse(last[0]) - 364 * DAY)); return d <= 10 * DAY && (!b || d < Math.abs(Date.parse(b[0]) - (Date.parse(last[0]) - 364 * DAY))) ? p : b; }, null) : null;
  const stale = last ? Date.now() - Date.parse(last[0]) > 42 * DAY : false;
  const cmp = ccs.filter(k => P.eu?.latest[k]).map(k => ({ k, x: P.eu!.latest[k] })).sort((a, b) => b.x.v - a.x.v), mx = Math.max(0.01, ...cmp.map(z => z.x.v));
  // precio percibido: estacionalidad de los 10 últimos años completos
  let season: { m: number; v: number | null }[] = [], pLast: [string, number] | null = null, pYear: [string, number] | null = null, dead = false, ya = 0, yb = 0;
  if (isES && perc && perc.length > 24) {
    pLast = perc[perc.length - 1]; const ly = (+pLast[0].slice(0, 4) - 1) + pLast[0].slice(4); pYear = perc.find(p => p[0] === ly) ?? null;
    dead = Date.now() - Date.parse(pLast[0] + '-15') > 400 * DAY; yb = +pLast[0].slice(0, 4) - 1; ya = yb - 9;
    const acc = Array.from({ length: 12 }, () => [0, 0]);
    perc.forEach(p => { const y = +p[0].slice(0, 4); if (y >= ya && y <= yb) { const m = +p[0].slice(5, 7) - 1; acc[m][0] += p[1]; acc[m][1]++; } });
    season = acc.map((a, m) => ({ m, v: a[1] ? a[0] / a[1] : null }));
  }
  const sMax = Math.max(0.01, ...season.map(x => x.v ?? 0)), curM = new Date().getMonth();
  const MON = { es: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], en: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], fr: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], it: ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'] }[L];
  // cultivos
  let crop: { camp: string; prev: string | null; prov: boolean; tot: any; totP: any; fr: any; ind: any; gl: any; top: [string, number][] } | null = null;
  if (isES && crops && P.crops) {
    const camps = Object.keys(crops.campaigns).sort(), cy = camps[camps.length - 1], cp = camps.length > 1 ? camps[camps.length - 2] : null, ex = P.crops.extra ?? {};
    const f = (camp: string | null, code?: string) => (camp && code ? crops.campaigns[camp].crops.find(x => x.c === code) : undefined);
    const tot = f(cy, P.crops.code);
    if (tot && tot.t[4]) crop = { camp: cy, prev: cp, prov: crops.campaigns[cy].status === 'provisional', tot, totP: f(cp, P.crops.code), fr: f(cy, ex.fresh), ind: f(cy, ex.ind), gl: f(cy, ex.glass),
      top: Object.keys(tot.v).filter(k => tot.v[k] && tot.v[k][4]).map(k => [k, tot.v[k][4] as number] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 10) };
  }
  const tons = (x: number) => (x >= 100000 ? num(x / 1000, L, 0) + ' ' + t('fvThousandT') : num(x, L, 0) + ' t');
  const chg = (a: number, b: number | null | undefined) => (b ? ' (' + pct((a / b - 1) * 100, L) + ')' : '');
  return (
    <Screen>
      <Stack.Screen options={{ title: nm }} />
      <Text style={{ fontSize: 28, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{P.emoji} {nm}</Text>
      {ccs.length ? <>
        <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600' }}>{t('fvCountry')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {ccs.map(k => (
            <Pressable key={k} onPress={() => setCc(k)} accessibilityRole="button" accessibilityState={{ selected: k === cc }}
              style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: k === cc ? C.accent : C.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: k === cc ? C.accentInk : C.text }}>{countryName(k, L)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <SectionTitle>{t('fvWeek')}</SectionTitle>
        {!ref ? <Note>{t('fvNoEuC', countryName(cc, L))}</Note> : ref && last ? <Card>
          <Row first title={t('fvWeekOf', nm, countryName(cc, L), v.label, stageName(ref.stage, L), fmtDate(last[0], L))} right={num(last[1], L, 2) + ' €/kg'} />
          {prev ? <Row title={t('fvPrevWeek')} right={num(prev[1], L, 2) + ' €/kg'} rightSub={pct((last[1] / prev[1] - 1) * 100, L)} /> : null}
          {yago ? <Row title={t('fvYearAgo')} right={num(yago[1], L, 2) + ' €/kg'} rightSub={pct((last[1] / yago[1] - 1) * 100, L)} /> : null}
        </Card> : <Note>{t('loading')}</Note>}
        {stale && last ? <Note>{t('fvStale', fmtDate(last[0], L))}</Note> : null}
        {variants.length > 1 ? <><Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600' }}>{t('fvType')}</Text>
          <Segmented options={variants.map((x, i) => ({ value: String(i), label: x.label }))} value={String(vi)} onChange={s => setVi(+s)} /></> : null}
        {R.length > 1 ? <RangeChart key={cc + vi} points={R} unit="€/kg" label={nm} width={cw} /> : null}
        <Text style={{ fontSize: 12, color: C.textMuted }}>{t('fvHow')}</Text>
        {cmp.length > 1 ? <>
          <SectionTitle>{t('fvOthers', countryName(cc, L))}</SectionTitle>
          <Card>{cmp.map(z => { const old = Date.now() - Date.parse(z.x.d) > 60 * DAY; return <Bar key={z.k} label={countryName(z.k, L)} value={num(z.x.v, L, 2) + ' €/kg'} sub={`${variantName(z.x.variant, L)}, ${stageName(z.x.stage, L)} · ${fmtDate(z.x.d, L)}${old ? ' · ' + t('fvOld') : ''}`} frac={z.x.v / mx} strong={z.k === cc} muted={old} />; })}</Card>
        </> : null}
      </> : <Note>{t('fvNoEu')}</Note>}
      {pLast ? <>
        <SectionTitle>{t('fvPerc')}</SectionTitle>
        <Card>
          <Row first title={t('fvPercNow', fmtDate(pLast[0], L))} right={num(pLast[1], L, 2) + ' €/kg'} />
          {pYear ? <Row title={t('fvPercY')} right={num(pYear[1], L, 2) + ' €/kg'} rightSub={pct((pLast[1] / pYear[1] - 1) * 100, L)} /> : null}
        </Card>
        {dead ? <Note>{t('fvPercOld', fmtDate(pLast[0], L))}</Note> : null}
        <Text style={{ fontSize: 12, color: C.textMuted }}>{t('fvPercHow')}</Text>
        {season.filter(x => x.v != null).length >= 6 ? <Card style={{ padding: 14, gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{t('fvSeason', ya, yb)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 }} accessible accessibilityLabel={t('fvSeason', ya, yb)}>
            {season.map(x => (
              <View key={x.m} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <View style={{ width: '80%', height: Math.max(x.v == null ? 0 : 2, ((x.v ?? 0) / sMax) * 90), borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: C.accent, opacity: x.m === curM && !dead ? 1 : 0.45 }} />
                <Text style={{ fontSize: 10.5, color: C.textMuted, marginTop: 3 }}>{MON[x.m]}</Text>
              </View>
            ))}
          </View>
        </Card> : null}
        {perc && perc.length > 1 ? <RangeChart points={perc} unit="€/kg" label={t('fvPerc')} width={cw} /> : null}
      </> : null}
      {!isES && cc ? (() => {
        const fm = farm?.products[P.id]?.[cc], ix = fm?.idx, ab = fm?.abs;
        const note = (n?: string | null) => (n ? <Text style={{ fontSize: 12, color: C.textMuted }}>{t('fvFSer', ({ 'Antillas francesas': ['Antillas francesas', 'French West Indies', 'Antilles françaises', 'Antille francesi'], 'Córcega': ['Córcega', 'Corsica', 'Corse', 'Corsica'], invernadero: ['invernadero', 'under glass', 'sous serre', 'in serra'], 'aire libre': ['aire libre', 'in the open', 'plein champ', 'pieno campo'] } as Record<string, string[]>)[n]?.[['es', 'en', 'fr', 'it'].indexOf(L)] ?? n)}</Text> : null);
        const plab = (p: string) => (/^\d{4}-Q\d$/.test(p) ? (L === 'en' ? 'Q' : 'T') + p.slice(6) + ' ' + p.slice(0, 4) : fmtDate(p, L));
        const il = ix ? ix.pts[ix.pts.length - 1] : null, iyKey = il ? (+il[0].slice(0, 4) - 1) + il[0].slice(4) : '', iy = ix ? ix.pts.find(p => p[0] === iyKey) ?? null : null;
        const ap = ab ? ab.pts.map(p => [p[0], p[1] / 100] as [string, number]) : [], al = ap[ap.length - 1], apv = ap.length > 1 && +ap[ap.length - 2][0] === +al[0] - 1 ? ap[ap.length - 2] : null, amx = Math.max(0.01, ...ap.slice(-8).map(p => p[1]));
        return <>
          <SectionTitle>{t('fvFarm', countryName(cc, L))}</SectionTitle>
          {!ix && !ab ? <Note>{t('fvFNone', countryName(cc, L))}</Note> : null}
          {ix && il ? <>
            <Card>
              <Row first title={t('fvFIdx', plab(il[0]))} right={num(il[1], L, 1)} rightSub="2020 = 100" />
              {iy ? <Row title={t('fvFIdxY')} right={num(iy[1], L, 1)} rightSub={pct((il[1] / iy[1] - 1) * 100, L)} /> : null}
            </Card>
            <Text style={{ fontSize: 12, color: C.textMuted }}>{t('fvFIdxHow')}</Text>
            {note(ix.note)}
            <RangeChart key={'fi' + cc} points={ix.pts} unit="2020 = 100" label={t('fvFarm', countryName(cc, L))} width={cw} />
          </> : null}
          {ab && al ? <>
            <Card>
              <Row first title={t('fvFAbs', al[0])} right={num(al[1], L, 2) + ' €/kg'} />
              {apv ? <Row title={t('fvFAbsY', apv[0])} right={num(apv[1], L, 2) + ' €/kg'} rightSub={pct((al[1] / apv[1] - 1) * 100, L)} /> : null}
            </Card>
            <Card>{ap.slice(-8).reverse().map((p, i) => <Bar key={p[0]} label={p[0]} value={num(p[1], L, 2) + ' €/kg'} frac={p[1] / amx} strong={i === 0} />)}</Card>
            <Text style={{ fontSize: 12, color: C.textMuted }}>{t('fvFAbsHow')}</Text>
            {note(ab.note)}
          </> : null}
          {ix || ab ? <Text style={{ fontSize: 12, color: C.textMuted }}>{ix?.src === 'insee' ? t('fvFSrcI') : t('fvFSrcE')}</Text> : null}
        </>;
      })() : null}
      {crop ? <>
        <SectionTitle>{t('fvCrop', crop.camp)}</SectionTitle>
        <Card>
          <Row first title={t('fvProd')} right={tons(crop.tot.t[4])} rightSub={crop.totP?.t[4] ? t('fvPrevCamp', crop.prev ?? '') + ': ' + tons(crop.totP.t[4]) + chg(crop.tot.t[4], crop.totP.t[4]) : undefined} />
          {crop.tot.t[0] ? <Row title={t('fvArea')} right={num(crop.tot.t[0], L, 0) + ' ha'} rightSub={crop.totP?.t[0] ? pct((crop.tot.t[0] / crop.totP.t[0] - 1) * 100, L) : undefined} /> : null}
          {crop.tot.t[3] ? <Row title={t('fvYield')} right={num(crop.tot.t[4] / crop.tot.t[3], L, crop.tot.t[4] / crop.tot.t[3] < 10 ? 1 : 0) + ' t/ha'} /> : null}
          {crop.fr?.t[4] ? <Row title={t('fvFresh')} right={num(crop.fr.t[4] / crop.tot.t[4] * 100, L, 0) + ' %'} /> : null}
          {crop.ind?.t[4] ? <Row title={t('fvInd')} right={num(crop.ind.t[4] / crop.tot.t[4] * 100, L, 0) + ' %'} /> : null}
          {crop.gl?.t[4] && crop.fr?.t[4] ? <Row title={t('fvGlass')} right={num(crop.gl.t[4] / crop.fr.t[4] * 100, L, 0) + ' %'} /> : null}
        </Card>
        {crop.top.length ? <>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{t('fvTopProv')}</Text>
          <Card>{crop.top.map(([k, val], i) => <Bar key={k} label={crops!.provinces[k] ?? k} value={tons(val)} sub={num(val / crop!.tot.t[4] * 100, L, 0) + ' %'} frac={val / crop!.top[0][1]} strong={i === 0} />)}</Card>
        </> : null}
        {crop.prov ? <Text style={{ fontSize: 12, color: C.textMuted }}>{t('fvProvisional')}</Text> : null}
      </> : null}
      <Text style={{ fontSize: 12, color: C.textMuted }}>{isES ? t('fvSources') : t('fvSourcesX')}</Text>
    </Screen>
  );
}
