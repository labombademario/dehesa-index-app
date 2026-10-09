import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Button, Note, Segmented } from '../components/ui';
import { C } from '../lib/theme';
import { loadPac, type PacData } from '../lib/api';

function money(v: number, L: string): string {
  const n = v / 1e6;
  return (n >= 1000 ? (n / 1000).toLocaleString(L, { maximumFractionDigits: 2 }) + ' Md€' : Math.round(n).toLocaleString(L) + ' M€');
}

export default function Pac() {
  const { user, t, data } = useApp();
  const L = user.lang, li = ['es', 'en', 'fr', 'it'].indexOf(L);
  const [pac, setPac] = useState<PacData | null>(null);
  const [done, setDone] = useState(false);
  const [kind, setKind] = useState<'direct' | 'rural'>('direct');
  const [yi, setYi] = useState(-1);
  useEffect(() => { loadPac().then(p => { setPac(p); setDone(true); if (p) setYi(p.years.indexOf('2026') >= 0 ? p.years.indexOf('2026') : 0); }); }, []);
  const cname = (code: string) => {
    const iso = code === 'EL' ? 'GR' : code;
    const c = data.countries.find(x => x.code === code || x.code === iso);
    if (c) return c.name[L];
    try { const n = new (Intl as any).DisplayNames([L], { type: 'region' }).of(iso); if (n) return n; } catch { /* */ }
    return code;
  };
  const rows = useMemo(() => {
    if (!pac || yi < 0) return [];
    return pac[kind].map(([cc, v]) => ({ cc, v: v[yi] })).sort((a, b) => b.v - a.v);
  }, [pac, kind, yi]);
  const total = rows.reduce((a, r) => a + r.v, 0), max = rows[0]?.v ?? 1;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'PAC' }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{t('pacTitle')}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{t('pacIntro')}</Text>
      {!pac ? <Note>{done ? t('noDataNow') : '…'}</Note> : <>
        <Segmented options={[{ value: 'direct', label: t('pacDirect') }, { value: 'rural', label: t('pacRural') }]} value={kind} onChange={setKind} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {pac.years.map((y, i) => (
            <Pressable key={y} onPress={() => setYi(i)} accessibilityRole="button" accessibilityState={{ selected: i === yi }} style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: i === yi ? C.accent : C.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: i === yi ? '#fff' : C.text }}>{y}</Text>
            </Pressable>
          ))}
        </View>
        <Card>
          <Row first title={t('pacTotal')} right={money(total, L)} />
          {rows.map(r => (
            <View key={r.cc} style={{ paddingHorizontal: 16, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>{cname(r.cc)}</Text>
                <Text style={{ fontSize: 15, color: C.text, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{money(r.v, L)}</Text>
              </View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: C.surfaceAlt, marginTop: 6 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: C.accent, width: `${Math.max(2, (r.v / max) * 100)}%` }} /></View>
            </View>
          ))}
        </Card>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{pac.act} · {pac.sourceName} · {pac.consolidated}</Text>
        <Button kind="secondary" style={{ flex: 0 }} label={t('pacLaw')} onPress={() => Linking.openURL(pac.url)} />
      </>}
    </Screen>
  );
}
