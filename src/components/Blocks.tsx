// Plantilla única para los bloques que genera la web (data/app/v1/env y data/app/v1/sec): cifras, gráficos con selector de serie,
// barras (las 12 primeras y «ver todas»), nota y fuente. Así cada sección nueva de la web llega a la app sin escribir otra pantalla.
import React, { useState } from 'react';
import { Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useApp } from '../lib/store';
import { Card, Row, Segmented } from './ui';
import { RangeChart } from './RangeChart';
import { C } from '../lib/theme';
import { num, date as fmtDate } from '../lib/format';
import type { Lang } from '../lib/types';

export type T4 = Record<Lang, string>;
export interface BStat { label: T4; value: number | null; unit: string | T4; dec: number; sub?: { d?: string } }
export interface BChart { label: T4; unit: string | T4; series: { label: T4; points: [string, number][] }[] }
export interface BBars { title: T4; unit: string | T4; dec: number; items: { label: T4; value: number; sub?: T4 }[] }
export interface Block { id: string; cc?: string; title: T4; asOf?: string; stats?: BStat[]; charts?: BChart[]; bars?: BBars[]; note?: T4; source?: { name: string; url: string }; link?: string; missing?: boolean }

const u = (x: string | T4, L: Lang) => (typeof x === 'string' ? x : x[L] ?? x.es);
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}(-\d{2})?$/.test(s);

function ChartCard({ c, L, width }: { c: BChart; L: Lang; width: number }) {
  const [i, setI] = useState(0);
  const s = c.series[Math.min(i, c.series.length - 1)];
  if (!s) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{c.label[L]}</Text>
      {c.series.length > 1 ? <Segmented options={c.series.map((x, k) => ({ value: String(k), label: x.label[L] }))} value={String(i)} onChange={v => setI(+v)} /> : null}
      {s.points.length > 1 ? <RangeChart key={c.label.es + i} points={s.points} unit={u(c.unit, L)} label={c.label[L]} width={width} /> : null}
    </View>
  );
}
function BarsCard({ b, L }: { b: BBars; L: Lang }) {
  const [all, setAll] = useState(false);
  const { t } = useApp();
  const unit = u(b.unit, L);
  const mx = Math.max(1e-9, ...b.items.map(x => Math.abs(x.value)));
  const items = all ? b.items : b.items.slice(0, 12);
  if (!b.items.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{b.title[L]}</Text>
      <Card>
        {items.map((x, k) => (
          <View key={k} style={{ paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderTopColor: C.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontSize: 14, color: C.text, flex: 1 }}>{x.label[L] ?? x.label.es}</Text>
              <Text style={{ fontSize: 14, color: C.text, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{x.sub ? x.sub[L] : num(x.value, L, b.dec)}{x.sub || !unit ? '' : ' ' + unit}</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: C.surfaceAlt, marginTop: 5 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: x.value < 0 ? C.negative : C.accent, opacity: 0.7, width: `${Math.max(2, Math.abs(x.value) / mx * 100)}%` }} /></View>
          </View>
        ))}
        {b.items.length > 12 ? <Pressable onPress={() => setAll(!all)} accessibilityRole="button" style={{ padding: 12, borderTopWidth: 1, borderTopColor: C.border }}><Text style={{ color: C.accent, fontWeight: '600', textAlign: 'center' }}>{all ? '▴' : t('envShowAll', b.items.length)}</Text></Pressable> : null}
      </Card>
    </View>
  );
}

/** Un bloque completo. `onLink` abre una ruta de la app cuando el bloque trae `link`. */
export function BlockView({ b, onLink, linkLabel }: { b: Block; onLink?: (href: string) => void; linkLabel?: string }) {
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const cw = Math.min(width, 700) - 32 - 28;
  const fill = (s: BStat) => s.label[L].replace('{d}', s.sub?.d ? (isDate(s.sub.d) ? fmtDate(s.sub.d, L) : s.sub.d) : '');
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{b.title[L]}</Text>
      {b.asOf ? <Text style={{ fontSize: 12.5, color: C.textMuted }}>{t('envAt', isDate(b.asOf) ? fmtDate(b.asOf, L) : b.asOf)}</Text> : null}
      {b.stats && b.stats.length ? <Card>{b.stats.filter(s => s.value != null || s.label[L].includes('{d}')).map((s, k) => {
        const unit = u(s.unit, L), inLabel = s.label[L].includes('{d}');
        return <Row key={k} first={k === 0} title={fill(s)} right={s.value == null ? '—' : num(s.value, L, s.dec) + (unit ? (unit === '%' && L === 'en' ? '%' : ' ' + unit) : '')} rightSub={!inLabel && s.sub?.d ? s.sub.d : undefined} />;
      })}</Card> : null}
      {b.link && onLink ? <Pressable onPress={() => onLink(b.link!)} accessibilityRole="button"><Text style={{ color: C.accent, fontWeight: '600' }}>{linkLabel ?? t('envOpen')} ›</Text></Pressable> : null}
      {(b.charts ?? []).map((c, k) => <ChartCard key={b.id + 'c' + k} c={c} L={L} width={cw} />)}
      {(b.bars ?? []).map((x, k) => <BarsCard key={b.id + 'b' + k} b={x} L={L} />)}
      {b.note ? <Text style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 18 }}>{b.note[L]}</Text> : null}
      {b.source ? <Pressable onPress={() => b.source?.url && Linking.openURL(b.source.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{t('envSource', b.source.name)}</Text></Pressable> : null}
    </View>
  );
}
