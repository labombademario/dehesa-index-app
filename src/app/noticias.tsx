import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle } from '../components/ui';
import { date } from '../lib/format';
import { C } from '../lib/theme';

const REGIONS = [['us', 'newsRegionUS'], ['eu', 'newsRegionEU'], ['uk', 'newsRegionUK'], ['ca', 'newsRegionCA'], ['global', 'newsRegionGlobal']] as const;

function Chips({ options, value, onChange }: { options: { v: string; label: string; n?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0, height: 44 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4, alignItems: 'flex-start' }}>
      {options.map(o => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} onPress={() => onChange(o.v)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: on ? C.accent : C.surfaceAlt }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: on ? C.accentInk : C.text }}>{o.label}{o.n != null ? ` · ${o.n}` : ''}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function Noticias() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const [region, setRegion] = useState('all');
  const [country, setCountry] = useState('all');

  const cname = (code: string) => {
    const c = data.countries.find(x => x.code === code);
    if (c) return c.name[L];
    try { const n = new (Intl as any).DisplayNames([L], { type: 'region' }).of(code); if (n) return n; } catch {}
    return code;
  };

  const regionOpts = useMemo(() => {
    const all = [{ v: 'all', label: t('newsAll'), n: data.news.length }];
    return all.concat(REGIONS.map(([v, k]) => ({ v, label: t(k), n: data.news.filter(x => x.region === v).length })).filter(o => o.n > 0));
  }, [data.news, L]);

  const countryOpts = useMemo(() => {
    const inRegion = data.news.filter(x => region === 'all' || x.region === region);
    const codes = Array.from(new Set(inRegion.map(x => x.country).filter(Boolean))).sort((a, b) => cname(a).localeCompare(cname(b), L));
    return [{ v: 'all', label: t('newsAllM') } as { v: string; label: string; n?: number }].concat(codes.map(c => ({ v: c, label: cname(c), n: inRegion.filter(x => x.country === c).length })));
  }, [data.news, data.countries, region, L]);

  const list = data.news.filter(x => (region === 'all' || x.region === region) && (country === 'all' || x.country === country));
  const filtered = region !== 'all' || country !== 'all';

  return (
    <Screen refresh>
      <Stack.Screen options={{ title: t('news') }} />
      <Note>{t('newsHint')}</Note>
      <SectionTitle>{t('newsRegion')}</SectionTitle>
      <Chips options={regionOpts} value={region} onChange={v => { setRegion(v); setCountry('all'); }} />
      {countryOpts.length > 2 ? (
        <>
          <SectionTitle>{t('newsCountry')}</SectionTitle>
          <Chips options={countryOpts} value={country} onChange={setCountry} />
        </>
      ) : null}
      <View style={{ height: 8 }} />
      <Note>{t('newsShowing').replace('{n}', String(list.length))}</Note>
      {list.length ? (
        <Card>{list.map((n, i) => <Row key={n.id} first={i === 0} title={n.title} sub={[n.source, n.country ? cname(n.country) : '', n.date ? date(n.date.slice(0, 10), L) : ''].filter(Boolean).join(' · ')}
          onPress={() => Linking.openURL(n.url)} accessibilityLabel={`${n.title}, ${n.source}`} />)}</Card>
      ) : <Note>{t('noNews')}</Note>}
      {filtered ? <Pressable onPress={() => { setRegion('all'); setCountry('all'); }}><Text style={{ color: C.accent, fontWeight: '600', paddingVertical: 12 }}>{t('newsClear')}</Text></Pressable> : null}
    </Screen>
  );
}
