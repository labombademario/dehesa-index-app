import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp, defaults } from '../lib/store';
import { PROFILES, MARKETS, Choice } from '../components/choice';
import { Screen, Card, Row, Button, Note, Segmented, SectionTitle, s } from '../components/ui';
import { C } from '../lib/theme';
import { LANGS, LANG_NAMES } from '../lib/i18n';
import { notificationsEnabled } from '../lib/notify';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const VERSION: string = require('../../app.json').expo.version;
export default function Ajustes() {
  const { data, user, setUser, t } = useApp();
  const [notif, setNotif] = useState<boolean | null>(null);
  useEffect(() => { notificationsEnabled().then(setNotif); }, []);
  const sources = Object.entries(data.prices.reduce<Record<string, number>>((a, p) => { a[p.sourceName] = (a[p.sourceName] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
  const wipe = () => Alert.alert(t('wipe'), t('wipeConfirm'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('delete'), style: 'destructive', onPress: () => { setUser({ ...defaults(), lang: user.lang }); router.replace('/bienvenida'); } },
  ]);
  return (
    <Screen>
      <Stack.Screen options={{ title: t('settings') }} />
      <SectionTitle>{t('language')}</SectionTitle>
      <Card>{LANGS.map((l, i) => <View key={l} style={i > 0 ? s.rowDivider : undefined}><Choice label={LANG_NAMES[l]} on={user.lang === l} onPress={() => setUser({ lang: l })} /></View>)}</Card>
      <SectionTitle>{t('profile')}</SectionTitle>
      <Card>{PROFILES.map((p, i) => <View key={p.v} style={i > 0 ? s.rowDivider : undefined}><Choice label={t(p.k)} on={user.profile === p.v} onPress={() => setUser({ profile: p.v })} /></View>)}</Card>
      <SectionTitle>{t('market')}</SectionTitle>
      <Segmented value={user.market} onChange={market => setUser({ market })} options={MARKETS.map(m => ({ value: m.v, label: t(m.k) }))} />
      <SectionTitle>{t('notifications')}</SectionTitle>
      <Card><Row first title={t('notifChannel')} sub={t('notifHow')} right={notif == null ? '' : notif ? t('notifOnShort') : t('notifOffShort')} onPress={() => Linking.openSettings()} /></Card>
      <Button kind="secondary" label={t('replayWelcome')} onPress={() => { setUser({ onboarded: false }); router.replace('/bienvenida'); }} />
      <SectionTitle>{t('sources')}</SectionTitle>
      <Note>{t('sourcesHint')}</Note>
      <Card>
        {sources.map(([name, count], i) => <Row key={name} first={i === 0} title={name} right={t('pricesCount', count)} />)}
        <Row title={t('openWeb')} right="›" onPress={() => Linking.openURL('https://dehesaindex.com/metodologia.html')} />
      </Card>
      <Button kind="danger" label={t('wipe')} onPress={wipe} />
      <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center' }}>Dehesa Index · {t('appVersion', VERSION)}</Text>
    </Screen>
  );
}
