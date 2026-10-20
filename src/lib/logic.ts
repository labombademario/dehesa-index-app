// Lógica pura (sin React): avisos, márgenes y relaciones de precios. Tiene pruebas en logic.test.ts.
import type { Price } from './types';

export interface AlertRule { id: string; priceId: string; cond: 'ge' | 'le'; value: number; on: boolean }
export type AlertState = { kind: 'paused' } | { kind: 'hit' } | { kind: 'gap'; gap: number } | { kind: 'missing' };

export function evaluateAlert(rule: AlertRule, price: Price | undefined): AlertState {
  if (!rule.on) return { kind: 'paused' };
  if (!price) return { kind: 'missing' };
  const hit = rule.cond === 'ge' ? price.value >= rule.value : price.value <= rule.value;
  return hit ? { kind: 'hit' } : { kind: 'gap', gap: Math.abs(rule.value - price.value) };
}

/**
 * Avisos que se acaban de cumplir. Solo avisa una vez: un aviso que ya estaba cumplido en la comprobación
 * anterior (prevHit) no se repite; cuando deja de cumplirse sale de la lista y puede volver a avisar.
 */
export function newlyHit(rules: AlertRule[], prices: Price[], prevHit: string[]): { fire: { rule: AlertRule; price: Price }[]; hit: string[] } {
  const prev = new Set(prevHit), hit: string[] = [], fire: { rule: AlertRule; price: Price }[] = [];
  for (const rule of rules) {
    const price = prices.find(p => p.id === rule.priceId);
    if (!price) { if (prev.has(rule.id)) hit.push(rule.id); continue; }   // precio aún sin cargar (p. ej. país UE): no se olvida que ya se avisó
    if (evaluateAlert(rule, price).kind !== 'hit') continue;
    hit.push(rule.id);
    if (!prev.has(rule.id)) fire.push({ rule, price });
  }
  return { fire, hit };
}

/** Margen de un cultivo: ingresos − costes, precio de equilibrio por tonelada y colchón sobre el precio */
export function cropMargin(ha: number, yieldT: number, costHa: number, priceT: number) {
  const income = ha * yieldT * priceT, cost = ha * costHa, margin = income - cost;
  const breakEven = yieldT > 0 ? costHa / yieldT : null;
  const cushionPct = breakEven != null && priceT > 0 ? (priceT - breakEven) / priceT * 100 : null;
  return { income, cost, margin, perHa: ha > 0 ? margin / ha : null, breakEven, cushionPct };
}

/** Margen ganadero con precio por kg (leche €/100 kg -> /100 antes de llamar) */
export function herdMargin(kgSold: number, pricePerKg: number, costPerKg: number) {
  const income = kgSold * pricePerKg, cost = kgSold * costPerKg;
  return { income, cost, margin: income - cost, cushionPct: pricePerKg > 0 ? (pricePerKg - costPerKg) / pricePerKg * 100 : null };
}

/** Relación entre dos precios ahora y hace un año. Devuelve null si falta algún dato o no comparten unidad de cálculo. */
export function ratio(numerator: Price | undefined, denominator: Price | undefined, factor = 1) {
  if (!numerator || !denominator) return null;
  const now = numerator.value / denominator.value * factor;
  const ago = numerator.yearAgo && denominator.yearAgo ? numerator.yearAgo.value / denominator.yearAgo.value * factor : null;
  return { now, ago };
}

/** Variación entre el primer y el último punto (para ordenar «lo que más se ha movido») */
export function movers(prices: Price[], ids: string[], n = 3): Price[] {
  return ids.map(id => prices.find(p => p.id === id)).filter((p): p is Price => !!p && p.changePct != null)
    .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0)).slice(0, n);
}

/** Búsqueda sin acentos ni mayúsculas */
export function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Abono vinculado a un precio de referencia (monitor de insumos): escenario «por variación».
 * Parte de lo que el agricultor apuntó (fertHa €/ha) y de la referencia fijada en ese momento (ref); si la referencia actual (cur) es otra,
 * el abono cambiaría en la misma proporción. Solo calcula: no cambia ningún importe.
 */
export function fertScenario(fertHa: number, ref: number, cur: number): { pct: number; deltaHa: number; newFert: number } | null {
  if (!(fertHa > 0) || !(ref > 0) || !(cur > 0)) return null;
  const pct = (cur / ref - 1) * 100;
  if (Math.abs(pct) < 0.05) return null;
  const deltaHa = fertHa * (cur / ref - 1);
  return { pct, deltaHa, newFert: fertHa + deltaHa };
}

export type FarmLine = { ha: number; yld: number; cost: number; price: number };
/** Total de la explotación: solo con las líneas con precio de referencia y datos (no se suman líneas sin precio) */
export function farmTotals(lines: FarmLine[]) {
  const ok = lines.filter(l => l.price > 0 && l.ha > 0 && l.yld > 0);
  let income = 0, cost = 0;
  for (const l of ok) { const m = cropMargin(l.ha, l.yld, l.cost, l.price); income += m.income; cost += m.cost; }
  return { n: ok.length, income, cost, margin: income - cost };
}
/** Sensibilidad conjunta: el margen total si UNA variable (precio, rendimiento o coste) cambia ±step % en todas las líneas a la vez. No es una previsión. */
export function farmSensitivity(lines: FarmLine[], vary: 'price' | 'yield' | 'cost', stepPct: number) {
  const f = (k: number) => farmTotals(lines.map(l => ({ ...l, price: vary === 'price' ? l.price * k : l.price, yld: vary === 'yield' ? l.yld * k : l.yld, cost: vary === 'cost' ? l.cost * k : l.cost }))).margin;
  const st = stepPct / 100;
  return { down: f(1 - st), now: f(1), up: f(1 + st) };
}
