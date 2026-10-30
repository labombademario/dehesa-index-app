// Zona de producción de una denominación (data/gi/<CC>-geo.json): mismo dibujo que «Ver zona» de la web. Las zonas de las IGP y algunas DOP
// van a nivel de unidades administrativas (NUTS) y pueden ser mayores que la real; el texto lo dice.
import React, { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C } from '../lib/theme';
import { tx } from '../lib/tx';
import type { Lang } from '../lib/types';

export type GiArea = { b: [number, number, number, number]; d: string; i?: number; p?: number };
export type GiGeo = { viewBox: string; areas: Record<string, GiArea>; o?: string; n?: string };

export const ZONE_TXT = {
  show: { es: 'Ver zona', en: 'Show area', fr: 'Voir l’aire', it: 'Mostra zona' },
  hide: { es: 'Ocultar zona', en: 'Hide area', fr: 'Masquer l’aire', it: 'Nascondi zona' },
  noteP: { es: 'Zona según el pliego de condiciones, a nivel de unidades administrativas (NUTS, Eurostat/GISCO): puede ser mayor que la zona real y no sirve para delimitar parcelas. Fuente: pliego de condiciones de la denominación y Eurostat/GISCO.', en: 'Area according to the product specification, at the level of administrative units (NUTS, Eurostat/GISCO): it may be larger than the real area and is not for delimiting plots. Source: product specification of the designation and Eurostat/GISCO.', fr: 'Aire selon le cahier des charges, à l’échelle d’unités administratives (NUTS, Eurostat/GISCO) : elle peut être plus grande que l’aire réelle et ne permet pas de délimiter des parcelles. Source : cahier des charges de la dénomination et Eurostat/GISCO.', it: 'Zona secondo il disciplinare, a livello di unità amministrative (NUTS, Eurostat/GISCO): può essere più grande della zona reale e non serve a delimitare parcelle. Fonte: disciplinare della denominazione ed Eurostat/GISCO.' },
  noteG: { es: 'Zona de producción a nivel municipal (registro de la UE a nov-2021), con el contorno simplificado: es orientativa, no sirve para delimitar parcelas. Fuente: Candiago et al. 2022, EU-PDO (Scientific Data), CC0.', en: 'Production area at municipality level (EU register as of Nov 2021), outline simplified: indicative only, not for delimiting plots. Source: Candiago et al. 2022, EU-PDO (Scientific Data), CC0.', fr: 'Aire de production à l’échelle communale (registre de l’UE, nov. 2021), contour simplifié : indicatif, ne permet pas de délimiter des parcelles. Source : Candiago et al. 2022, EU-PDO (Scientific Data), CC0.', it: 'Zona di produzione a livello comunale (registro UE a nov. 2021), contorno semplificato: indicativa, non serve a delimitare parcelle. Fonte: Candiago et al. 2022, EU-PDO (Scientific Data), CC0.' },
};

export function GiZone({ geo, f, L }: { geo: GiGeo; f: string; L: Lang }) {
  const { width } = useWindowDimensions();
  const a = geo.areas[f];
  const bg = useMemo(() => Object.keys(geo.areas).filter(k => k !== f && !!geo.areas[k].i === !!a?.i).map(k => geo.areas[k].d).join(''), [geo, f, a]);
  if (!a) return null;
  const [bx, by, bw, bh] = a.b;
  const w0 = Math.max(bw, 90), h0 = Math.max(bh, 70), px = w0 * 0.3, py = h0 * 0.3;
  let vw = w0 + 2 * px, vh = h0 + 2 * py;
  if (vw / vh < 1.3) vw = vh * 1.3; else vh = vw / 1.3;
  const vx = bx + bw / 2 - vw / 2, vy = by + bh / 2 - vh / 2;
  const W = Math.min(width - 32 - 32, 420), H = W * vh / vw;
  return (
    <View style={{ gap: 6, paddingTop: 8 }}>
      <Svg width={W} height={H} viewBox={[vx, vy, vw, vh].map(n => n.toFixed(1)).join(' ')} accessibilityLabel={tx(L, ZONE_TXT.show)}>
        {geo.n ? <Path d={geo.n} fill={C.surfaceAlt} opacity={0.6} /> : null}
        {geo.o ? <Path d={geo.o} fill={C.surface} stroke={C.border} strokeWidth={0.8} /> : null}
        <Path d={bg} fill={C.border} opacity={0.45} />
        <Path d={a.d} fill={C.accent} fillOpacity={0.6} stroke={C.accent} strokeWidth={1.2} />
      </Svg>
      <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 17 }}>{tx(L, a.p ? ZONE_TXT.noteP : ZONE_TXT.noteG)}</Text>
    </View>
  );
}
