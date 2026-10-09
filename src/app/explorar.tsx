import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, s } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { numAuto, pct } from '../lib/format';
import { norm } from '../lib/logic';
import { loadCatalog, countryFromMemory, type CatSeries } from '../lib/api';

const PAGE = 60;

export default function Explorar() {
  const { cc, g } = useLocalSearchParams<{ cc: string; g?: string }>();
  const { data, user, t } = useApp();
  const L = user.lang;
  const [cat, setCat] = useState<CatSeries[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [group, setGroup] = useState<string>(g ? String(g) : 'all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const prof = countryFromMemory(String(cc));
  const country = data.countries.find(x => x.code === cc);
  useEffect(() => {
    let alive = true;
    loadCatalog(String(cc)).then(r => { if (!alive) return; setCat(r); setState(r ? 'ok' : 'fail'); });
    return () => { alive = false; };
  }, [cc]);
  const gname = (id: string) => prof?.groups.find(x => x.id === id)?.title[L] ?? id;
  const groups = useMemo(() => {
    const c: Record<string, number> = {};
    (cat ?? []).forEach(x => { c[x.group] = (c[x.group] || 0) + 1; });
    return Object.keys(c).sort((a, b) => c[b] - c[a]).map(id => ({ id, n: c[id] }));
  }, [cat]);
  const list = useMemo(() => {
    const k = norm(q.trim());
    return (cat ?? []).filter(x => (group === 'all' || x.group === group) && (!k || norm(x.label).includes(k)))
      .sort((a, b) => (b.latestPeriod > a.latestPeriod ? 1 : b.latestPeriod < a.latestPeriod ? -1 : 0));
  }, [cat, group, q]);
  return (
    <Screen>
      <Stack.Screen options={{ title: country ? country.name[L] : '' }} />
      <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }} accessibilityRole="header">{t('explore')}</Text>
      {state === 'loading' ? <Note>{t('exploreLoading')}</Note> : null}
      {state === 'fail' ? <Note>{t('exploreFail')}</Note> : null}
      {state === 'ok' ? <>
        <TextInput value={q} onChangeText={x => { setQ(x); setLimit(PAGE); }} placeholder={t('search')} placeholderTextColor={C.textMuted} accessibilityLabel={t('search')}
          style={[s.input, { borderRadius: 28, paddingHorizontal: 16, backgroundColor: C.surfaceAlt, borderWidth: 0 }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, height: 40 }} contentContainerStyle={{ gap: 8, alignItems: 'flex-start' }}>
          {[{ id: 'all', n: cat!.length }, ...groups].map(x => {
            const on = x.id === group;
            return (
              <Pressable key={x.id} onPress={() => { setGroup(x.id); setLimit(PAGE); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: on ? C.accent : C.surfaceAlt }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#FFFFFF' : C.text }}>{x.id === 'all' ? t('exploreAll') : gname(x.id)} · {x.n}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Note>{t('exploreCount', list.length)}</Note>
        <Card>
          {list.slice(0, limit).map((x, i) => <Row key={x.id} first={i === 0} title={x.label} sub={`${x.unit} · ${x.latestPeriod} · ${t(x.freq)}`} right={numAuto(x.latest, L)}
            rightSub={x.changePct == null ? undefined : pct(x.changePct, L)} rightColor={changeColor(x.changePct)}
            onPress={() => router.push({ pathname: '/indicador', params: { cc: String(cc), id: x.id } })} />)}
        </Card>
        {list.length > limit ? <Pressable onPress={() => setLimit(limit + PAGE)} accessibilityRole="button" style={{ paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: C.accent, fontWeight: '700' }}>{t('exploreMore')}</Text></Pressable> : null}
      </> : null}
    </Screen>
  );
}
