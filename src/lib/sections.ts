import { num } from './format';
import type { Lang, Section } from './types';

export const GROUP_KEY: Record<Section['group'], string> = { production: 'groupProduction', trade: 'groupTrade', costs: 'groupCosts', data: 'groupData' };

export function figureText(sec: Section, lang: Lang): string {
  const f = sec.figure;
  if (!f) return '';
  let u = typeof f.unit === 'string' ? f.unit : f.unit[lang];
  let val = f.value;
  // USDA WASDE publica «1000 MT» (miles de toneladas métricas): se muestra en millones de toneladas
  if (u === '1000 MT' && typeof val === 'number') { val = val / 1000; u = 'Mt'; }
  const v = typeof val === 'number' ? num(val, lang, Number.isInteger(val) ? 0 : 1) : val;
  return u === '%' ? `${v} %` : `${v} ${u}`;
}


/** Secciones de la web que se pueden ver aquí con las series del catálogo: país, grupo y filtro de texto opcional (para rendimientos, el texto «yield»). */
export const NATIVE: Record<string, { cc: string; g?: string; q?: string }> = {
  rendimientos: { cc: 'US', g: 'crops', q: 'yield' },
  ganaderia: { cc: 'US', g: 'livestock' },
  exportaciones: { cc: 'US', g: 'trade' },
  canada: { cc: 'CA', g: 'crops' },
  insumos: { cc: 'US', g: 'prices_paid' },
};
