import React from 'react';
import { Linking, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, Button, Note, text } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { num, pct, date } from '../../lib/format';
import { figureText, NATIVE } from '../../lib/sections';

export default function Seccion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, user, t } = useApp();
  const L = user.lang;

  if (id === 'indice') {
    const ix = data.today.index;
    return (
      <Screen>
        <Stack.Screen options={{ title: t('index') }} />
        <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{t('index')}</Text>
        {ix ? <>
          <Text style={text.big}>{num(ix.value, L, 1)}</Text>
          <Text style={{ fontSize: 14, color: C.textMuted }}>{t('indexBase', ix.base.period)}</Text>
          <Card>
            <Row first title={t('period')} right={ix.period} />
            <Row title={t('inMonth', '').trim()} right={pct(ix.changeMoMPct, L)} rightColor={changeColor(ix.changeMoMPct)} />
            <Row title={t('inYear', '').trim()} right={pct(ix.changeYoYPct, L)} />
            <Row title={t('source')} right="Dehesa Index" />
          </Card>
        </> : <Note>{t('missing')}</Note>}
        <Button style={{ flex: 0 }} label={t('openWeb')} onPress={() => Linking.openURL('https://dehesaindex.com/metodologia.html')} />
      </Screen>
    );
  }

  const sec = data.sections.find(x => x.id === id);
  if (!sec) return <Screen title="—"><Note>{t('missing')}</Note></Screen>;
  const f = sec.figure;
  return (
    <Screen>
      <Stack.Screen options={{ title: sec.name[L] }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{sec.name[L]}</Text>
      {f ? <>
        <Text style={text.big}>{figureText(sec, L)}</Text>
        <Text style={{ fontSize: 15, color: C.textSoft }}>{f.label[L]}</Text>
        <Card>
          <Row first title={t('source')} right={f.sourceName} />
          <Row title={t('period')} right={/^\d{4}-\d{2}-\d{2}$/.test(f.period) ? date(f.period, L) : f.period} />
        </Card>
      </> : null}
      {NATIVE[sec.id] ? <Button style={{ flex: 0 }} label={t('seeSeries')} onPress={() => router.push({ pathname: '/explorar', params: NATIVE[sec.id] })} /> : null}
      <Note>{t('sectionNote')}</Note>
      <Button kind={NATIVE[sec.id] ? 'secondary' : 'primary'} style={{ flex: 0 }} label={t('openWeb')} onPress={() => Linking.openURL(sec.url)} />
    </Screen>
  );
}
