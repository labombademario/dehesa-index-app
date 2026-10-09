import React, { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, SectionTitle, Note, Segmented } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { numAuto, pct, date } from '../lib/format';
import { loadSummary, type SummaryData } from '../lib/api';

export default function Resumen() {
  const { user, t, data } = useApp();
  const L = user.lang;
  const [sum, setSum] = useState<SummaryData | null>(null);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState<'d' | 'w'>('d');
  useEffect(() => { loadSummary().then(s => { setSum(s); setDone(true); if (s && !s.daily && s.weekly) setTab('w'); }); }, []);
  const cname = (code: string) => {
    const c = data.countries.find(x => x.code === code);
    if (c) return c.name[L];
    try { const n = new (Intl as any).DisplayNames([L], { type: 'region' }).of(code === 'EL' ? 'GR' : code); if (n) return n; } catch { /* */ }
    return code;
  };
  const lab = (x: { label: string; labelT?: Record<string, string> }) => x.labelT?.[L] ?? x.label;
  const d = sum?.daily, w = sum?.weekly;
  return (
    <Screen>
      <Stack.Screen options={{ title: t('summaryTitle') }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{t('summaryTitle')}</Text>
      {!sum ? <Note>{done ? t('noDataNow') : '…'}</Note> : <>
        <Segmented options={[{ value: 'd', label: t('sumDaily') }, { value: 'w', label: t('sumWeekly') }]} value={tab} onChange={setTab} />
        {tab === 'd' && d ? <>
          <Text style={{ fontSize: 14, color: C.textMuted }}>{t('sumCounts', String(d.counts.periods), String(d.counts.series), String(d.counts.revisions))}</Text>
          <SectionTitle>{t('sumMovers')}</SectionTitle>
          <Card>{d.movers.map((m, i) => (
            <Row key={m.cc + m.label + i} first={i === 0} title={lab(m)} sub={`${cname(m.cc)} · ${m.period}`} right={`${numAuto(m.value, L)}`} rightSub={pct(m.changePct, L)} rightColor={changeColor(m.changePct)} />
          ))}</Card>
          {d.revisions.length ? <>
            <SectionTitle>{t('sumRevisions')}</SectionTitle>
            <Card>{d.revisions.map((r, i) => (
              <Row key={r.cc + r.label + i} first={i === 0} title={lab(r)} sub={`${cname(r.cc)} · ${r.period}`} right={`${numAuto(r.old, L)} → ${numAuto(r.new, L)}`} rightSub={pct(r.pct, L)} />
            ))}</Card>
          </> : null}
        </> : null}
        {tab === 'w' && w ? <>
          <Text style={{ fontSize: 14, color: C.textMuted }}>{date(w.from, L)} – {date(w.to, L)} · {t('sumWeekLine', w.items.toLocaleString(L), String(w.sources))}</Text>
          <SectionTitle>{t('sumTopics')}</SectionTitle>
          <Card>{w.topics.map(([k, n], i) => {
            const max = w.topics[0][1];
            return (
              <View key={k} style={{ paddingHorizontal: 16, paddingVertical: 9, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>{t('topic_' + k) === 'topic_' + k ? k : t('topic_' + k)}</Text>
                  <Text style={{ fontSize: 15, color: C.text, fontWeight: '600' }}>{n.toLocaleString(L)}</Text>
                </View>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: C.surfaceAlt, marginTop: 6 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: C.accent, width: `${Math.max(2, (n / max) * 100)}%` }} /></View>
              </View>
            );
          })}</Card>
          <SectionTitle>{t('sumTop')}</SectionTitle>
          <Card>{w.top.map((x, i) => <Row key={x.url} first={i === 0} title={x.h} sub={[x.source, date(x.date, L)].join(' · ')} onPress={() => Linking.openURL(x.url)} />)}</Card>
        </> : null}
      </>}
    </Screen>
  );
}
