import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, LineChart } from './ui';
import { C } from '../lib/theme';
import { numAuto, pct } from '../lib/format';
import { useApp } from '../lib/store';

type Pts = [string, number][];
const RANGES = [{ k: '6m', m: 6 }, { k: '1y', m: 12 }, { k: '3y', m: 36 }, { k: '5y', m: 60 }, { k: '10y', m: 120 }, { k: 'max', m: 0 }] as const;

/** 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY' | 'YYYY-Qn' -> milisegundos UTC (mes/dia medios cuando faltan) */
function ts(p: string): number {
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p); if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{4})-(\d{2})$/.exec(p); if (m) return Date.UTC(+m[1], +m[2] - 1, 15);
  m = /^(\d{4})-Q([1-4])$/.exec(p); if (m) return Date.UTC(+m[1], +m[2] * 3 - 2, 15);
  m = /^(\d{4})/.exec(p); return m ? Date.UTC(+m[1], 6, 1) : NaN;
}
function addMonths(t: number, n: number): number { const d = new Date(t); d.setUTCMonth(d.getUTCMonth() - n); return d.getTime(); }

export function RangeChart({ points, load, unit, label, width }: { points: Pts; load?: () => Promise<Pts | null>; unit: string; label: string; width: number }) {
  const { user, t } = useApp();
  const L = user.lang;
  const [full, setFull] = useState<Pts | null>(null);
  const [loading, setLoading] = useState(!!load);
  useEffect(() => {
    let alive = true;
    if (!load) return;
    setLoading(true);
    load().then(r => { if (alive) { if (r && r.length) setFull(r); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  const all = full && full.length >= points.length ? full : points;
  const opts = useMemo(() => {
    if (all.length < 2) return [] as { k: string; m: number }[];
    const last = ts(all[all.length - 1][0]), first = ts(all[0][0]);
    return RANGES.filter(r => r.m === 0 || (addMonths(last, r.m) >= first - 31 * 864e5 && all.filter(p => ts(p[0]) >= addMonths(last, r.m)).length >= 2)) as { k: string; m: number }[];
  }, [all]);
  const [sel, setSel] = useState<string | null>(null);
  const cur = opts.find(o => o.k === sel) ?? opts.find(o => o.k === '1y') ?? opts[opts.length - 1];
  const shown = useMemo(() => {
    if (!cur || cur.m === 0) return all;
    const cut = addMonths(ts(all[all.length - 1][0]), cur.m);
    return all.filter(p => ts(p[0]) >= cut);
  }, [all, cur]);
  const vals = shown.map(p => p[1]);
  const mn = vals.length ? Math.min(...vals) : 0, mx = vals.length ? Math.max(...vals) : 0;
  const change = vals.length > 1 && vals[0] !== 0 ? (vals[vals.length - 1] - vals[0]) / Math.abs(vals[0]) * 100 : null;
  const name = (k: string) => k === 'max' ? t('rangeMax') : k.endsWith('m') ? `${k.slice(0, -1)}${t('rangeM')}` : `${k.slice(0, -1)}${t('rangeY')}`;
  return (
    <Card style={{ padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="tablist">
        {opts.map(o => {
          const on = cur?.k === o.k;
          return (
            <Pressable key={o.k} onPress={() => setSel(o.k)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 14, backgroundColor: on ? C.accent : C.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? C.accentInk : C.text }}>{name(o.k)}</Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? <Text style={{ fontSize: 12, color: C.textMuted }}>{t('rangeLoading')}</Text> : null}
      {vals.length > 1 ? <>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{t('min')} {numAuto(mn, L)}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{t('max')} {numAuto(mx, L)} {unit ? '' : ''}</Text>
        </View>
        <LineChart points={vals} width={width} label={`${label}: ${numAuto(vals[0], L)} → ${numAuto(vals[vals.length - 1], L)} ${unit}`} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{shown[0][0]}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{shown[shown.length - 1][0]}</Text>
        </View>
        <Text style={{ fontSize: 12.5, color: C.textMuted }}>{t('rangeChange')}: <Text style={{ fontWeight: '700', color: C.text }}>{pct(change, L)}</Text></Text>
      </> : null}
    </Card>
  );
}
