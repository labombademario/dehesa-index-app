import React from 'react';
import { Linking, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Button, LineChart, Note, Change, text } from '../components/ui';
import { C } from '../lib/theme';
import { num, numAuto, pct } from '../lib/format';
import { countryFromMemory, catalogFromMemory, loadSeriesHistory } from '../lib/api';
import type { CountrySeries } from '../lib/types';
import { RangeChart } from '../components/RangeChart';

export default function Indicador() {
  const { cc, id } = useLocalSearchParams<{ cc: string; id: string }>();
  const { data, user, t } = useApp();
  const { width } = useWindowDimensions();
  const L = user.lang;
  const prof = countryFromMemory(String(cc));
  let sr: CountrySeries | undefined = prof?.groups.flatMap(g => g.series).find(x => x.id === id);
  if (!sr) { const c = catalogFromMemory(String(cc))?.find(x => x.id === id); if (c) sr = { id: c.id, label: c.label, unit: c.unit, frequency: c.freq, latest: c.latest, period: c.latestPeriod, changePct: c.changePct, sourceId: c.sourceId, file: c.file, points: [] }; }
  const group = prof?.groups.find(g => g.series.some(x => x.id === id));
  const country = data.countries.find(x => x.code === cc);
  if (!sr) return <Screen title="—"><Note>{t('missing')}</Note></Screen>;
  const pts = sr.points.map(x => x[1]);
  const mn = pts.length ? Math.min(...pts) : sr.latest, mx = pts.length ? Math.max(...pts) : sr.latest;
  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <View>
        <Text style={{ fontSize: 14, color: C.textMuted, fontWeight: '500' }}>{country ? country.name[L] : cc}{group ? ` · ${group.title[L]}` : ''}</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }} accessibilityRole="header">{sr.labelT?.[L] ?? sr.label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Text style={text.big}>{numAuto(sr.latest, L)}</Text>
        <Text style={{ fontSize: 16, color: C.textMuted }}>{sr.unit}</Text>
        <Change v={sr.changePct} text={pct(sr.changePct, L)} />
      </View>
      <RangeChart points={sr.points} unit={sr.unit} label={sr.labelT?.[L] ?? sr.label} width={width - 32 - 28 - 2} load={sr.file ? () => loadSeriesHistory(sr.file as string, sr.id) : undefined} />
      <Card>
        <Row first title={t('source')} right={prof?.sourceNames[sr.sourceId] ?? sr.sourceId.replace(/_/g, ' ')} />
        <Row title={t('lastData')} right={sr.period} />
        <Row title={t('frequency')} right={t(sr.frequency)} />
      </Card>
      {country ? <Button kind="secondary" label={t('openOnWeb')} onPress={() => Linking.openURL(country.url)} /> : null}
    </Screen>
  );
}
