// Comercio agroalimentario por producto de un pais (bloque «Por producto» de la ficha de la web): lee data/app/v1/trade/<CC>.json,
// que genera scripts/build-app-trade.mjs en la web a partir de los mismos ficheros que el perfil.
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Note } from '../../components/ui';
import { BlockView, type Block } from '../../components/Blocks';
import { C } from '../../lib/theme';
import { webJson, countryName } from '../../lib/fv';
import type { Lang } from '../../lib/types';
import { param } from '../../lib/safe';

type Doc = { country: string; blocks: (Block & { asOfT?: Record<Lang, string> })[] };

export default function Comercio() {
  const rp = useLocalSearchParams<{ cc: string }>();   // parámetros saneados: un valor raro (p. ej. desde dehesaindex://) cuenta como no encontrado
  const cc = param(rp.cc, 'cc');
  const { user, t } = useApp();
  const L = user.lang;
  const code = String(cc).toUpperCase();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => { webJson('data/app/v1/trade/' + code + '.json', 6 * 3600e3).then(d => { setDoc(d); setDone(true); }); }, [code]);
  const name = countryName(code, L);
  const bs = doc?.blocks ?? [];
  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{name}</Text>
      {!bs.length ? <Note>{done ? t('noDataNow') : t('loading')}</Note> : bs.map(b => <BlockView key={b.id} b={{ ...b, asOf: b.asOfT?.[L] ?? b.asOf }} />)}
    </Screen>
  );
}
