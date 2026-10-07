import type { Lang } from './types';

const LOCALE: Record<Lang, string> = { es: 'es-ES', en: 'en-GB', fr: 'fr-FR', it: 'it-IT' };
const MONTHS: Record<Lang, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
};

/** Decimales según la magnitud: 264,1 · 45,53 · 2,237 */
export function decimalsFor(v: number): number {
  const a = Math.abs(v);
  return a >= 100 ? 1 : a >= 10 ? 2 : 3;
}

export function num(v: number, lang: Lang, dec?: number): string {
  const d = dec ?? decimalsFor(v);
  return new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
}

/** +0,5 % · −1,7 % · 0,0 % (signo menos tipográfico) */
export function pct(v: number | null | undefined, lang: Lang): string {
  if (v == null || !isFinite(v)) return '—';
  const s = num(Math.abs(v), lang, 1);
  const sign = v > 0.05 ? '+' : v < -0.05 ? '−' : '';
  return sign + s + (lang === 'en' ? '%' : ' %');
}

/** 'YYYY-MM-DD' -> 27 sep 2026 · 'YYYY-MM' -> sep 2026 */
export function date(iso: string, lang: Lang): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso || '');
  if (!m) return iso || '';
  const mon = MONTHS[lang][Number(m[2]) - 1];
  return m[3] ? `${Number(m[3])} ${mon} ${m[1]}` : `${mon} ${m[1]}`;
}

/** Hora local del teléfono para una fecha UTC (calendario) */
export function localTime(isoUtc: string, lang: Lang): { day: string; time: string } {
  const d = new Date(isoUtc);
  const day = `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { day, time };
}

export function eur(v: number, lang: Lang): string {
  const s = new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 0 }).format(Math.abs(v));
  return (v < 0 ? '−' : '') + s + ' €';
}
