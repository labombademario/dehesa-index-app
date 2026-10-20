// Comparador de facturas: mismas reglas que js/comparador-facturas.js y js/market-lookup.js de la web.
// Cada factura (fecha, cantidad, precio) se compara con el precio de mercado de una serie pública en la MISMA fecha y con la MISMA cantidad.
// Mensual: el mismo mes. Trimestral: el mismo trimestre. Semanal: la última cotización de los 14 días anteriores. Diaria: los 7 días anteriores.
// Sin dato de mercado = la línea no entra (nunca se rellena ni se estima). Todo se calcula en el teléfono: no se envía ni se guarda nada.
export type Pt = [string, number];
export type Freq = 'monthly' | 'quarterly' | 'weekly' | 'daily' | string;
export type Parsed = { rows: { date: string; qty: number; price: number }[]; bad: [number, string, string][]; comma: boolean };
export type Line = { date: string; qty: number; price: number; mkt: number; md: string };
export type Result = { lines: Line[]; skipped: number; bad: Parsed['bad']; comma: boolean; q: number; paid: number; mkt: number; tot: number };

const pad = (n: number) => (n < 10 ? '0' : '') + n;
/** «1.500» o «1,000» pueden ser 1,5 o 1500: no se adivina, se rechaza */
export function amb(s: string | null | undefined) {
  const m = /^(-?)([1-9]\d{0,2})[.,](\d{3})$/.exec(String(s ?? '').trim().replace(/\s/g, ''));
  return m ? { raw: m[0], dec: parseFloat(m[1] + m[2] + '.' + m[3]), thou: parseInt(m[1] + m[2] + m[3], 10) } : null;
}
export function num(s: string | null | undefined): number {
  let x = String(s ?? '').trim().replace(/\s/g, '');
  if (amb(x)) return NaN;
  const c = x.lastIndexOf(','), d = x.lastIndexOf('.');
  if (c > -1 && d > -1) x = c > d ? x.replace(/\./g, '').replace(',', '.') : x.replace(/,/g, '');
  else if (d > -1 && x.indexOf('.') !== d) x = x.replace(/\./g, '');
  else if (c > -1 && x.indexOf(',') !== c) x = x.replace(/,/g, '');
  else x = x.replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(x) ? parseFloat(x) : NaN;
}
function valid(d: string): string | null { const p = d.split('-'), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); return t.getUTCFullYear() === +p[0] && t.getUTCMonth() === +p[1] - 1 && t.getUTCDate() === +p[2] ? d : null; }
export function parseDate(s: string): string | null {
  s = String(s).trim(); let m: RegExpExecArray | null;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return valid(m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]));
  if ((m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(s))) return valid(m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]));
  return null;
}
const dayT = (d: string) => { const p = d.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
const pointT = (d: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
export function lookup(frequency: Freq, pts: Pt[], date: string): Pt | null {
  const y = date.slice(0, 4), mo = +date.slice(5, 7);
  if (frequency === 'monthly') { const k = y + '-' + pad(mo); return pts.find(p => p[0].slice(0, 7) === k) ?? null; }
  if (frequency === 'quarterly') { const q = y + '-Q' + Math.ceil(mo / 3); return pts.find(p => p[0] === q) ?? null; }
  const tt = dayT(date), tol = (frequency === 'daily' ? 7 : 14) * 86400000; let best: Pt | null = null;
  for (const p of pts) { const t = pointT(p[0]); if (!isNaN(t) && t <= tt && tt - t <= tol) best = p; }
  return best;
}
export function parse(text: string): Parsed {
  const rows: Parsed['rows'] = [], bad: Parsed['bad'] = []; let comma = false; const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim(); if (!ln) continue;
    const byComma = ln.indexOf('\t') < 0 && ln.indexOf(';') < 0;
    const p = (ln.indexOf('\t') > -1 ? ln.split('\t') : ln.indexOf(';') > -1 ? ln.split(';') : ln.split(',')).map(x => x.trim());
    const d = parseDate(p[0]);
    if (!d && i === 0 && rows.length === 0 && !/\d/.test(p[0])) continue;   // cabecera
    let q: number, pr: number;
    if (p.length === 2) { q = 1; pr = num(p[1]); } else { q = num(p[1]); pr = num(p[2]); }
    if (byComma && d && p.length > 3) { bad.push([i + 1, ln, '']); continue; }
    if (byComma && d) comma = true;
    if (!d || isNaN(pr) || isNaN(q) || q <= 0) { bad.push([i + 1, ln, amb(p[1]) ? p[1] : p.length > 2 && amb(p[2]) ? p[2] : '']); continue; }
    rows.push({ date: d, qty: q, price: pr });
  }
  return { rows, bad, comma };
}
export function compute(frequency: Freq, pts: Pt[], parsed: Parsed): Result {
  const lines: Line[] = []; let skipped = 0, Q = 0, P = 0, M = 0;
  for (const r of parsed.rows) {
    const pt = lookup(frequency, pts, r.date); if (!pt) { skipped++; continue; }
    lines.push({ date: r.date, qty: r.qty, price: r.price, mkt: pt[1], md: pt[0] });
    Q += r.qty; P += r.qty * r.price; M += r.qty * pt[1];
  }
  return { lines, skipped, bad: parsed.bad, comma: parsed.comma, q: Q, paid: Q ? P / Q : 0, mkt: Q ? M / Q : 0, tot: P - M };
}
