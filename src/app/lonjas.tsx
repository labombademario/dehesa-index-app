// Lonjas y mercados locales (como lonjas.html de la web): precios semanales por provincia, zona o puerto que publica la Comisión Europea
// para cereales (todos los países de la UE con mercados, desde 2026/27), aceite de oliva y oleaginosas. Nada se promedia ni se mezcla.
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note, SectionTitle } from '../components/ui';
import { Chips } from '../components/Chips';
import { RangeChart } from '../components/RangeChart';
import { C, changeColor } from '../lib/theme';
import { num, pct, date as fmtDate } from '../lib/format';
import { webJson, countryName } from '../lib/fv';
import { LJ } from '../lib/lonjasNames';
import { SourceCite } from '../components/SourceCite';
import { tx, fill, flag } from '../lib/tx';
import { CountrySelect } from '../components/CountryPicker';
import { param } from '../lib/safe';

type Reg = { c: string; m?: string; last: [string, number]; prev?: [string, number] | null; yoy?: [string, number] | null };
type Ser = { id: string; parts: string[]; unit: string; regions: Reg[] };
const LI = { es: 0, en: 1, fr: 2, it: 3 } as const;
const FAM = { cereales: { es: 'Cereales', en: 'Cereals', fr: 'Céréales', it: 'Cereali' }, aceite: { es: 'Aceite de oliva', en: 'Olive oil', fr: 'Huile d’olive', it: 'Olio d’oliva' }, oleaginosas: { es: 'Oleaginosas', en: 'Oilseeds', fr: 'Oléagineux', it: 'Semi oleosi' } };
const day = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const isNat = (m?: string) => !m || /national|nacional/i.test(m);
const clean = (m: string) => { const n = String(m).replace(/\s*\([A-Z]{2}[A-Z0-9]{1,5}\)/, '').trim(); return LJ.ACC[n] ?? LJ.ZONE[n] ?? n; };
function pctIf(a: number, b: [string, number] | null | undefined, want: number, da: string): number | null { if (!b || !b[1] || Math.abs(Math.abs(day(da) - day(b[0])) - want) > 6) return null; return (a / b[1] - 1) * 100; }

