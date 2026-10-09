import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Text, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, SectionTitle, Note, s } from '../components/ui';
import { C } from '../lib/theme';
import { norm } from '../lib/logic';
import { loadSearchIndex, loadCatalog, type SearchRow } from '../lib/api';

export default function Buscar() {
  const { data, user, t } = useApp();
  const L = user.lang, li = ['es', 'en', 'fr', 'it'].indexOf(L);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState<SearchRow[] | null>(null);
  const [opening, setOpening] = useState(false);
  useEffect(() => { loadSearchIndex().then(setIdx); }, []);
  const k = norm(q.trim());
  const cname = (code: string) => {
    const c = data.countries.find(x => x.code === code);
    if (c) return c.name[L];
    try { const n = new (Intl as any).DisplayNames([L], { type: 'region' }).of(code === 'EL' ? 'GR' : code); if (n) return n; } catch { /* */ }
    return code;
  };
  const res = useMemo(() => {
    if (k.length < 2) return null;
    const has = (s: string) => norm(s).includes(k);
    const prices = data.prices.filter(p => has(p.name[L]) || has(p.place[L]) || has(p.name.en)).slice(0, 6);
    const countries = data.countries.filter(c => has(c.name[L]) || has(c.name.en) || norm(c.code) === k).slice(0, 6);
    const sections = data.sections.filter(x => has(x.name[L])).slice(0, 4);
    const news = data.news.filter(n => has(n.title)).slice(0, 4);
    const series: { row: SearchRow; label: string }[] = [];
    if (idx) {
      const words = k.split(/\s+/).filter(Boolean), cn: Record<string, string> = {};
      for (const r of idx) {
        const tr = r[4] ? r[4].split('|') : [];
        const hay = norm(r[2] + ' ' + tr.join(' ') + ' ' + (cn[r[0]] ??= norm(cname(r[0]))));
        if (words.every(w => hay.includes(w))) { series.push({ row: r, label: tr[li] || r[2] }); if (series.length >= 40) break; }
      }
    }
    return { prices, countries, sections, news, series };
  }, [k, idx, data, L]);
  const total = res ? res.prices.length + res.countries.length + res.sections.length + res.news.length + res.series.length : 0;
  const openSeries = async (cc: string, id: string) => {
    setOpening(true);
    await loadCatalog(cc);
    setOpening(false);
    router.push({ pathname: '/indicador', params: { cc, id } });
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: t('gsTitle') }} />
      <TextInput autoFocus value={q} onChangeText={setQ} placeholder={t('gsPlaceholder')} placeholderTextColor={C.textMuted} accessibilityLabel={t('gsTitle')} autoCorrect={false} returnKeyType="search"
        style={[s.input, { borderRadius: 28, paddingHorizontal: 16, backgroundColor: C.surfaceAlt, borderWidth: 0 }]} />
      {!res ? <Note>{t('gsHint')}</Note> : null}
      {opening ? <Note>{t('gsOpening')}</Note> : null}
      {res && !total && idx ? <Note>{t('gsNone')}</Note> : null}
      {res && res.prices.length ? <><SectionTitle>{t('gsPrices')}</SectionTitle>
        <Card>{res.prices.map((p, i) => <Row key={p.id} first={i === 0} title={p.name[L]} sub={p.place[L]} right="›" onPress={() => router.push(`/serie/${p.id}`)} />)}</Card></> : null}
      {res && res.countries.length ? <><SectionTitle>{t('gsCountries')}</SectionTitle>
        <Card>{res.countries.map((c, i) => <Row key={c.code} first={i === 0} title={c.name[L]} right="›" onPress={() => router.push(`/pais/${c.code}`)} />)}</Card></> : null}
      {res && res.sections.length ? <><SectionTitle>{t('gsSections')}</SectionTitle>
        <Card>{res.sections.map((x, i) => <Row key={x.id} first={i === 0} title={x.name[L]} right="›" onPress={() => router.push(`/seccion/${x.id}`)} />)}</Card></> : null}
      {res && res.news.length ? <><SectionTitle>{t('gsNews')}</SectionTitle>
        <Card>{res.news.map((n, i) => <Row key={n.id} first={i === 0} title={n.title} sub={n.source} onPress={() => Linking.openURL(n.url)} />)}</Card></> : null}
      {res ? <>
        <SectionTitle>{t('gsSeries')}</SectionTitle>
        {!idx ? <Note>{t('gsIndexLoading')}</Note> : res.series.length ? <Card>{res.series.map((x, i) => <Row key={x.row[0] + x.row[1]} first={i === 0} title={x.label} sub={cname(x.row[0])} right="›" onPress={() => openSeries(x.row[0], x.row[1])} />)}</Card> : null}
      </> : null}
    </Screen>
  );
}
