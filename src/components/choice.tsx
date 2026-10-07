// Opciones de perfil y mercado y la fila de elección con ✓ (ajustes y bienvenida)
import React from 'react';
import { Pressable, Text } from 'react-native';
import type { Market, Profile } from '../lib/store';
import { s } from './ui';
import { C } from '../lib/theme';

export const PROFILES: { v: Profile; k: string }[] = [{ v: 'cereal', k: 'pCereal' }, { v: 'dairy', k: 'pDairy' }, { v: 'pig', k: 'pPig' }, { v: 'buyer', k: 'pBuyer' }];
export const MARKETS: { v: Market; k: string }[] = [{ v: 'ES', k: 'regionEu' }, { v: 'US', k: 'regionUs' }, { v: 'CA', k: 'regionCa' }];

export function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} android_ripple={{ color: C.surfaceAlt }}
      style={[s.row, { justifyContent: 'space-between' }]}>
      <Text style={[s.rowTitle, { fontWeight: on ? '700' : '500' }]}>{label}</Text>
      <Text style={{ color: C.accent, fontSize: 18, fontWeight: '700' }}>{on ? '✓' : ''}</Text>
    </Pressable>
  );
}

