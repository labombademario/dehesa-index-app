import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useApp, BASKET_MAX } from '../../lib/store';
import { Screen, Card, Row, Button, LineChart, Note, Change, text } from '../../components/ui';
import { C } from '../../lib/theme';
import { RangeChart } from '../../components/RangeChart';
import { loadPriceHistory } from '../../lib/api';
import { num, pct, date } from '../../lib/format';

export default function Serie() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { price, user, setUser, t } = useApp();
  const { width } = useWindowDimensions();
  const L = user.lang;
  const p = price(String(id));
  if (!p) return <Screen title="—"><Note>{t('missing')}</Note></Screen>;
  const inB = user.basket.includes(p.id);
  const pts = p.points.map(x => x[1]);
  const mn = Math.min(...pts), mx = Math.max(...pts);
  const toggle = () => setUser(u => ({ basket: inB ? u.basket.filter(x => x !== p.id) : u.basket.length < BASKET_MAX ? [...u.basket, p.id] : u.basket }));
  return (
    <Screen>
      <Stack.Screen options={{ title: p.name[L] }} />
      <View>
        <Text style={{ fontSize: 14, color: C.textMuted, fontWeight: '500' }}>{p.place[L]}</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{p.name[L]}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Text style={text.big}>{num(p.value, L)}</Text>
        <Text style={{ fontSize: 16, color: C.textMuted }}>{p.unit[L]}</Text>
        <Change v={p.changePct} text={pct(p.changePct, L)} />
      </View>
      <RangeChart points={p.points} unit={p.unit[L]} label={p.name[L]} width={width - 32 - 28 - 2} load={() => loadPriceHistory(p.id, p.date)} />
      <Card>
        <Row first title={t('source')} right={p.sourceName} />
        <Row title={t('lastData')} right={date(p.date, L)} />
        <Row title={t('frequency')} right={t(p.frequency)} />
        {p.yearAgo ? <Row title={t('yearAgo')} sub={date(p.yearAgo.date, L)} right={`${num(p.yearAgo.value, L)} ${p.unit[L]}`} /> : null}
      </Card>
      {p.note ? <Note>{L === 'es' ? '' : t('noteEs') + ' '}{p.note.es}</Note> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label={t('createAlert')} onPress={() => router.push({ pathname: '/avisos', params: { nuevo: p.id } })} />
        <Button kind="secondary" label={inB ? t('removeBasket') : t('addBasket')} onPress={toggle} />
      </View>
      {!inB && user.basket.length >= BASKET_MAX ? <Note>{t('basketFull')}</Note> : null}
    </Screen>
  );
}
