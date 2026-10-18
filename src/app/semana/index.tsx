// «La semana en cada país» (como semana.html de la web): por país (España, Francia, Italia, Alemania, EE. UU.) y semana, cuántos datos llegaron,
// qué precios se movieron más y qué titulares publicaron sus medios agrarios. La prosa sale solo de las cifras del fichero; no se interpreta nada.
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Note, SectionTitle } from '../../components/ui';
import { Chips } from '../../components/Chips';
import { C, changeColor } from '../../lib/theme';
import { date as fmtDate } from '../../lib/format';
import { webJson } from '../../lib/fv';
import { SW } from '../../lib/semanaText';
import { loadGloss } from '../../lib/gloss';
import { tl } from '../../lib/labelTl';
import { flag } from '../../lib/tx';
import { CountrySelect } from '../../components/CountryPicker';

const CCS = ['ES', 'FR', 'IT', 'DE', 'US'];
type Wk = { week: string; from: string; to: string; complete: boolean; updates: number; news: number };
type Mv = { id: string; label: string; unit: string; period: string; value: number; prevPeriod?: string; prevValue?: number; changePct: number | null };
type Doc = { country: string; week: string; from: string; to: string; complete: boolean; coverage: { from: string }; totals: { updates: number; byBlock: Record<string, number>; newSeries: number; news: number }; movers: Mv[]; releases: Mv[]; news: { date: string; source: string; lang?: string; h: string; url: string }[] };
const fill = (s: string, o: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_m, k) => (o[k] != null ? String(o[k]) : ''));

