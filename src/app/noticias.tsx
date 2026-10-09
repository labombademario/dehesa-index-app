import React from 'react';
import { Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note } from '../components/ui';
import { date } from '../lib/format';

export default function Noticias() {
  const { data, user, t } = useApp();
  const L = user.lang;
  return (
    <Screen refresh>
      <Stack.Screen options={{ title: t('news') }} />
      <Note>{t('newsHint')}</Note>
      {data.news.length ? (
        <Card>{data.news.map((n, i) => <Row key={n.id} first={i === 0} title={n.title} sub={[n.source, n.country, n.date ? date(n.date.slice(0, 10), L) : ''].filter(Boolean).join(' · ')}
          onPress={() => Linking.openURL(n.url)} accessibilityLabel={`${n.title}, ${n.source}`} />)}</Card>
      ) : <Note>{t('noNews')}</Note>}
    </Screen>
  );
}
