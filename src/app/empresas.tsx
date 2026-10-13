// Empresas (como empresas.html de la web): para quién es Dehesa Index en una operación y qué incluirá la API, que todavía NO existe.
// Los textos son los de la web (lib/empresasText.ts). Las cifras no se copian: el número de series sale del catálogo que ya tiene la app.
import React from 'react';
import { Linking, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, SectionTitle, Note, Button } from '../components/ui';
import { C } from '../lib/theme';
import { num } from '../lib/format';
import { ET } from '../lib/empresasText';
import { tx } from '../lib/tx';

const I: Record<string, number> = { es: 0, en: 1, fr: 2, it: 3 };

export default function Empresas() {
  const { user, data } = useApp();
  const L = user.lang, i = I[L] ?? 0;
  const g = (k: string) => ET[k][i];
  const series = data.sections.find(x => x.id === 'catalogo')?.figure?.value;
  return (
    <Screen>
      <Stack.Screen options={{ title: g('h1') }} />
      <Text style={{ fontSize: 26, lineHeight: 31, fontWeight: '700', color: C.text }} accessibilityRole="header">{g('h1')}</Text>
      <Text style={{ fontSize: 14, lineHeight: 21, color: C.textSoft }}>{g('sub')}</Text>
      {typeof series === 'number' ? <Card><Row first title={tx(L, { es: 'Series en el catálogo', en: 'Series in the catalogue', fr: 'Séries dans le catalogue', it: 'Serie nel catalogo' })} right={num(series, L, 0)} /></Card> : null}
      <SectionTitle>{g('audienceTitle')}</SectionTitle>
      <Card>{(g('audiences') as { name: string; desc: string }[]).map((a, k) => <Row key={a.name} first={k === 0} title={a.name} sub={a.desc} />)}</Card>
      <SectionTitle>{g('apiTitle')}</SectionTitle>
      <Note>{g('apiStatusBadge')}</Note>
      <Card>{(g('apiFeatures') as string[]).map((f, k) => <Row key={k} first={k === 0} title={f} />)}</Card>
      <SectionTitle>{g('ctaTitle')}</SectionTitle>
      <Text style={{ fontSize: 14, lineHeight: 21, color: C.textSoft }}>{g('ctaBody')}</Text>
      <Button label={g('ctaButton')} onPress={() => Linking.openURL('mailto:dehesaindex@gmail.com?subject=' + encodeURIComponent(tx(L, { es: 'Interés en la API de Dehesa Index', en: 'Interest in the Dehesa Index API', fr: 'Intérêt pour l’API de Dehesa Index', it: 'Interesse per l’API di Dehesa Index' })))} />
      <Text style={{ fontSize: 12, color: C.textMuted }}>{g('ctaNote')}</Text>
      <View style={{ height: 8 }} />
    </Screen>
  );
}
