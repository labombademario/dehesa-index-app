// Colores de la marca (los de la web) y formas de cada sistema: iOS con tarjetas de 14 px; Android (Material 3) con 12 px y botones en cápsula.
import { Platform } from 'react-native';

export const C = {
  bg: '#F7F4EC',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEADB',
  border: '#E6E0CF',
  divider: '#EFEADB',
  text: '#241F14',
  textMuted: '#6B6550',
  textSoft: '#4A4535',
  accent: '#1E3328',
  accentInk: '#FBF9F3',
  accentSoft: '#CFE3D5',
  positive: '#276A43',
  negative: '#B23A34',
  outline: '#6B6550',
};

export const ANDROID = Platform.OS === 'android';
export const R = {
  card: ANDROID ? 12 : 14,
  button: ANDROID ? 20 : 12,
  input: ANDROID ? 4 : 10,
};

export const changeColor = (v: number | null | undefined) => (v == null ? C.textMuted : v > 0.05 ? C.positive : v < -0.05 ? C.negative : C.textMuted);
