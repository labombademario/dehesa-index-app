import { num } from './format';
import type { Lang, Section } from './types';

export const GROUP_KEY: Record<Section['group'], string> = { production: 'groupProduction', trade: 'groupTrade', costs: 'groupCosts', data: 'groupData' };

export function figureText(sec: Section, lang: Lang): string {
  const f = sec.figure;
  if (!f) return '';
  const v = typeof f.value === 'number' ? num(f.value, lang, Number.isInteger(f.value) ? 0 : undefined) : f.value;
  const u = typeof f.unit === 'string' ? f.unit : f.unit[lang];
  return u === '%' ? `${v} %` : `${v} ${u}`;
}

