// Lista de los países con bloques de entorno (data/app/v1/env/index.json): 11 con gasóleo, emisiones, sequía y nitratos y 16 más con el gasóleo del Boletín Petrolero (Grecia, también con tierra y regadío).
import React from 'react';
import { Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row } from '../../components/ui';
import { C } from '../../lib/theme';
import { countryName } from '../../lib/fv';
import { flag } from '../../lib/tx';

const ENV_COUNTRIES = ['ES', 'FR', 'DE', 'IT', 'PL', 'BE', 'AT', 'HR', 'IE', 'NL', 'PT', 'EL', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'HU', 'LT', 'LU', 'LV', 'MT', 'RO', 'SE', 'SI', 'SK'];

export default function EnvList() {
  const { user, t } = useApp();
  const L = user.lang;
  const list = ENV_COUNTRIES.slice().sort((a, b) => countryName(a, L).localeCompare(countryName(b, L), L));
  return (
    <Screen>
      <Stack.Screen options={{ title: t('envTitle') }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{t('envTitle')}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{t('envSub')}</Text>
      <Card>{list.map((cc, i) => <Row key={cc} first={i === 0} title={flag(cc) + '  ' + countryName(cc, L)} right="›" onPress={() => router.push({ pathname: '/entorno/[cc]', params: { cc } })} />)}</Card>
    </Screen>
  );
}
