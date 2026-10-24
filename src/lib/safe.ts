// Comprobaciones de seguridad sin dependencias de React Native (se prueban con node --test en safe.test.ts).
// 1) Enlaces externos: solo https:// a un host normal; nada de otros esquemas (tel:, sms:, itms-services:, javascript:, apps de terceros...).
// 2) Parámetros de las pantallas (dehesaindex://...): solo valores con forma conocida; lo demás se trata como «no encontrado».
// 3) Ficheros de datos: tamaño máximo y JSON válido con la forma esperada; si no, se rechaza y se conserva la última copia buena.

/** Devuelve el enlace si es https:// con un host válido y sin caracteres de control; si no, ''. */
export function safeUrl(u: unknown): string {
  if (typeof u !== 'string') return '';
  const s = u.trim();
  if (s.length < 9 || s.length > 2048) return '';
  if (/[\u0000-\u001f\u007f\s\\]/.test(s)) return '';
  const m = /^https:\/\/([^/?#@]+)(?:[/?#]|$)/i.exec(s);
  if (!m) return '';
  const host = m[1].toLowerCase().replace(/:\d{1,5}$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return '';   // sin usuario:clave@, sin IP rara ni host vacío
  return s;
}

/** Primer valor de un parámetro de ruta (expo-router puede dar string o string[]). */
export function one(v: unknown): string {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === 'string' ? x : '';
}

const PATTERNS = {
  cc: /^[A-Z]{2}$/,                       // código de país o agregado (ES, EU, UK...)
  id: /^[A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F_.:|-]{0,159}$/,   // id de serie, sección o producto (admite letras acentuadas: algunos ids de DE llevan «ö»)
  ids: /^[A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F_.:|,-]{0,999}$/, // lista de ids separada por comas (comparar)
  text: /^[^\u0000-\u001f\u007f<>]{0,120}$/,  // texto libre corto (búsqueda, región)
  flag: /^[A-Za-z0-9_-]{0,40}$/,            // pestaña, grupo, marca corta
} as const;
export type ParamKind = keyof typeof PATTERNS;

/** Valor saneado de un parámetro de pantalla: el valor si cumple la forma, '' si no. */
export function param(v: unknown, kind: ParamKind): string {
  let s = one(v);
  if (kind === 'cc') s = s.toUpperCase();
  return PATTERNS[kind].test(s) ? s : '';
}

/** Ruta relativa de un fichero de datos de la web (p. ej. series/ES/crops.json); '' si no es segura. */
export function dataPath(p: unknown): string {
  const s = one(p);
  if (!/^[A-Za-z0-9_][A-Za-z0-9_\-./]{0,200}\.json$/.test(s)) return '';
  if (s.split('/').some(x => x === '..' || x === '.' || x === '')) return '';
  return s;
}

export const MAX_JSON_BYTES = 12 * 1024 * 1024;   // el fichero más grande que sirve la web hoy ronda 1 MB

/** Convierte el texto recibido en JSON con límite de tamaño; lanza si es demasiado grande, no es JSON o no es un objeto. */
export function parseJson(text: string, maxBytes = MAX_JSON_BYTES): any {
  if (typeof text !== 'string' || text.length === 0) throw new Error('respuesta vacía');
  if (text.length > maxBytes) throw new Error('respuesta demasiado grande');
  const v = JSON.parse(text);
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('respuesta sin la forma esperada');
  return v;
}

/** Comprueba la forma mínima de cada fichero principal de la app. */
export function validMain(file: string, b: any): boolean {
  if (!b || typeof b !== 'object') return false;
  switch (file) {
    case 'prices': return Array.isArray(b.prices);
    case 'news': return Array.isArray(b.news);
    case 'countries': return Array.isArray(b.countries);
    case 'sections': return Array.isArray(b.sections);
    case 'today': return true;   // todos sus campos son opcionales en la app
    default: return true;
  }
}
