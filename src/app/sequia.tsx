// Sequía y escasez en España (como la sección #esute de sequia.html): unidades por escenario, escala de lectura de los índices,
// mapa de demarcaciones con los ríos (data/es-basins.json) y lista de cuencas con sus unidades (data/es-drought-ute.json, MITECO).
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { useApp } from '../lib/store';
import { Screen, Card, Note, SectionTitle } from '../components/ui';
import { C, mode } from '../lib/theme';
import { num, date as fmtDate } from '../lib/format';
import { webJson } from '../lib/fv';

type Sc = 'normal' | 'prealert' | 'alert' | 'emergency';
const ORD: Sc[] = ['emergency', 'alert', 'prealert', 'normal'];
const CODE: Record<string, string> = { ES010: 'Miño-Sil', ES017: 'Cantábrico Oriental', ES018: 'Cantábrico Occidental', ES020: 'Duero', ES030: 'Tajo', ES040: 'Guadiana', ES050: 'Guadalquivir', ES070: 'Segura', ES080: 'Júcar', ES091: 'Ebro' };
function scen(v: number | null | undefined): Sc | null { return v == null ? null : v >= 0.5 ? 'normal' : v >= 0.3 ? 'prealert' : v >= 0.15 ? 'alert' : 'emergency'; }
function col(s: Sc): string { const dark = mode === 'dark'; return { normal: dark ? '#6CC08E' : '#2F7D4F', prealert: dark ? '#E5C65A' : '#C9A227', alert: dark ? '#F0A35E' : '#D9822B', emergency: dark ? '#F2867E' : '#B3261E' }[s]; }
interface Unit { code: string; name: string; value: number; state: string }
interface Dem { ute: Unit[]; uts: Unit[]; global: { drought?: number; scarcity?: number } }
interface UteDoc { asOf: string; demarcations: Record<string, Dem>; history: { date: string; ute: Record<Sc, number>; utsDrought: number; uts: number }[] }
interface Basins { viewBox: string; basins: { id: string; name: string; d: string; lx: number; ly: number }[]; rivers: { name: string; major: boolean; d: string }[] }

