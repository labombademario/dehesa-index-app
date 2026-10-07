import React from 'react';
import { Linking, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, Button, Note, SectionTitle } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { num, pct } from '../../lib/format';
import type { Price } from '../../lib/types';

const REGION_OF: Record<string, Price['region']> = { US: 'us', CA: 'ca', UK: 'uk', GB: 'uk' };

export default function Pais() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data, user, t } = useApp();
  const L = user.lang;
  const c = data.countries.find(x => x.code === code);
  if (!c) return <Screen title="—"><Note>{t('missing')}</Note></Screen>;
  const reg = REGION_OF[c.code];
  const prices = data.prices.filter(p => (reg ? p.region === reg : p.region === 'eu' && p.place.es.includes(c.name.es)));
  const pctv = c.coveragePct;
  return (
    <Screen>
      <Stack.Screen options={{ title: c.name[L] }} />
      <Text style={{ fontSize: 28, fontWeight: '700', color: C.text }} accessibilityRole="header">{c.name[L]}</Text>
      {pctv != null ? (
        <Card style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{t('coverage')}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{pctv} %</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: C.surfaceAlt, overflow: 'hidden' }} accessibilityLabel={`${pctv} %`}>
            <View style={{ width: `${pctv}%`, height: 8, backgroundColor: C.accent }} />
          </View>
          <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 19 }}>{t('coverageText', pctv, c.name[L])}</Text>
        </Card>
      ) : null}
      {prices.length ? <>
        <SectionTitle>{t('pricesHere')}</SectionTitle>
        <Card>{prices.map((p, i) => <Row key={p.id} first={i === 0} title={p.name[L]} sub={p.place[L]} right={`${num(p.value, L)} ${p.unit[L]}`}
          rightSub={pct(p.changePct, L)} rightColor={changeColor(p.changePct)} onPress={() => router.push(`/serie/${p.id}`)} />)}</Card>
      </> : null}
      <Button label={t('fullProfile')} onPress={() => Linking.openURL(c.url)} />
    </Screen>
  );
}
