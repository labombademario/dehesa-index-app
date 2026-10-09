import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Card, Note, Row, SectionTitle } from './ui';
import { C } from '../lib/theme';
import { useApp } from '../lib/store';
import { loadMap, mapFromMemory } from '../lib/api';
import { num } from '../lib/format';
import type { CountryMap, MapMetric } from '../lib/types';

const RAMPS = { green: ['#e8f1e4', '#bfdcb8', '#8cc08c', '#4f9a62', '#1f6b43'], warm: ['#fdecc8', '#f9c97a', '#ef9b4a', '#d4622d', '#a32d1f'] };
const NODATA = '#e4e4e4';

/** Mismos cortes que la web: cuantiles sobre los valores publicados, hasta 5 clases */
export function classify(vals: number[]) {
  const sorted = vals.slice().sort((a, b) => a - b);
  const n = Math.min(5, Math.max(1, new Set(vals).size));
  const br: number[] = [];
  for (let i = 1; i < n; i++) br.push(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * i / n))]);
  const cls = (x: number) => { let c = 0; for (const b of br) if (x >= b) c++; return Math.min(c, n - 1); };
  return { n, br, cls, min: sorted[0], max: sorted[sorted.length - 1] };
}
export function metricColor(m: MapMetric, x: number | undefined, k: ReturnType<typeof classify>): string {
  if (x == null) return NODATA;
  const ramp = RAMPS[m.ramp];
  return ramp[Math.round(k.cls(x) * (ramp.length - 1) / Math.max(1, k.n - 1))];
}
export function fmtMetric(m: MapMetric, v: number, L: 'es' | 'en' | 'fr' | 'it'): string { return `${num(v, L, m.dec)}${m.unit ? ' ' + m.unit : ''}`; }

export function CountryMapView({ cc }: { cc: string }) {
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const [map, setMap] = useState<CountryMap | null>(() => mapFromMemory(cc));
  const [state, setState] = useState<'loading' | 'ok' | 'none'>(map ? 'ok' : 'loading');
  const [mid, setMid] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadMap(cc).then(r => { if (!alive) return; setMap(r.map); setState(r.map ? 'ok' : 'none'); });
    return () => { alive = false; };
  }, [cc]);
  const m = map?.metrics.find(x => x.id === mid) ?? map?.metrics[0];
  const k = useMemo(() => (m ? classify(Object.values(m.vals)) : null), [m]);
  if (state === 'none' || (state === 'ok' && !map)) return null;
  if (state === 'loading' || !map || !m || !k) return <><SectionTitle>{t('mapRegions')}</SectionTitle><Note>{t('mapLoading')}</Note></>;
  const [, , vw, vh] = map.viewBox.split(' ').map(Number);
  const w = width - 32 - 28, h = w * vh / vw;
  const selected = map.regions.find(r => r.id === sel);
  const ranked = map.regions.filter(r => m.vals[r.id] != null).sort((a, b) => m.vals[b.id] - m.vals[a.id]);
  const missing = map.regions.filter(r => m.vals[r.id] == null);
  const open = (r: string) => router.push({ pathname: '/region', params: { cc, r } });
  return (
    <>
      <SectionTitle>{t('mapRegions')}</SectionTitle>
      <Card style={{ padding: 14, gap: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, height: 40 }} contentContainerStyle={{ gap: 8, alignItems: 'flex-start' }}>
          {map.metrics.map(x => {
            const on = x.id === m.id;
            return (
              <Pressable key={x.id} onPress={() => setMid(x.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: on ? C.accent : C.surfaceAlt }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: on ? C.accentInk : C.text }}>{x.label[L]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Svg width={w} height={h} viewBox={map.viewBox} accessibilityLabel={`${t('mapRegions')} · ${m.label[L]}`}>
          {map.regions.map(r => (
            <Path key={r.id} d={r.d} fill={metricColor(m, m.vals[r.id], k)} stroke={r.id === sel ? '#111111' : '#FFFFFF'} strokeWidth={r.id === sel ? 3 : 1}
              onPress={() => setSel(r.id)} />
          ))}
        </Svg>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Array.from({ length: k.n }).map((_, i) => {
            const lo = i === 0 ? k.min : k.br[i - 1], hi = i === k.n - 1 ? k.max : k.br[i];
            const ramp = RAMPS[m.ramp];
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: ramp[Math.round(i * (ramp.length - 1) / Math.max(1, k.n - 1))] }} />
                <Text style={{ fontSize: 11.5, color: C.textMuted }}>{num(lo, L, m.dec)}–{num(hi, L, m.dec)}</Text>
              </View>
            );
          })}
          {missing.length ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: NODATA, borderWidth: 1, borderColor: '#00000026' }} /><Text style={{ fontSize: 11.5, color: C.textMuted }}>{t('mapNoData')}</Text></View> : null}
        </View>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{m.label[L]}{m.period ? ` · ${m.period.slice(0, 10)}` : ''}</Text>
        {selected ? (
          <Pressable onPress={() => open(selected.id)} accessibilityRole="button" style={{ backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{selected.name[L]}</Text>
              <Text style={{ fontSize: 13, color: C.textSoft }}>{m.vals[selected.id] != null ? fmtMetric(m, m.vals[selected.id], L) : t('mapNoData')}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.accent }}>{t('mapOpen')} ›</Text>
          </Pressable>
        ) : <Text style={{ fontSize: 12.5, color: C.textMuted }}>{t('mapTap')}</Text>}
      </Card>
      <Card>
        {ranked.map((r, i) => <Row key={r.id} first={i === 0} title={r.name[L]} right={fmtMetric(m, m.vals[r.id], L)} onPress={() => open(r.id)} />)}
        {missing.map(r => <Row key={r.id} title={r.name[L]} right="—" onPress={() => open(r.id)} />)}
      </Card>
    </>
  );
}
