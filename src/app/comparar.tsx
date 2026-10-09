import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle, s } from '../components/ui';
import { C } from '../lib/theme';
import { num, pct } from '../lib/format';
import { norm } from '../lib/logic';
import { loadPriceHistory } from '../lib/api';

type Pts = [string, number][];
const COLORS = ['#1f6b43', '#b03a2e', '#2b6cb0', '#c07f12'];
const RANGES = [{ k: '6m', m: 6 }, { k: '1y', m: 12 }, { k: '3y', m: 36 }, { k: '5y', m: 60 }, { k: '10y', m: 120 }, { k: 'max', m: 0 }];
function ts(p: string): number {
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p); if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{4})-(\d{2})$/.exec(p); if (m) return Date.UTC(+m[1], +m[2] - 1, 15);
  m = /^(\d{4})/.exec(p); return m ? Date.UTC(+m[1], 6, 1) : NaN;
}
function addMonths(t: number, n: number) { const d = new Date(t); d.setUTCMonth(d.getUTCMonth() - n); return d.getTime(); }

export default function Comparar() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const { data, user, t } = useApp();
  const { width } = useWindowDimensions();
  const L = user.lang;
  const [sel, setSel] = useState<string[]>(() => (ids ? String(ids).split(',').filter(x => data.prices.some(p => p.id === x)).slice(0, 4) : []));
  const [q, setQ] = useState('');
  const [range, setRange] = useState('1y');
  const [hist, setHist] = useState<Record<string, Pts>>({});
  useEffect(() => {
    let alive = true;
    sel.forEach(id => {
      if (hist[id]) return;
      const p = data.prices.find(x => x.id === id); if (!p) return;
      loadPriceHistory(id, p.date).then(h => { if (alive) setHist(o => ({ ...o, [id]: h && h.length >= p.points.length ? h : p.points })); });
    });
    return () => { alive = false; };
  }, [sel]);
  const found = useMemo(() => {
    const k = norm(q.trim());
    return data.prices.filter(p => !sel.includes(p.id) && (!k || norm(`${p.name[L]} ${p.place[L]} ${p.name.es} ${p.product}`).includes(k))).slice(0, k ? 30 : 12);
  }, [q, sel, data.prices, L]);
  const series = sel.map((id, i) => {
    const p = data.prices.find(x => x.id === id)!; const all = hist[id] ?? p.points;
    return { id, p, color: COLORS[i % 4], all };
  });
  const lastTs = series.length ? Math.max(...series.map(x => ts(x.all[x.all.length - 1][0]))) : 0;
  const cur = RANGES.find(r => r.k === range) ?? RANGES[1];
  const lines = series.map(sr => {
    const cut = cur.m ? addMonths(lastTs, cur.m) : -Infinity;
    const pts = sr.all.filter(x => ts(x[0]) >= cut);
    const base = pts[0]?.[1];
    return { ...sr, pts: pts.map(x => ({ t: ts(x[0]), v: base ? x[1] / base * 100 : NaN })).filter(x => isFinite(x.v)) };
  });
  const usable = lines.filter(l => l.pts.length > 1);
  const w = width - 32 - 28, h = 190, pad = 8;
  const allV = usable.flatMap(l => l.pts.map(x => x.v)), allT = usable.flatMap(l => l.pts.map(x => x.t));
  const mn = Math.min(...allV), mx = Math.max(...allV), t0 = Math.min(...allT), t1 = Math.max(...allT);
  const X = (tt: number) => pad + (tt - t0) / ((t1 - t0) || 1) * (w - 2 * pad), Y = (v: number) => pad + (1 - (v - mn) / ((mx - mn) || 1)) * (h - 2 * pad);
  const name = (k: string) => k === 'max' ? t('rangeMax') : k.endsWith('m') ? `${k.slice(0, -1)}${t('rangeM')}` : `${k.slice(0, -1)}${t('rangeY')}`;
  return (
    <Screen>
      <Stack.Screen options={{ title: t('compare') }} />
      <Note>{t('compareHint')}</Note>
      {series.length ? (
        <Card>
          {series.map((sr, i) => (
            <Row key={sr.id} first={i === 0} title={sr.p.name[L]} sub={`${sr.p.place[L]} · ${sr.p.unit[L]}`} right={num(sr.p.value, L)} rightSub={t('compareRemove')} rightColor={sr.color}
              onPress={() => setSel(sel.filter(x => x !== sr.id))} />
          ))}
        </Card>
      ) : <Note>{t('compareEmpty')}</Note>}
      {series.length >= 2 ? (
        <Card style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {RANGES.map(r => { const on = r.k === cur.k; return (
              <Pressable key={r.k} onPress={() => setRange(r.k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 14, backgroundColor: on ? C.accent : C.surfaceAlt }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: on ? C.accentInk : C.text }}>{name(r.k)}</Text>
              </Pressable>); })}
          </View>
          {usable.length >= 2 ? (
            <>
              <Text style={{ fontSize: 12, color: C.textMuted }}>{t('compareIndex')} · {t('min')} {num(mn, L, 0)} · {t('max')} {num(mx, L, 0)}</Text>
              <Svg width={w} height={h} accessibilityLabel={t('compare')}>
                <Line x1={0} y1={h - 1} x2={w} y2={h - 1} stroke={C.border} strokeWidth={1} />
                {mn < 100 && mx > 100 ? <Line x1={0} y1={Y(100)} x2={w} y2={Y(100)} stroke={C.border} strokeWidth={1} strokeDasharray="4 4" /> : null}
                {usable.map(l => <Path key={l.id} d={l.pts.map((x, i) => `${i ? 'L' : 'M'}${X(x.t).toFixed(1)} ${Y(x.v).toFixed(1)}`).join(' ')} stroke={l.color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />)}
              </Svg>
              {lines.map(l => (
                <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: l.color }} />
                  <Text style={{ flex: 1, fontSize: 13, color: C.text }} numberOfLines={1}>{l.p.name[L]} · {l.p.place[L]}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{l.pts.length > 1 ? pct(l.pts[l.pts.length - 1].v - 100, L) : '—'}</Text>
                </View>
              ))}
            </>
          ) : <Note>{t('compareNoOverlap')}</Note>}
        </Card>
      ) : null}
      <SectionTitle>{t('compareAdd')}</SectionTitle>
      {sel.length >= 4 ? <Note>{t('compareFull')}</Note> : (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder={t('search')} placeholderTextColor={C.textMuted} accessibilityLabel={t('search')}
            style={[s.input, { borderRadius: 28, paddingHorizontal: 16, backgroundColor: C.surfaceAlt, borderWidth: 0 }]} />
          <Card>{found.map((p, i) => <Row key={p.id} first={i === 0} title={p.name[L]} sub={`${p.place[L]} · ${p.unit[L]}`} right="+" onPress={() => { setSel([...sel, p.id]); setQ(''); }} />)}</Card>
        </>
      )}
    </Screen>
  );
}
