// Piezas comunes de la interfaz. Los interruptores y campos son los nativos de cada sistema.
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle, type TextStyle, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { C, R, ANDROID, changeColor, onThemeChange, mode as themeMode } from '../lib/theme';
import { useApp } from '../lib/store';
import { date as fmtDate } from '../lib/format';

export function OfficialBadge() {
  const { t } = useApp();
  return <View style={{ alignSelf: 'flex-start', backgroundColor: C.badgeBg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3 }}><Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, color: C.badgeInk }}>{t('officialData')}</Text></View>;
}

export function BrandBar() {
  const { t, user, setUser, mode } = useApp();
  const btn = { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <Image source={require('../../assets/logo-nav.png')} style={{ width: 40, height: 34 }} resizeMode="contain" accessibilityLabel="Dehesa Index" />
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => router.push('/buscar')} accessibilityRole="button" accessibilityLabel={t('gsTitle')} hitSlop={6} style={btn}><Icon d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3" color={C.accent} size={22} /></Pressable>
      <Pressable onPress={() => setUser({ theme: mode === 'dark' ? 'light' : 'dark' })} accessibilityRole="button" accessibilityLabel={t('themeToggle')} hitSlop={6} style={btn}>
        <Icon d={mode === 'dark' ? 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1' : 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'} color={C.accent} size={22} />
      </Pressable>
      <Pressable onPress={() => router.push('/ajustes')} accessibilityRole="button" accessibilityLabel={t('settings')} hitSlop={6} style={[btn, { width: 'auto', paddingHorizontal: 14 }]}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.accent }}>{user.lang.toUpperCase()} ▾</Text>
      </Pressable>
      <Pressable onPress={() => router.navigate('/mas')} accessibilityRole="button" accessibilityLabel={t('menu')} hitSlop={6} style={btn}><Icon d="M4 7h16M4 12h16M4 17h16" color={C.accent} size={22} /></Pressable>
    </View>
  );
}

export function Screen({ children, title, subtitle, right, scroll = true, refresh }: { children: React.ReactNode; title?: string; subtitle?: string; right?: React.ReactNode; scroll?: boolean; refresh?: boolean }) {
  const { refreshing, reload } = useApp();
  const head = title ? (
    <View style={s.headRow}>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        <Text style={s.title} accessibilityRole="header">{title}</Text>
      </View>
      {right}
    </View>
  ) : null;
  if (!scroll) return <View style={s.screen}>{head}{children}</View>;
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={s.screen} contentInsetAdjustmentBehavior="automatic"
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={C.accent} colors={[C.accent]} /> : undefined}>
      {refresh ? <BrandBar /> : null}
      {head}
      <DataStatus />
      {children}
    </ScrollView>
  );
}

export function DataStatus() {
  const { data, offline, t, user } = useApp();
  if (!data.fetchedAt) return <Text style={s.status}>{t('bundled')}</Text>;
  if (offline) return <Text style={s.status}>{t('offline', fmtDate(data.fetchedAt.slice(0, 10), user.lang))}</Text>;
  return null;
}