export default function Sequia() {
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const [D, setD] = useState<UteDoc | null>(null);
  const [B, setB] = useState<Basins | null>(null);
  const [done, setDone] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { Promise.all([webJson('data/es-drought-ute.json', 12 * 3600e3), webJson('data/es-basins.json', 7 * 24 * 3600e3)]).then(([d, b]) => { setD(d); setB(b); setDone(true); }); }, []);
  const SN: Record<Sc, string> = { normal: t('sqNormal'), prealert: t('sqPrealert'), alert: t('sqAlert'), emergency: t('sqEmergency') };
  const chip = (s: Sc | null, label?: string) => (s ? <View style={{ borderWidth: 1, borderColor: col(s), borderRadius: 9, paddingHorizontal: 7 }}><Text style={{ fontSize: 11.5, color: col(s) }}>{label ?? SN[s]}</Text></View> : null);
  if (!D) return <Screen><Stack.Screen options={{ title: '' }} /><Note>{done ? t('noDataNow') : t('loading')}</Note></Screen>;
  const last = D.history[D.history.length - 1], tot = ORD.reduce((a, k) => a + (last?.ute[k] || 0), 0);
  const names = Object.keys(D.demarcations).sort((a, b) => {
    const bad = (x: string) => D.demarcations[x].ute.filter(u => u.state === 'alert' || u.state === 'emergency').length;
    return bad(b) - bad(a) || (D.demarcations[a].global.scarcity ?? 9) - (D.demarcations[b].global.scarcity ?? 9);
  });
  const mw = Math.min(width, 700) - 32, vb = B ? B.viewBox.split(' ').map(Number) : [0, 0, 640, 477], mh = mw * vb[3] / vb[2];
  const selDem = sel && CODE[sel] ? D.demarcations[CODE[sel]] : null, selName = sel ? (CODE[sel] ?? B?.basins.find(b => b.id === sel)?.name ?? '') : '';
  return (
    <Screen>
      <Stack.Screen options={{ title: t('sqTitle') }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{t('sqTitle')}</Text>
      <Text style={{ fontSize: 13, color: C.textMuted }}>{t('sqAt', fmtDate(D.asOf, L))}</Text>
      {last ? <Card style={{ padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 15, color: C.text }}>{t('sqUnits')}</Text><Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{tot}</Text></View>
        <View style={{ flexDirection: 'row', height: 14, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
          {ORD.slice().reverse().map(k => (last.ute[k] ? <View key={k} style={{ flex: last.ute[k], backgroundColor: col(k) }} /> : null))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ORD.map(k => <View key={k} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>{chip(k)}<Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{last.ute[k] || 0}</Text></View>)}</View>
        <Text style={{ fontSize: 13, color: C.textMuted }}>{t('sqUts', last.utsDrought, last.uts)}</Text>
      </Card> : null}
      <Card style={{ padding: 14, gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{t('sqHowT')}</Text>
        <View style={{ flexDirection: 'row', height: 14, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
          <View style={{ flex: 15, backgroundColor: col('emergency') }} /><View style={{ flex: 15, backgroundColor: col('alert') }} /><View style={{ flex: 20, backgroundColor: col('prealert') }} /><View style={{ flex: 50, backgroundColor: col('normal') }} />
        </View>
        <View style={{ height: 14 }}>
          {([[0, '0'], [15, num(0.15, L, 2)], [30, num(0.3, L, 2)], [50, num(0.5, L, 2)]] as [number, string][]).map(([p, l]) => <Text key={p} style={{ position: 'absolute', left: `${p}%`, fontSize: 11, color: C.textMuted }}>{l}</Text>)}
          <Text style={{ position: 'absolute', right: 0, fontSize: 11, color: C.textMuted }}>1</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, color: C.text }}>{t('sqHow0')}</Text><Text style={{ fontSize: 12, color: C.text }}>{t('sqHow1')}</Text></View>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{t('sqHowN')}</Text>
      </Card>
      {B ? <>
        <SectionTitle>{t('sqMapT')}</SectionTitle>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{t('sqMapH')}</Text>
        <Svg width={mw} height={mh} viewBox={B.viewBox} accessibilityLabel={t('sqMapT')}>
          {B.basins.map(b => {
            const dm = CODE[b.id] ? D.demarcations[CODE[b.id]] : null, s = dm ? scen(dm.global.scarcity) : null;
            return <Path key={b.id} d={b.d} fill={s ? col(s) : C.textMuted} fillOpacity={s ? (sel === b.id ? 0.95 : 0.6) : 0.15} stroke={sel === b.id ? C.text : C.surface} strokeWidth={sel === b.id ? 2 : 1.2} onPress={() => setSel(b.id)} />;
          })}
          {B.rivers.map((r, i) => <Path key={i} d={r.d} fill="none" stroke={mode === 'dark' ? '#7db4ee' : '#1f5fa8'} strokeWidth={r.major ? 1.7 : 0.9} strokeLinecap="round" strokeLinejoin="round" />)}
          {B.basins.filter(b => CODE[b.id]).map(b => CODE[b.id].split(' ').map((w, i, a) => (
            <React.Fragment key={b.id + i}>
              <SvgText x={b.lx} y={b.ly - (a.length - 1) * 7 + i * 14} fontSize={13} fontWeight="600" textAnchor="middle" fill={C.surface} stroke={C.surface} strokeWidth={3}>{w}</SvgText>
              <SvgText x={b.lx} y={b.ly - (a.length - 1) * 7 + i * 14} fontSize={13} fontWeight="600" textAnchor="middle" fill={C.text}>{w}</SvgText>
            </React.Fragment>
          )))}
        </Svg>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{ORD.map(k => <React.Fragment key={k}>{chip(k)}</React.Fragment>)}<Text style={{ fontSize: 12, color: mode === 'dark' ? '#7db4ee' : '#1f5fa8' }}>— {t('sqRivers')}</Text></View>
        {sel ? <Card style={{ padding: 12, gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{CODE[sel] ?? selName.toLowerCase().replace(/(^|[\s-])\S/g, m => m.toUpperCase())}</Text>
          {selDem ? <>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Text style={{ fontSize: 13, color: C.text }}>{t('sqScarcity')}: {selDem.global.scarcity != null ? num(selDem.global.scarcity, L, 2) : '—'}</Text>{chip(scen(selDem.global.scarcity))}</View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Text style={{ fontSize: 13, color: C.text }}>{t('sqDrought')}: {selDem.global.drought != null ? num(selDem.global.drought, L, 2) : '—'}</Text>{selDem.global.drought != null && selDem.global.drought < 0.3 ? chip('alert', t('sqProlonged')) : null}</View>
          </> : <Text style={{ fontSize: 13, color: C.textMuted }}>{t('sqNotCovered')}</Text>}
        </Card> : null}
      </> : null}
      <SectionTitle>{t('sqScarcity')} · {t('sqDrought')}</SectionTitle>
      <Card>
        {names.map((n, i) => {
          const d = D.demarcations[n], w = d.ute.filter(u => u.state === 'alert' || u.state === 'emergency').length, sS = scen(d.global.scarcity), isOpen = open === n;
          return (
            <View key={n} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <Pressable onPress={() => setOpen(isOpen ? null : n)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={{ paddingHorizontal: 16, paddingVertical: 10, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{n}</Text><Text style={{ color: C.textMuted }}>{isOpen ? '▾' : '▸'}</Text></View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: C.text }}>{t('sqScarcity')} {d.global.scarcity != null ? num(d.global.scarcity, L, 2) : '—'}</Text>{chip(sS)}
                  <Text style={{ fontSize: 13, color: C.text }}>· {t('sqDrought')} {d.global.drought != null ? num(d.global.drought, L, 2) : '—'}</Text>{d.global.drought != null && d.global.drought < 0.3 ? chip('alert', t('sqProlonged')) : null}
                </View>
                <Text style={{ fontSize: 12, color: C.textMuted }}>{t('sqWorst', w, d.ute.length)}</Text>
              </Pressable>
              {isOpen ? <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 4 }}>
                {d.ute.slice().sort((a, b) => a.value - b.value).map(u => (
                  <View key={u.code} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: C.text, flex: 1 }}>{/^[\d.,]+$/.test(u.name) ? u.code : u.name}</Text>
                    <Text style={{ fontSize: 13, color: C.text, fontVariant: ['tabular-nums'] }}>{num(u.value, L, 2)}</Text>{chip(u.state as Sc)}
                  </View>
                ))}
              </View> : null}
            </View>
          );
        })}
      </Card>
      <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 17 }}>{t('sqNote')}</Text>
      <Text style={{ fontSize: 12, color: C.textMuted }}>{t('sqSource')}</Text>
    </Screen>
  );
}
