// Elegir mercado: Europa / EE. UU. / Canadá y, dentro de Europa, el país con su bandera (cada país con sus propios precios).
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Segmented } from './ui';
import { C } from '../lib/theme';
import { useApp, isEu, type Market } from '../lib/store';
import { webJson, countryName } from '../lib/fv';
import { flag, tx } from '../lib/tx';
import { groupCodes, GROUP_LABEL } from '../lib/countryGroups';

// Lista por defecto si aún no se ha descargado data/app/v1/eu/index.json (sin conexión en el primer arranque)
const EU_DEFAULT = ['ES', 'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LV', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];

export function MarketPicker({ value, onChange }: { value: Market; onChange: (m: Market) => void }) {
  const { user, t } = useApp();
  const L = user.lang;
  const [ccs, setCcs] = useState<string[]>(EU_DEFAULT);
  useEffect(() => { webJson('data/app/v1/eu/index.json', 24 * 3600e3).then((d: any) => { const k = d?.countries ? Object.keys(d.countries).filter(c => (d.countries[c].n ?? 0) >= 3) : null; if (k && k.length) setCcs(['ES', ...k.filter(c => c !== 'ES')]); }); }, []);
  const reg = value === 'US' ? 'us' : value === 'CA' ? 'ca' : 'eu';
  const list = ccs.slice().sort((a, b) => (a === 'ES' ? -1 : b === 'ES' ? 1 : countryName(a, L).localeCompare(countryName(b, L), L)));
  return (
    <View style={{ gap: 12 }}>
      <Segmented value={reg} onChange={r => onChange(r === 'us' ? 'US' : r === 'ca' ? 'CA' : isEu(value) ? value : 'ES')}
        options={[{ value: 'eu', label: t('regionEu') }, { value: 'us', label: t('regionUs') }, { value: 'ca', label: t('regionCa') }]} />
      {reg === 'eu' ? <>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.textMuted }}>{tx(L, { es: '¿En qué país?', en: 'Which country?', fr: 'Dans quel pays ?', it: 'In quale paese?' })}</Text>
        {groupCodes(list, x => x).map(g => (
          <View key={g.k} style={{ gap: 8 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.textMuted }} accessibilityRole="header">{GROUP_LABEL[g.k][L]}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
          {g.items.map(cc => {
            const on = value === cc;
            return (
              <Pressable key={cc} onPress={() => onChange(cc)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={countryName(cc, L)}
                style={{ width: '31.5%', alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? C.accent : C.border, backgroundColor: on ? C.surfaceAlt : C.surface }}>
                <Text style={{ fontSize: 28 }} accessibilityElementsHidden importantForAccessibility="no">{flag(cc)}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: C.text, textAlign: 'center' }} numberOfLines={1}>{countryName(cc, L)}</Text>
              </Pressable>
            );
          })}
        </View>
          </View>
        ))}
      </> : null}
    </View>
  );
}
