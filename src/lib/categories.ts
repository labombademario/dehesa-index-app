import type { Lang } from './types';

// Categorías de precios, en el orden y con los nombres de la web (js/data.js, CATS)
export const CAT_ORDER = ['cereales', 'lacteos', 'ganado', 'porcino', 'ovino', 'avicultura', 'pienso', 'fertilizantes', 'azucar', 'aceite', 'tropicales', 'energia', 'otros'] as const;
export type Cat = typeof CAT_ORDER[number];

export const CAT_LABEL: Record<Cat, Record<Lang, string>> = {
  cereales: { es: 'Cereales', en: 'Grains', fr: 'Céréales', it: 'Cereali' },
  lacteos: { es: 'Lácteos', en: 'Dairy', fr: 'Produits laitiers', it: 'Latticini' },
  ganado: { es: 'Ganado', en: 'Livestock', fr: 'Bovins', it: 'Bovini' },
  porcino: { es: 'Porcino', en: 'Pork', fr: 'Porc', it: 'Suino' },
  ovino: { es: 'Ovino', en: 'Sheep & lamb', fr: 'Ovins', it: 'Ovino' },
  avicultura: { es: 'Avicultura', en: 'Poultry & eggs', fr: 'Aviculture', it: 'Avicoltura' },
  pienso: { es: 'Pienso y oleaginosas', en: 'Feed & oilseeds', fr: 'Aliments et oléagineux', it: 'Mangimi e oleaginose' },
  fertilizantes: { es: 'Fertilizantes', en: 'Fertiliser', fr: 'Engrais', it: 'Fertilizzanti' },
  azucar: { es: 'Azúcar', en: 'Sugar', fr: 'Sucre', it: 'Zucchero' },
  aceite: { es: 'Aceites', en: 'Oils', fr: 'Huiles', it: 'Oli' },
  tropicales: { es: 'Café, cacao y otros', en: 'Coffee, cocoa & more', fr: 'Café, cacao et autres', it: 'Caffè, cacao e altro' },
  energia: { es: 'Energía', en: 'Energy', fr: 'Énergie', it: 'Energia' },
  otros: { es: 'Otros', en: 'Other', fr: 'Autres', it: 'Altri' },
};

const MAP: Record<string, Cat> = {
  trigo: 'cereales', cebada: 'cereales', avena: 'cereales', maiz: 'cereales', centeno: 'cereales', arroz: 'cereales', sorgo: 'cereales',
  trigo_cwrs_ab: 'cereales', trigo_pienso_ab: 'cereales', avena_pienso_ab: 'cereales', cebada_pienso_ab: 'cereales',
  lenteja: 'cereales', lenteja_laird_ab: 'cereales', guisante_seco: 'cereales', guisante_verde_ab: 'cereales',
  leche: 'lacteos', leche_polvo: 'lacteos', mantequilla: 'lacteos',
  vaca: 'ganado', novillo_ab: 'ganado',
  cerdo: 'porcino', cerdo_ab: 'porcino',
  cordero: 'ovino',
  huevos: 'avicultura', pollo: 'avicultura',
  colza: 'pienso', canola_elevador: 'pienso', soja_grano: 'pienso', harina_soja: 'pienso', lino: 'pienso',
  urea: 'fertilizantes', dap: 'fertilizantes', potasa: 'fertilizantes',
  azucar: 'azucar',
  oliva: 'aceite',
  diesel: 'energia', gas_natural: 'energia', petroleo_brent: 'energia', petroleo_wti: 'energia',
};
const isCat = (c: unknown): c is Cat => typeof c === 'string' && (CAT_ORDER as readonly string[]).includes(c);
/** La categoría la publica la web con cada precio (data/app/v1/prices.json); la lista de arriba solo cubre datos antiguos sin ella */
export const catOf = (product: string, cat?: string): Cat => (isCat(cat) ? cat : MAP[product] ?? 'otros');

/** Agrupa en categorías (solo las que tienen algo), en el orden de la web */
export function byCategory<T extends { product: string; cat?: string }>(list: T[]): { cat: Cat; items: T[] }[] {
  return CAT_ORDER.map(cat => ({ cat, items: list.filter(p => catOf(p.product, p.cat) === cat) })).filter(g => g.items.length);
}
