// Textos de una pantalla en los cuatro idiomas sin pasar por i18n.ts (pantallas con mucho texto propio, como en la web).
import type { Lang } from './types';
export type T4 = Partial<Record<Lang, string>> & { es: string };
export function tx(L: Lang, o: T4): string { return o[L] ?? o.es; }
export function fill(s: string, ...v: (string | number)[]): string { return v.reduce<string>((a, x, i) => a.split('{' + i + '}').join(String(x)), s); }
/** Bandera a partir del código de país (EL -> GR, UK -> GB) */
export function flag(cc: string): string {
  if (cc === 'EU') return '🇪🇺';
  const i = cc === 'EL' ? 'GR' : cc === 'UK' ? 'GB' : cc;
  return /^[A-Z]{2}$/.test(i) ? String.fromCodePoint(127397 + i.charCodeAt(0), 127397 + i.charCodeAt(1)) : '';
}
