// Traducción de etiquetas de series (mismo algoritmo que js/label-tl.js de la web): una etiqueta solo se traduce si TODAS sus partes están en el
// glosario (data/label-gloss/<lang>.json) o son códigos, cifras o nombres propios; si falta una sola parte se deja en inglés. Nunca a ojo.
import type { Lang } from './types';

type G = { lang: Lang; t: Record<string, string>; keep: Set<string>; multi: string[] };
const GL: Partial<Record<Lang, G>> = {};
const SPLIT = /(\s*[:,()·;]\s*|\s+[-–]\s+)/;
const PASS = /^([A-Z0-9][A-Z0-9 \/&.\-+]*|[\d=.,%\s\-–\/]+|HS [\d\-]+|\d{4}(-\d{2})?(\/\d{2,4})?|[A-Z][a-z]?\d*)$/;
const TPL: Record<string, Record<string, string>> = {
  es: { to: 'exportaciones a {c}', dto: 'exportaciones nacionales a {c}', from: 'importaciones desde {c}', cexp: 'exportaciones de {c}', cimp: 'importaciones de {c}' },
  fr: { to: 'exportations vers {c}', dto: 'exportations nationales vers {c}', from: 'importations depuis {c}', cexp: 'exportations : {c}', cimp: 'importations : {c}' },
  it: { to: 'esportazioni verso {c}', dto: 'esportazioni nazionali verso {c}', from: 'importazioni da {c}', cexp: 'esportazioni: {c}', cimp: 'importazioni: {c}' },
};
function part(p: string, g: G): string | null {
  const s = p.trim(); if (!s) return p;
  const k = s.toLowerCase();
  if (g.t[k] != null) return g.t[k];
  if (g.keep.has(s) || PASS.test(s) || /^§\d+§$/.test(s)) return s;
  const T = TPL[g.lang]; let m: RegExpExecArray | null;
  if ((m = /^Domestic exports to (.+)$/.exec(s)) && g.t[m[1].toLowerCase()]) return T.dto.replace('{c}', g.t[m[1].toLowerCase()]);
  if ((m = /^Exports to (.+)$/i.exec(s)) && g.t[m[1].toLowerCase()]) return T.to.replace('{c}', g.t[m[1].toLowerCase()]);
  if ((m = /^Imports from (.+)$/i.exec(s)) && g.t[m[1].toLowerCase()]) return T.from.replace('{c}', g.t[m[1].toLowerCase()]);
  if ((m = /^(.+) (exports|imports)$/.exec(s)) && g.t[m[1].toLowerCase()]) return (m[2] === 'exports' ? T.cexp : T.cimp).replace('{c}', g.t[m[1].toLowerCase()]);
  return null;
}
export function setGloss(lang: Lang, doc: { t?: Record<string, string>; keep?: string[] }): void {
  const t = doc.t ?? {};
  GL[lang] = { lang, t, keep: new Set(doc.keep ?? []), multi: Object.keys(t).filter(k => /[,:(]/.test(k)).sort((a, b) => b.length - a.length) };
}
export function tl(label: string, lang: Lang): string {
  const g = GL[lang]; if (!g || !label) return label;
  let src = String(label); const held: string[] = [];
  for (const k0 of g.multi) { const at = src.toLowerCase().indexOf(k0); if (at > -1) { held.push(g.t[k0]); src = src.slice(0, at) + '§' + (held.length - 1) + '§' + src.slice(at + k0.length); } }
  const bits = src.split(SPLIT), out: string[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (i % 2 || !bits[i].trim()) { out.push(bits[i]); continue; }
    const r = part(bits[i], g); if (r == null) return label;
    out.push(r);
  }
  const s = out.join('').replace(/§(\d+)§/g, (_m, i) => held[+i]);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