export function SectionTitle({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle} accessibilityRole="header">{children}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" style={s.link}><Text style={s.linkText}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Row({ title, sub, right, rightSub, rightColor, onPress, first, accessibilityLabel, badge }: { badge?: boolean; title: string; sub?: string; right?: string; rightSub?: string; rightColor?: string; onPress?: () => void; first?: boolean; accessibilityLabel?: string }) {
  const body = (
    <View style={[s.row, !first && s.rowDivider]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
        {badge ? <OfficialBadge /> : null}
      </View>
      {right != null ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.rowRight}>{right}</Text>
          {rightSub ? <Text style={[s.rowRightSub, rightColor ? { color: rightColor } : null]}>{rightSub}</Text> : null}
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} android_ripple={{ color: C.surfaceAlt }}>{body}</Pressable>;
}

export function Button({ label, onPress, kind = 'primary', style }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; style?: ViewStyle }) {
  const bg = kind === 'primary' ? C.accent : C.surfaceAlt;
  const fg = kind === 'primary' ? C.accentInk : kind === 'danger' ? C.negative : C.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" android_ripple={{ color: '#00000022' }}
      style={({ pressed }) => [s.button, { backgroundColor: bg, opacity: pressed && !ANDROID ? 0.7 : 1 }, style]}>
      <Text style={[s.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Selector segmentado: en iOS fondo gris con la opción en blanco; en Android, botones contorneados con ✓ (Material 3) */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={ANDROID ? s.segA : s.segI} accessibilityRole="tablist">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[ANDROID ? s.segAItem : s.segIItem, ANDROID && i > 0 && s.segASep, on && (ANDROID ? s.segAOn : s.segIOn)]}>
            <Text style={s.segText} numberOfLines={1}>{ANDROID && on ? '✓ ' : ''}{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Sparkline({ points, width = 64, height = 28, color }: { points: number[]; width?: number; height?: number; color: string }) {
  if (points.length < 2) return <View style={{ width, height }} />;
  const mn = Math.min(...points), mx = Math.max(...points), rg = mx - mn || 1, pad = 3;
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${(pad + i * (width - 2 * pad) / (points.length - 1)).toFixed(1)} ${(pad + (1 - (v - mn) / rg) * (height - 2 * pad)).toFixed(1)}`).join(' ');
  return <Svg width={width} height={height}><Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function LineChart({ points, width, height = 160, label }: { points: number[]; width: number; height?: number; label: string }) {
  if (points.length < 2) return null;
  const mn = Math.min(...points), mx = Math.max(...points), rg = mx - mn || 1, pad = 8;
  const x = (i: number) => pad + i * (width - 2 * pad) / (points.length - 1), y = (v: number) => pad + (1 - (v - mn) / rg) * (height - 2 * pad);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke={C.border} strokeWidth={1} />
        <Path d={d} stroke={C.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={4.5} fill={C.accent} />
      </Svg>
    </View>
  );
}

export function Icon({ d, size = 24, color = C.text }: { d: string; size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} stroke={color} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function Change({ v, text }: { v: number | null | undefined; text: string }) {
  return <Text style={{ color: changeColor(v), fontWeight: '700', fontVariant: ['tabular-nums'] }}>{text}</Text>;
}

export function Note({ children }: { children: React.ReactNode }) {
  return <Text style={s.note}>{children}</Text>;
}

function build() { return StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 16, backgroundColor: C.bg, flexGrow: 1 },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  title: { fontSize: ANDROID ? 28 : 34, fontWeight: '700', color: C.text, letterSpacing: ANDROID ? 0 : -0.5 },
  subtitle: { fontSize: 14, color: C.textMuted, fontWeight: '500' },
  status: { fontSize: 12.5, color: C.textMuted, backgroundColor: C.surfaceAlt, padding: 8, borderRadius: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, flex: 1 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 15, fontWeight: '600', color: C.accent },
  card: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: R.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, minHeight: 48 },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.divider },
  rowTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  rowSub: { fontSize: 12.5, color: C.textMuted, marginTop: 1 },
  rowRight: { fontSize: 15, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  rowRightSub: { fontSize: 12.5, color: C.textMuted, fontVariant: ['tabular-nums'], fontWeight: '600' },
  button: { borderRadius: R.button, paddingVertical: ANDROID ? 11 : 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  segI: { flexDirection: 'row', backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 4, gap: 4 },
  segIItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segIOn: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segA: { flexDirection: 'row', borderWidth: 1, borderColor: C.outline, borderRadius: 20, overflow: 'hidden' },
  segAItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segASep: { borderLeftWidth: 1, borderLeftColor: C.outline },
  segAOn: { backgroundColor: C.accentSoft },
  segText: { fontSize: 14, fontWeight: '600', color: C.text },
  note: { fontSize: 13, color: C.textMuted, lineHeight: 19 },
  input: { fontSize: 16, padding: 10, borderRadius: R.input, borderWidth: 1, borderColor: ANDROID ? C.outline : C.borderStrong, backgroundColor: C.surfaceInput, color: C.text },
  label: { fontSize: 12.5, color: C.textMuted, marginBottom: 4 },
}); }
// Los estilos se rehacen al cambiar de tema (los demas ficheros los leen en cada pintado)
export let s = build();
export let text: Record<string, TextStyle> = { big: { fontSize: 40, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -1 } };
onThemeChange(() => rebuildStyles());
export function rebuildStyles(): void { s = build(); text = { big: { fontSize: 40, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -1 } }; }
