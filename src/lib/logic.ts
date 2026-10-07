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
