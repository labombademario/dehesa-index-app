// Norma del sitio (17-oct): siempre que se elige país, se agrupa en Zona euro · Resto de Europa · América · Resto del mundo.
// Mismas listas que js/country-picker.js de la web. La UE (agregado) va con Europa.
import type { Lang } from './types';

const set = (s: string) => new Set(s.split(' '));
const EZ = set('AT BE BG CY DE EE ES FI FR EL GR HR IE IT LT LU LV MT NL PT SI SK');
const EU = set('EU AL AD AM BA BY CH CZ DK GB UK GE HU IS LI MC MD ME MK NO PL RO RS RU SE SM TR UA VA XK');
const AM = set('US CA MX AR BR CL CO PE UY PY BO EC VE CR PA GT HN NI SV DO CU JM HT BS BB BZ GY SR TT');

export type GroupKey = 'ez' | 'eu' | 'am' | 'ow';
export const GROUP_ORDER: GroupKey[] = ['ez', 'eu', 'am', 'ow'];
export const GROUP_LABEL: Record<GroupKey, Record<Lang, string>> = {
  ez: { es: 'Zona euro', en: 'Euro area', fr: 'Zone euro', it: 'Area euro' },
  eu: { es: 'Resto de Europa', en: 'Rest of Europe', fr: 'Reste de l’Europe', it: 'Resto d’Europa' },
  am: { es: 'América', en: 'Americas', fr: 'Amériques', it: 'Americhe' },
  ow: { es: 'Resto del mundo', en: 'Rest of the world', fr: 'Reste du monde', it: 'Resto del mondo' },
};
export function groupOf(cc: string): GroupKey { const c = cc.toUpperCase(); return EZ.has(c) ? 'ez' : EU.has(c) ? 'eu' : AM.has(c) ? 'am' : 'ow'; }
/** Agrupa una lista de códigos respetando el orden de grupos; dentro de cada grupo, el orden que traiga la lista. */
export function groupCodes<T>(items: T[], code: (x: T) => string): { k: GroupKey; items: T[] }[] {
  return GROUP_ORDER.map(k => ({ k, items: items.filter(x => groupOf(code(x)) === k) })).filter(g => g.items.length);
}
