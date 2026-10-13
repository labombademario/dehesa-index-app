// Lista de los 10 países con paquete de gasóleo, emisiones, sequía y nitratos (data/app/v1/env/index.json).
import React from 'react';
import { Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row } from '../../components/ui';
import { C } from '../../lib/theme';
import { countryName } from '../../lib/fv';

const ENV_COUNTRIES = ['ES', 'FR', 'DE', 'IT', 'PL', 'BE', 'AT', 'HR', 'IE', 'NL'];
const FLAG: Record<string, string> = { ES: '🇪🇸', FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', PL: '🇵🇱', BE: '🇧🇪', AT: '🇦🇹', HR: '🇭🇷', IE: '🇮🇪', NL: '🇳🇱' };

export default function EnvList() {
  const { user, t } = useApp();
  const L = user.lang;
  const list = ENV_COUNTRIES.slice().sort((a, b) => countryName(a, L).localeCompare(countryName(b, L), L));
  return (
    <Screen>
      <Stack.Screen options={{ title: t('envTitle') }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{t('envTitle')}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{t('envSub')}</Text>
      <Card>{list.map((cc, i) => <Row key={cc} first={i === 0} title={FLAG[cc] + '  ' + countryName(cc, L)} right="›" onPress={() => router.push({ pathname: '/entorno/[cc]', params: { cc } })} />)}</Card>
    </Screen>
  );
}