export default function Semana() {
  const { user } = useApp();
  const L = user.lang, t = SW.T[L] ?? SW.T.es;
  const [idx, setIdx] = useState<Record<string, Wk[]> | null>(null);
  const { c: pc } = useLocalSearchParams<{ c?: string }>();
  const [cc, setCc] = useState(pc && CCS.includes(String(pc)) ? String(pc) : CCS.includes(user.market) ? user.market : 'ES');
  const [wk, setWk] = useState<string | null>(null);
  const [doc, setDoc] = useState<Doc | null | undefined>(undefined);
  const [, setGl] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { webJson('data/blog/countries/index.json', 3 * 3600e3).then((d: any) => setIdx(d?.countries ?? {})); }, []);
  useEffect(() => { loadGloss(L).then(() => setGl(g => !g)); }, [L]);
  const weeks = idx?.[cc] ?? [];
  const w = weeks.find(x => x.week === wk) ?? weeks[0];
  useEffect(() => { if (!w) { setDoc(idx ? null : undefined); return; } setDoc(undefined); webJson('data/blog/countries/' + cc + '/' + w.week + '.json', w.complete ? 7 * 24 * 3600e3 : 3 * 3600e3).then(d => setDoc(d ?? null)); }, [cc, w?.week, idx]);
  const num = (v: number | null | undefined) => { if (v == null || isNaN(v)) return '–'; const a = Math.abs(v), d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 2 : 3; return Number(v).toLocaleString(L, { maximumFractionDigits: d }); };
  const pct = (v: number | null | undefined) => { if (v == null || isNaN(v)) return '–'; const s = (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(Math.round(v * 10) / 10)) + ' %'; return L === 'en' ? s.replace(' %', '%') : s; };
  const per = (p?: string) => (p && /^\d{4}-\d\d-\d\d$/.test(p) ? fmtDate(p, L) : p ?? '');
  const lab = (l: string) => tl(l, L);
  const cname = (c: string) => SW.NAME[c]?.[L] ?? c, tab = (c: string) => (SW.TAB[c] ?? SW.NAME[c])?.[L] ?? c;
  let paras: string[] = [];
  if (doc) {
    const tt = doc.totals, c = cname(doc.country), m = SW.MEDIA[doc.country]?.[L] ?? '';
    const parts = ['precios', 'produccion', 'comercio', 'costes', 'otros'].filter(k => tt.byBlock[k]).map(k => fill(t.parts[k], { n: num(tt.byBlock[k]) }));
    paras.push(tt.updates ? fill(t.p1, { n: num(tt.updates), c, parts: parts.join(', ') }) : fill(t.p1none, { c }));
    if (tt.newSeries) paras.push(fill(t.p1new, { n: num(tt.newSeries) }));
    const mv = doc.movers;
    if (mv.length) {
      paras.push(fill(t.p2, { l: lab(mv[0].label), v: num(mv[0].value) + ' ' + mv[0].unit, ch: pct(mv[0].changePct), pp: per(mv[0].prevPeriod) }));
      if (mv.length > 2) paras.push(fill(t.p2b, { l2: lab(mv[1].label), ch2: pct(mv[1].changePct), l3: lab(mv[2].label), ch3: pct(mv[2].changePct) }));
      else if (mv.length > 1) paras.push(fill(t.p2b1, { l2: lab(mv[1].label), ch2: pct(mv[1].changePct) }));
    }
    paras.push(tt.news ? fill(t.p3, { m, n: num(tt.news) }) : fill(t.p3none, { m }));
  }
  const Fold = ({ k, title, desc, children }: { k: string; title: string; desc: string; children: React.ReactNode }) => (
    <View>
      <Pressable onPress={() => setOpen(o => ({ ...o, [k]: !o[k] }))} accessibilityRole="button" accessibilityState={{ expanded: !!open[k] }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{title}</Text>
          <Text style={{ fontSize: 12.5, color: C.textMuted }}>{desc}</Text>
        </View>
        <Text style={{ fontSize: 18, color: C.textMuted }}>{open[k] ? '▴' : '▾'}</Text>
      </Pressable>
      {open[k] ? children : null}
    </View>
  );
  const rows = (list: Mv[], withPrev: boolean) => (
    <Card>{list.map((r, i) => (
      <View key={r.id + i} style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.border, gap: 2 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: C.text }}>{lab(r.label)}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 13, color: C.textMuted }}>{per(r.period)}{withPrev && r.prevValue != null ? ' · ' + t.prev.toLowerCase() + ' ' + num(r.prevValue) : ''}</Text>
          <Text style={{ fontSize: 14, fontVariant: ['tabular-nums'], color: C.text }}>{num(r.value)} <Text style={{ color: C.textMuted, fontSize: 12 }}>{r.unit}</Text>  <Text style={{ color: r.changePct == null ? C.textMuted : changeColor(r.changePct), fontWeight: '700' }}>{pct(r.changePct)}</Text></Text>
        </View>
      </View>
    ))}</Card>
  );
  const m = doc ? SW.MEDIA[doc.country]?.[L] ?? '' : '';
  return (
    <Screen>
      <Stack.Screen options={{ title: t.h1 }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{t.h1}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{t.sub}</Text>
      {!idx ? <Note>{t.loading}</Note> : <>
        <CountrySelect items={CCS.map(c => ({ value: c, label: tab(c), flag: flag(c) }))} value={cc} onChange={v => { setCc(v); setWk(null); setOpen({}); }} />
        {weeks.length > 1 ? <Chips items={weeks.map(x => ({ value: x.week, label: fmtDate(x.from, L) + (x.complete ? '' : ' ·') }))} value={w?.week ?? ''} onChange={v => { setWk(v); setOpen({}); }} /> : null}
        {!w ? <Note>{t.none}</Note> : doc === undefined ? <Note>{t.loading}</Note> : doc === null ? <Note>{t.err}</Note> : <>
          <Card style={{ padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{fill(t.head, { c: tab(doc.country) })}</Text>
            <Text style={{ fontSize: 12.5, color: C.textMuted }}>{fill(t.week, { a: fmtDate(doc.from, L), b: fmtDate(doc.to, L) })} · {doc.complete ? t.closed : t.open}</Text>
            {paras.map((p, i) => <Text key={i} style={{ fontSize: 15, lineHeight: 22, color: C.text }}>{p}</Text>)}
            {doc.coverage.from > doc.from ? <Text style={{ fontSize: 12, color: C.textMuted }}>{fill(t.cov, { d: fmtDate(doc.coverage.from, L) })}</Text> : null}
          </Card>
          {doc.movers.length ? <Fold k="mv" title={t.movers} desc={t.moversD}>{rows(doc.movers, true)}</Fold> : null}
          {doc.releases.length ? <Fold k="rl" title={t.releases} desc={t.releasesD}>{rows(doc.releases, false)}</Fold> : null}
          {doc.news.length ? <Fold k="nw" title={t.news} desc={fill(t.newsD, { m: m.charAt(0).toUpperCase() + m.slice(1) })}>
            <Card>{doc.news.map((n, i) => (
              <Pressable key={i} onPress={() => Linking.openURL(n.url)} accessibilityRole="link" style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                <Text style={{ fontSize: 14.5, color: C.accent, fontWeight: '600' }}>{n.h}</Text>
                <Text style={{ fontSize: 12, color: C.textMuted }}>{n.source} · {fmtDate(n.date, L)}{n.lang && n.lang !== L ? ' · ' + t.lang + ': ' + n.lang.toUpperCase() : ''}</Text>
              </Pressable>
            ))}</Card>
          </Fold> : null}
          <SectionTitle action={fill(t.more, { c: tab(doc.country) })} onAction={() => router.push({ pathname: '/pais/[code]', params: { code: doc.country } })}>{' '}</SectionTitle>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{t.note}</Text>
        </>}
      </>}
    </Screen>
  );
}
