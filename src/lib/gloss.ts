// Descarga el glosario de etiquetas del idioma (data/label-gloss/<lang>.json) y lo deja listo para tl().
import type { Lang } from './types';
import { webJson } from './fv';
import { setGloss } from './labelTl';
const LOADED = new Set<Lang>();
export async function loadGloss(lang: Lang): Promise<boolean> {
  if (lang === 'en' || LOADED.has(lang)) return true;
  const d = await webJson('data/label-gloss/' + lang + '.json', 24 * 3600e3);
  if (d) { setGloss(lang, d); LOADED.add(lang); }
  return !!d;
}