export default function Lonjas() {
  const { user, t } = useApp();
  const L = user.lang, li = LI[L];
  const { width } = useWindowDimensions();
  const rp = useLocalSearchParams<{ c?: string }>();   // parámetros saneados: un valor raro (p. ej. desde dehesaindex://) cuenta como no encontrado
  const pc = param(rp.c, 'cc') || undefined;
  const [cc, setCc] = useState<string>(pc && LJ.CTRY[String(pc)] ? String(pc) : LJ.CTRY[user.market] ? user.market : 'ES');
  const [fam, setFam] = useState<string>('cereales');
  const [data, setData] = useState<Record<string, { series: Ser[] } | null>>({});
  const [sid, setSid] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pts, setPts] = useState<[string, number][] | null>(null);
  const fams = LJ.CTRY[cc];
  useEffect(() => { if (!fams.includes(fam)) setFam(fams[0]); }, [cc]);
  useEffect(() => { if (data[fam] === undefined) webJson('data/eu/' + fam + '.json', 6 * 3600e3).then(d => setData(o => ({ ...o, [fam]: d }))); }, [fam]);
  const wd = (w: string) => { const x = LJ.WORDS[w]; return x ? x.split('|')[li] || x.split('|')[0] : w; };
  // cereales: producto + fase comercial (desde 2026/27 cada país publica sus mercados en fases distintas)
  const cerTitle = (parts: string[]) => { const p = LJ.CPROD[parts[0]]; if (!p) return null; const st = LJ.CSTAGE.find(x => String(parts[1] ?? '').startsWith(x[0])); return p[li] + (st ? ', ' + st[1][li] : ''); };
  const title = (s: Ser) => { if (fam === 'cereales') { const c = cerTitle(s.parts); if (c) return c; } const e = (LJ.SER[fam] ?? []).find(x => s.id.startsWith(x[0])); return e ? e[1][li] : s.parts.map(wd).join(' · '); };
  const marketsOf = (s: Ser) => {
    const rs = s.regions.filter(r => r.c === cc); let ref = ''; rs.forEach(r => { if (r.last[0] > ref) ref = r.last[0]; });
    let nat: Reg | null = null; const by: Record<string, Reg> = {};
    rs.forEach(r => { if (isNat(r.m)) { if (!nat || r.last[0] > nat.last[0]) nat = r; return; } const k = clean(r.m!); if (!by[k] || r.last[0] > by[k].last[0]) by[k] = r; });
    const all = Object.keys(by).map(k => ({ name: k, r: by[k] }));
    return { nat: nat as Reg | null, ref, cur: all.filter(x => day(ref) - day(x.r.last[0]) <= 28).sort((a, b) => b.r.last[1] - a.r.last[1]), old: all.filter(x => day(ref) - day(x.r.last[0]) > 28) };
  };
  const list = useMemo(() => {
    const d = data[fam]; if (!d) return [] as Ser[];
    const PORD = ['Milling wheat', 'Feed maize', 'Feed barley', 'Durum wheat', 'Feed wheat', 'Malting barley', 'Milling rye', 'Feed rye', 'Feed oats', 'Milling oats', 'Triticale', 'Wheat bran'];
    const order = (LJ.SER[fam] ?? []).map(x => x[0]), rank = (s: Ser) => { if (fam === 'cereales') { const k = PORD.indexOf(s.parts[0]); return k < 0 ? 99 : k; } const i = order.findIndex(o => s.id.startsWith(o)); return i < 0 ? 99 : i; };
    return d.series.filter(s => marketsOf(s).cur.length).sort((a, b) => rank(a) - rank(b) || marketsOf(b).cur.length - marketsOf(a).cur.length);
  }, [data, fam, cc]);
  const s = list.find(x => x.id === sid) ?? list[0];
  const M = s ? marketsOf(s) : null, dec = s && s.unit.includes('/t') && !s.unit.includes('100') ? 1 : 2;
  useEffect(() => { setOpen(null); setPts(null); }, [s?.id, cc]);
  const want = useRef<string | null>(null);
  const show = (name: string, r: Reg) => {
    if (open === name) { setOpen(null); return; }
    setOpen(name); setPts(null); want.current = name;
    webJson('data/eu/' + fam + '/' + s!.id + '.json', 6 * 3600e3).then((d: any) => {
      if (want.current !== name) return;   // ya se abrió otro mercado: esta respuesta llega tarde
      const reg = d?.regions?.find((x: any) => x.c === r.c && (x.m ?? '') === (r.m ?? ''));
      const ep = Date.parse((d?.epoch ?? '2000-01-01') + 'T00:00:00Z');
      setPts(reg ? (reg.d as number[]).map((dd, i) => [new Date(ep + dd * 864e5).toISOString().slice(0, 10), reg.v[i] as number] as [string, number]) : []);
    });
  };
  const cw = Math.min(width, 700) - 32 - 28;
  const row = (x: { name: string; r: Reg }, i: number, muted?: boolean) => {
    const w = pctIf(x.r.last[1], x.r.prev, 7, x.r.last[0]), y = pctIf(x.r.last[1], x.r.yoy, 364, x.r.last[0]);
    const lab = LJ.ZONE[x.name] ? x.name + ' (' + tx(L, { es: 'zona', en: 'area', fr: 'zone', it: 'zona' }) + ')' : x.name;
    return (
      <View key={x.name}>
        <Pressable onPress={() => show(x.name, x.r)} accessibilityRole="button" accessibilityState={{ expanded: open === x.name }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '600', color: muted ? C.textMuted : C.text }}>{lab}</Text>
            <Text style={{ fontSize: 12, color: C.textMuted }}>{fmtDate(x.r.last[0], L)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: muted ? C.textMuted : C.text, fontVariant: ['tabular-nums'] }}>{num(x.r.last[1], L, dec)} <Text style={{ fontSize: 11.5, fontWeight: '400', color: C.textMuted }}>{s!.unit}</Text></Text>
            <Text style={{ fontSize: 12, fontVariant: ['tabular-nums'] }}>
              <Text style={{ color: w == null ? C.textMuted : changeColor(w) }}>{w == null ? '–' : pct(w, L)}</Text>
              <Text style={{ color: C.textMuted }}> {tx(L, { es: 'sem.', en: 'wk', fr: 'sem.', it: 'sett.' })} · </Text>
              <Text style={{ color: y == null ? C.textMuted : changeColor(y) }}>{y == null ? '–' : pct(y, L)}</Text>
              <Text style={{ color: C.textMuted }}> {tx(L, { es: 'año', en: 'yr', fr: 'an', it: 'anno' })}</Text>
            </Text>
          </View>
        </Pressable>
        {open === x.name ? <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {pts == null ? <Note>{t('loading')}</Note> : pts.length > 1 ? <RangeChart key={x.name} points={pts} unit={s!.unit} label={lab} width={cw - 8} /> : <Note>{t('noDataNow')}</Note>}
        </View> : null}
      </View>
    );
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: tx(L, { es: 'Lonjas', en: 'Local markets', fr: 'Marchés locaux', it: 'Piazze locali' }) }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{tx(L, { es: 'Lonjas y mercados locales', en: 'Local markets', fr: 'Marchés locaux', it: 'Piazze e mercati locali' })}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{tx(L, { es: 'Precio semanal de cada provincia, zona o puerto que publica la Comisión Europea. No se promedia ni se mezcla. Toca un mercado para ver su gráfico.', en: 'Weekly price for each province, area or port published by the European Commission. Nothing is averaged or mixed. Tap a market to see its chart.', fr: 'Prix hebdomadaire de chaque province, zone ou port publié par la Commission européenne. Rien n’est moyenné ni mélangé. Touchez un marché pour voir son graphique.', it: 'Prezzo settimanale di ogni provincia, zona o porto pubblicato dalla Commissione europea. Niente viene mediato o mescolato. Tocca un mercato per vedere il grafico.' })}</Text>
      <CountrySelect items={Object.keys(LJ.CTRY).sort((a, b) => countryName(a, L).localeCompare(countryName(b, L), L)).map(c => ({ value: c, label: countryName(c, L), flag: flag(c) }))} value={cc} onChange={v => { setCc(v); setSid(null); }} />
      {fams.length > 1 ? <Chips items={fams.map(f => ({ value: f, label: tx(L, (FAM as any)[f]) }))} value={fams.includes(fam) ? fam : fams[0]} onChange={v => { setFam(v); setSid(null); }} /> : null}
      {data[fam] === undefined ? <Note>{t('loading')}</Note> : !s || !M ? <Note>{tx(L, { es: 'No hay mercados con precio para esta selección.', en: 'No markets with a price for this selection.', fr: 'Aucun marché avec un prix pour cette sélection.', it: 'Nessun mercato con prezzo per questa selezione.' })}</Note> : <>
        {list.length > 1 ? <Chips items={list.map(x => ({ value: x.id, label: title(x) }))} value={s.id} onChange={setSid} /> : null}
        <SectionTitle>{title(s)}</SectionTitle>
        <Text style={{ fontSize: 13, color: C.textMuted }}>{fill(tx(L, { es: '{0} mercados con precio · último dato {1}', en: '{0} markets with a price · latest {1}', fr: '{0} marchés avec un prix · dernier {1}', it: '{0} mercati con prezzo · ultimo {1}' }), M.cur.length, fmtDate(M.ref, L))}</Text>
        {M.nat ? <Card>{row({ name: tx(L, { es: 'Media nacional', en: 'National average', fr: 'Moyenne nationale', it: 'Media nazionale' }), r: M.nat }, 0)}</Card> : null}
        <Card>{M.cur.map((x, i) => row(x, i))}</Card>
        {M.old.length ? <>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.textMuted }}>{fill(tx(L, { es: 'Mercados sin precio reciente ({0})', en: 'Markets without a recent price ({0})', fr: 'Marchés sans prix récent ({0})', it: 'Mercati senza prezzo recente ({0})' }), M.old.length)}</Text>
          <Card>{M.old.map((x, i) => row(x, i, true))}</Card>
        </> : null}
      </>}
      <SourceCite sourceId="eu_agrifood" />
    </Screen>
  );
}
