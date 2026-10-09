// Tipografías de la web: Source Serif 4 en títulos y Public Sans en el texto.
// Los títulos (accessibilityRole="header") salen en serif solos; cualquier Text acepta fontFamily:'serif' para forzarlo.
import React from 'react';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';

export const FONT_FILES = {
  PublicSans_400Regular: require('../../assets/fonts/PublicSans_400Regular.ttf'),
  PublicSans_500Medium: require('../../assets/fonts/PublicSans_500Medium.ttf'),
  PublicSans_600SemiBold: require('../../assets/fonts/PublicSans_600SemiBold.ttf'),
  PublicSans_700Bold: require('../../assets/fonts/PublicSans_700Bold.ttf'),
  SourceSerif4_600SemiBold: require('../../assets/fonts/SourceSerif4_600SemiBold.ttf'),
  SourceSerif4_700Bold: require('../../assets/fonts/SourceSerif4_700Bold.ttf'),
};

export function useBrandFonts(): boolean {
  const [ok, err] = useFonts(FONT_FILES);
  return ok || !!err;
}

const sans = (w: string | number | undefined) => {
  const n = w === 'bold' ? 700 : w === 'normal' || w == null ? 400 : Number(w);
  return n >= 700 ? 'PublicSans_700Bold' : n >= 600 ? 'PublicSans_600SemiBold' : n >= 500 ? 'PublicSans_500Medium' : 'PublicSans_400Regular';
};
const serif = (w: string | number | undefined) => {
  const n = w === 'bold' ? 700 : w == null || w === 'normal' ? 600 : Number(w);
  return n >= 700 ? 'SourceSerif4_700Bold' : 'SourceSerif4_600SemiBold';
};

let installed = false;
/** Sustituye Text de react-native por uno que aplica las tipografias de la marca (una vez, antes del primer render). */
export function installFonts(): void {
  if (installed) return;
  installed = true;
  const RN: any = require('react-native');
  const Orig: any = RN.Text;
  function BrandText(props: any) {
    const flat: any = StyleSheet.flatten(props.style) || {};
    if (flat.fontFamily && flat.fontFamily !== 'serif' && flat.fontFamily !== 'sans') return React.createElement(Orig, props);
    const useSerif = flat.fontFamily === 'serif' || (props.accessibilityRole === 'header' && flat.fontFamily !== 'sans');
    return React.createElement(Orig, { ...props, style: [props.style, { fontFamily: useSerif ? serif(flat.fontWeight) : sans(flat.fontWeight), fontWeight: undefined }] });
  }
  (BrandText as any).displayName = 'Text';
  try { Object.defineProperty(RN, 'Text', { configurable: true, enumerable: true, get: () => BrandText }); } catch { /* si no se puede, queda la fuente del sistema */ }
}
