// Colores de la marca (los de la web) y formas de cada sistema: iOS con tarjetas de 14 px; Android (Material 3) con 12 px y botones en cápsula.
import { Platform } from 'react-native';

const LIGHT = {
  bg: '#F7F4EC', surface: '#FFFFFF', surfaceAlt: '#EFEADB', surfaceInput: '#FBF9F3', border: '#E6E0CF', borderStrong: '#DAD3C2', divider: '#EFEADB',
  text: '#241F14', textMuted: '#6B6550', textSoft: '#4A4535', accent: '#1E3328', accentInk: '#FBF9F3', accentSoft: '#CFE3D5',
  positive: '#276A43', negative: '#B23A34', outline: '#6B6550', gold: '#C9A227', hero: '#1E3328', badgeBg: '#DCEBDD', badgeInk: '#1F5A37',
};
// Modo oscuro: los mismos valores que la web (html[data-theme="dark"])
const DARK: typeof LIGHT = {
  bg: '#181A13', surface: '#23261B', surfaceAlt: '#2B2E20', surfaceInput: '#1F2117', border: '#3A3D2C', borderStrong: '#484A37', divider: '#2B2E20',
  text: '#F2EFE3', textMuted: '#ABA68F', textSoft: '#C6C1AA', accent: '#D9BE72', accentInk: '#1E3328', accentSoft: '#3A3A22',
  positive: '#4FCB77', negative: '#E8776D', outline: '#8F8A74', gold: '#C9A227', hero: '#1E3328', badgeBg: '#26402F', badgeInk: '#9FDDB3',
};
export type Mode = 'light' | 'dark';
export const C: typeof LIGHT = { ...LIGHT };
export let mode: Mode = 'light';
/** Cambia los colores de toda la app. Después hay que volver a pintar (lo hace AppProvider). */
const listeners: (() => void)[] = [];
export function onThemeChange(cb: () => void): void { listeners.push(cb); }
export function applyTheme(m: Mode): boolean {
  if (m === mode) return false;
  mode = m;
  Object.assign(C, m === 'dark' ? DARK : LIGHT);
  listeners.forEach(f => f());
  return true;
}

export const ANDROID = Platform.OS === 'android';
export const R = {
  card: ANDROID ? 12 : 14,
  button: ANDROID ? 20 : 12,
  input: ANDROID ? 4 : 10,
};

export const changeColor = (v: number | null | undefined) => (v == null ? C.textMuted : v > 0.05 ? C.positive : v < -0.05 ? C.negative : C.textMuted);
