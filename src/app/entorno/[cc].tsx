// Paquete por país (como los bloques de gasóleo, emisiones, sequía y nitratos de la ficha de país de la web): lee data/app/v1/env/<CC>.json,
// que scripts/build-app-env.py genera desde los ficheros de cada país, y pinta cualquier bloque con la misma plantilla.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, Note, Segmented, Button } from '../../components/ui';
import { RangeChart } from '../../components/RangeChart';
import { C } from '../../lib/theme';
import { num, date as fmtDate } from '../../lib/format';
import { webJson, countryName } from '../../lib/fv';
import type { Lang } from '../../lib/types';
import { openSafe } from '../../lib/openLink';
import { param } from '../../lib/safe';

type T4 = Record<Lang, string>;
interface Stat { label: T4; value: number | null; unit: string | T4; dec: number; sub?: { d?: string } }
interface Chart { label: T4; unit: string | T4; series: { label: T4; points: [string, number][] }[] }
interface Bars { title: T4; unit: string | T4; dec: number; items: { label: T4; value: number; sub?: T4 }[] }
interface Block { id: 'diesel' | 'ghg' | 'drought' | 'nitrates' | 'economy' | 'tariffs' | 'land'; title: T4; asOf?: string; stats?: Stat[]; charts?: Chart[]; bars?: Bars[]; note?: T4; source?: { name: string; url: string }; link?: string; missing?: boolean }
interface EnvDoc { country: string; blocks: Block[] }

function ChartCard({ c, L, width }: { c: Chart; L: Lang; width: number }) {
  const [i, setI] = useState(0);
  const unit = typeof c.unit === 'string' ? c.unit : c.unit[L];
  const s = c.series[Math.min(i, c.series.length - 1)];
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{c.label[L]}</Text>
      {c.series.length > 1 ? <Segmented options={c.series.map((x, k) => ({ value: String(k), label: x.label[L] }))} value={String(i)} onChange={v => setI(+v)} /> : null}
      {s && s.points.length > 1 ? <RangeChart key={c.label.es + i} points={s.points} unit={unit} label={c.label[L]} width={width} /> : null}
    </View>
  );
}
function BarsCard({ b, L }: { b: Bars; L: Lang }) {
  const [all, setAll] = useState(false);
  const unit = typeof b.unit === 'string' ? b.unit : b.unit[L];
  const mx = Math.max(1e-9, ...b.items.map(x => Math.abs(x.value)));
  const items = all ? b.items : b.items.slice(0, 12);
  const { t } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{b.title[L]}</Text>
      <Card>
        {items.map((x, k) => (
          <View key={k} style={{ paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderTopColor: C.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontSize: 14, color: C.text, flex: 1 }}>{x.label[L]}</Text>
              <Text style={{ fontSize: 14, color: C.text, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{x.sub ? x.sub[L] : num(x.value, L, b.dec)}{x.sub || !unit ? '' : ' ' + unit}</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: C.surfaceAlt, marginTop: 5 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: C.accent, opacity: 0.7, width: `${Math.max(2, Math.abs(x.value) / mx * 100)}%` }} /></View>
          </View>
        ))}
        {b.items.length > 12 ? <Pressable onPress={() => setAll(!all)} accessibilityRole="button" style={{ padding: 12, borderTopWidth: 1, borderTopColor: C.border }}><Text style={{ color: C.accent, fontWeight: '600', textAlign: 'center' }}>{all ? '▴' : t('envShowAll', b.items.length)}</Text></Pressable> : null}
      </Card>
    </View>
  );
}

export default function Entorno() {
  const rp = useLocalSearchParams<{ cc: string; tab?: string }>();   // parámetros saneados: un valor raro (p. ej. desde dehesaindex://) cuenta como no encontrado
  const cc = param(rp.cc, 'cc');
  const tab = param(rp.tab, 'flag') || undefined;
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const [doc, setDoc] = useState<EnvDoc | null>(null);
  const [done, setDone] = useState(false);
  const [sel, setSel] = useState<string>((tab as string) || 'diesel');
  useEffect(() => { webJson('data/app/v1/env/' + String(cc).toUpperCase() + '.json', 6 * 3600e3).then(d => { setDoc(d); setDone(true); }); }, [cc]);
  const cw = Math.min(width, 700) - 32 - 28;
  const name = countryName(String(cc).toUpperCase(), L);
  const lab: Record<string, string> = { diesel: t('envDiesel'), ghg: t('envGhg'), drought: t('envDrought'), nitrates: t('envNitrates'), economy: t('envEconomy'), tariffs: t('envTariffs'), land: t('envLand') };
  const b = doc?.blocks.find(x => x.id === sel) ?? (doc && !doc.blocks.some(x => x.id === sel) ? doc.blocks[0] : undefined);   // la UE no tiene gasóleo: se abre el primer bloque que exista
  const fillLab = (s: Stat) => s.label[L].replace('{d}', s.sub?.d ? (/^\d{4}-\d{2}/.test(s.sub.d) ? fmtDate(s.sub.d, L) : s.sub.d) : '');
  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{name}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted }}>{t('envTitle')}</Text>
      {!doc ? <Note>{done ? t('noDataNow') : t('loading')}</Note> : <>
        <Segmented options={doc.blocks.map(x => ({ value: x.id, label: lab[x.id] ?? x.id }))} value={b?.id ?? sel} onChange={setSel} />
        {!b ? null : b.missing ? <Note>{b.note?.[L] ?? ''}</Note> : <>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{b.title[L]}</Text>
          {b.asOf ? <Text style={{ fontSize: 12.5, color: C.textMuted }}>{t('envAt', /^\d{4}-\d{2}/.test(b.asOf) ? fmtDate(b.asOf, L) : b.asOf)}</Text> : null}
          {b.stats && b.stats.length ? <Card>{b.stats.map((s, k) => {
            const unit = typeof s.unit === 'string' ? s.unit : s.unit[L];
            return <Row key={k} first={k === 0} title={fillLab(s)} right={s.value == null ? '—' : num(s.value, L, s.dec) + (unit ? (unit === '%' && L === 'en' ? '%' : ' ' + unit) : '')} />;
          })}</Card> : null}
          {b.link ? <Button kind="secondary" label={t('envOpen')} onPress={() => router.push(b.link as any)} /> : null}
          {(b.charts ?? []).map((c, k) => <ChartCard key={sel + k} c={c} L={L} width={cw} />)}
          {(b.bars ?? []).map((x, k) => <BarsCard key={sel + 'b' + k} b={x} L={L} />)}
          {b.note ? <Text style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 18 }}>{b.note[L]}</Text> : null}
          {b.source ? <Pressable onPress={() => b.source?.url && openSafe(b.source.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{t('envSource', b.source.name)}</Text></Pressable> : null}
        </>}
      </>}
    </Screen>
  );
}
