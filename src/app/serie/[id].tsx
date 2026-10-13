import React, { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SourceCite } from '../../components/SourceCite';
import { ExportCsv } from '../../components/ExportCsv';
import { useApp, BASKET_MAX, staleSuffix, srcName } from '../../lib/store';
import { Screen, Card, Row, Button, Note, SectionTitle, Change, OfficialBadge, text } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { RangeChart } from '../../components/RangeChart';
import { loadPriceHistory } from '../../lib/api';
import { num, pct, date } from '../../lib/format';

export default function Serie() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { price, data, user, setUser, t, loadEu } = useApp();
  const { width } = useWindowDimensions();
  const L = user.lang;
  const p = price(String(id));
  // Precio de otro país de la UE (desde un aviso o un enlace): se carga su fichero antes de decir que no existe
  const euCc = /^eu_([a-z]{2})_/.exec(String(id))?.[1].toUpperCase();
  const [tried, setTried] = useState(!euCc);
  useEffect(() => { if (!p && euCc) loadEu(euCc).finally(() => setTried(true)); }, [euCc]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return <Screen title="—"><Note>{tried ? t('missing') : t('loading')}</Note></Screen>;
  const inB = user.basket.includes(p.id);
  const others = data.prices.filter(x => x.product === p.product && x.id !== p.id);
  const pts = p.points.map(x => x[1]);
  const mn = Math.min(...pts), mx = Math.max(...pts);
  const toggle = () => setUser(u => ({ basket: inB ? u.basket.filter(x => x !== p.id) : u.basket.length < BASKET_MAX ? [...u.basket, p.id] : u.basket }));
  return (
    <Screen>
      <Stack.Screen options={{ title: p.name[L] }} />
      <View>
        <Text style={{ fontSize: 14, color: C.textMuted, fontWeight: '500' }}>{p.place[L]}</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{p.name[L]}</Text>
        <OfficialBadge />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Text style={text.big}>{num(p.value, L)}</Text>
        <Text style={{ fontSize: 16, color: C.textMuted }}>{p.unit[L]}</Text>
        <Change v={p.changePct} text={pct(p.changePct, L)} />
      </View>
      {p.stale ? <Note>{t('staleData', date(p.date, L))}</Note> : null}
      <RangeChart points={p.points} unit={p.unit[L]} label={p.name[L]} width={width - 32 - 28 - 2} load={() => loadPriceHistory(p.id, p.date)} />
      <Card>
        <Row first title={t('source')} right={srcName(p.sourceName, L)} />
        <Row title={t('lastData')} right={date(p.date, L)} />
        <Row title={t('frequency')} right={t(p.frequency)} />
        {p.yearAgo ? <Row title={t('yearAgo')} sub={date(p.yearAgo.date, L)} right={`${num(p.yearAgo.value, L)} ${p.unit[L]}`} /> : null}
      </Card>
      <SourceCite sourceId={p.sourceId} period={p.date} />
      <ExportCsv title={p.name[L]} place={p.place[L]} unit={p.unit[L]} sourceId={p.sourceId} sourceName={p.sourceName} points={p.points} load={() => loadPriceHistory(p.id, p.date)} />
      {p.note ? <Note>{L === 'es' ? '' : t('noteEs') + ' '}{p.note.es}</Note> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} label={t('createAlert')} onPress={() => router.push({ pathname: '/avisos', params: { nuevo: p.id } })} />
        <Button style={{ flex: 1 }} kind="secondary" label={inB ? t('removeBasket') : t('addBasket')} onPress={toggle} />
      </View>
      <Button kind="secondary" label={t('compare')} onPress={() => router.push({ pathname: '/comparar', params: { ids: p.id } })} />
      {others.length ? <>
        <SectionTitle>{t('otherMarkets')}</SectionTitle>
        <Card>{others.map((o, i) => <Row key={o.id} first={i === 0} title={o.place[L]} sub={o.unit[L] + staleSuffix(o, L, t)} right={num(o.value, L)} rightSub={pct(o.changePct, L)} rightColor={changeColor(o.changePct)} onPress={() => router.push(`/serie/${o.id}`)} />)}</Card>
      </> : null}
      {!inB && user.basket.length >= BASKET_MAX ? <Note>{t('basketFull')}</Note> : null}
    </Screen>
  );
}
