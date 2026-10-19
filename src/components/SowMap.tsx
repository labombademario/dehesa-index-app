// Mapa para elegir la región en «Qué sembrar» (como el de siembra.html): contornos de data/app/v1/map/<pais>.json (Natural Earth, dominio público).
// Solo se puede pulsar lo que tiene cultivos con datos suficientes; el resto sale en gris. Las mismas regiones están también en la fila de chips de debajo.
import React, { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Card, Note, SectionTitle } from './ui';
import { C, mode } from '../lib/theme';
import { useApp } from '../lib/store';
import { loadMap, mapFromMemory } from '../lib/api';
import type { CountryMap } from '../lib/types';

// Francia: el fichero de siembra usa los códigos INSEE de la región; el mapa, las siglas
export const FR_MAP: Record<string, string> = { '84': 'ARA', '27': 'BFC', '53': 'BRE', '24': 'CVL', '94': 'COR', '44': 'GES', '32': 'HDF', '11': 'IDF', '28': 'NOR', '75': 'NAQ', '76': 'OCC', '52': 'PDL', '93': 'PAC' };
export const toMapId = (cc: string, code: string) => (cc === 'FR' ? FR_MAP[code] ?? code : code);
const off = () => (mode === 'dark' ? '#3A3D2C' : '#e4e4e4');
const can = () => (mode === 'dark' ? '#3f7d52' : '#bfdcb8');

export function SowMap({ cc, codes, ok, selected, onPick, nameOf }: { cc: string; codes: string[]; ok: (code: string) => boolean; selected: string; onPick: (code: string) => void; nameOf: (code: string) => string }) {
  const { t } = useApp();
  const { width } = useWindowDimensions();
  const [map, setMap] = useState<CountryMap | null>(() => mapFromMemory(cc));
  const [state, setState] = useState<'loading' | 'ok' | 'none'>(map ? 'ok' : 'loading');
  useEffect(() => {
    let alive = true; const m0 = mapFromMemory(cc); setMap(m0); setState(m0 ? 'ok' : 'loading');
    loadMap(cc).then(r => { if (!alive) return; setMap(r.map); setState(r.map ? 'ok' : 'none'); });
    return () => { alive = false; };
  }, [cc]);
  if (state === 'none' || (state === 'ok' && !map)) return null;
  if (state === 'loading' || !map) return <Note>{t('mapLoading')}</Note>;
  const [, , vw, vh] = map.viewBox.split(' ').map(Number);
  const w = Math.min(width - 32 - 28, 520), h = Math.min(w * vh / vw, 380), w2 = h * vw / vh;
  const byMap: Record<string, string> = {}; codes.forEach(c => { byMap[toMapId(cc, c)] = c; });
  return (
    <>
      <SectionTitle>{t('swMapTitle')}</SectionTitle>
      <Card style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 17 }}>{t('swMapHint')}</Text>
        <View style={{ alignItems: 'center' }}>
          <Svg width={w2} height={h} viewBox={map.viewBox} accessibilityLabel={t('swMapTitle')}>
            {map.regions.map(r => {
              const code = byMap[r.id], good = !!code && ok(code), on = good && code === selected;
              return <Path key={r.id} d={r.d} fill={on ? C.accent : good ? can() : off()} stroke={on ? (mode === 'dark' ? '#FFFFFF' : '#111111') : C.surface} strokeWidth={on ? 2.5 : 1}
                onPress={good ? () => onPick(code) : undefined} />;
            })}
          </Svg>
        </View>
        {selected && ok(selected) ? <Text style={{ fontSize: 13, color: C.text }}>{t('swChosen')} <Text style={{ fontWeight: '700' }}>{nameOf(selected)}</Text></Text> : null}
      </Card>
    </>
  );
}
