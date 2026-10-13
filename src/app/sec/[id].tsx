// Sección de la web dentro de la app (data/app/v1/sec/<id>.json, scripts/build-app-sections.py): seguro, cultivos, oferta y demanda,
// clima, gasóleo y fertilizantes, cuentas por país, grano de Canadá, ganadería, exportaciones y aranceles. Cada bloque lleva su mercado
// (cc): se abre en el del usuario y nunca se mezclan países.
import React, { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp, isEu } from '../../lib/store';
import { Screen, Note } from '../../components/ui';
import { Chips } from '../../components/Chips';
import { BlockView, type Block, type T4 } from '../../components/Blocks';
import { C } from '../../lib/theme';
import { webJson, countryName } from '../../lib/fv';
import { flag, tx } from '../../lib/tx';

type Doc = { id: string; title: T4; emoji?: string; blocks: Block[] };
const SPECIAL: Record<string, T4> = { WORLD: { es: 'Mundo', en: 'World', fr: 'Monde', it: 'Mondo' }, EU: { es: 'UE', en: 'EU', fr: 'UE', it: 'UE' } };

export default function Seccion() {
  const { id, c } = useLocalSearchParams<{ id: string; c?: string }>();
  const { user, t } = useApp();
  const L = user.lang;
  const [doc, setDoc] = useState<Doc | null | undefined>(undefined);
  useEffect(() => { webJson('data/app/v1/sec/' + id + '.json', 6 * 3600e3).then(d => setDoc(d ?? null)); }, [id]);
  const markets = useMemo(() => (doc ? Array.from(new Set(doc.blocks.map(b => b.cc ?? 'WORLD'))) : []), [doc]);
  // mercado por defecto: el del parámetro, el del usuario, la UE si es de un país europeo sin bloque propio, o el primero
  const pick = (): string => {
    const want = (c as string) || user.market;
    if (markets.includes(want)) return want;
    if (isEu(user.market) && markets.includes('EU')) return 'EU';
    if (isEu(user.market) && markets.includes('ES') && user.market === 'ES') return 'ES';
    return markets[0];
  };
  const [cc, setCc] = useState<string | null>(null);
  const [bi, setBi] = useState(0);
  const cur = cc ?? (markets.length ? pick() : null);
  const list = doc ? doc.blocks.filter(b => (b.cc ?? 'WORLD') === cur) : [];
  const b = list[Math.min(bi, list.length - 1)];
  const mName = (m: string) => (SPECIAL[m] ? SPECIAL[m][L] : countryName(m, L));
  const sorted = markets.slice().sort((a, b2) => (a === pick() ? -1 : b2 === pick() ? 1 : mName(a).localeCompare(mName(b2), L)));
  return (
    <Screen>
      <Stack.Screen options={{ title: doc ? doc.title[L] : '' }} />
      {doc === undefined ? <Note>{t('loading')}</Note> : !doc ? <Note>{t('noDataNow')}</Note> : <>
        <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{doc.emoji ? doc.emoji + ' ' : ''}{doc.title[L]}</Text>
        {markets.length > 1 ? <Chips items={sorted.map(m => ({ value: m, label: mName(m), flag: SPECIAL[m] && m !== 'EU' ? '🌍' : flag(m) }))} value={cur ?? ''} onChange={v => { setCc(v); setBi(0); }} /> : null}
        {!markets.includes(user.market) && isEu(user.market) && user.market !== 'ES' && !markets.includes('EU') ? <Note>{tx(L, { es: 'Esta sección no tiene datos de tu país; se muestran los de otros mercados, cada uno con su bandera.', en: 'This section has no data for your country; other markets are shown, each with its flag.', fr: 'Cette section n’a pas de données pour votre pays ; d’autres marchés sont affichés, chacun avec son drapeau.', it: 'Questa sezione non ha dati del tuo paese; sono mostrati altri mercati, ognuno con la sua bandiera.' })}</Note> : null}
        {list.length > 1 ? <Chips items={list.map((x, k) => ({ value: String(k), label: x.title[L] }))} value={String(Math.min(bi, list.length - 1))} onChange={v => setBi(+v)} /> : null}
        {b ? <BlockView b={b} /> : <Note>{t('noDataNow')}</Note>}
      </>}
    </Screen>
  );
}
