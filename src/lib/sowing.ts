// «Qué sembrar este año»: misma lógica que js/siembra.js de la web (rows y plan), sobre data/sowing/<pais>.json.
import type { Lang } from './types';

export interface SowCrop {
  name: Record<Lang, string>; yieldUnit: string; priceUnit: string; areaUnit: string; revUnit: string;
  price: { current: { value: number; kind: 'avg12m' | 'implied' | string; from?: string; to?: string } | null; hist: Record<string, number> };
  costs: { operating: number; year: string | number } | null;
  stocks: { ratio: number; avg5: number } | null;
}
export interface SowRegion { name: string; names?: Record<Lang, string>; crops: Record<string, { yield: Record<string, number>; area: Record<string, number>; rev?: Record<string, number> }> }
export interface SowDoc { country: string; areaUnit: 'ha' | 'acre'; currency: string; crops: Record<string, SowCrop>; regions: Record<string, SowRegion> }

export interface SowRow {
  k: string; C: SowCrop; area: number; share: number; maxShare: number; yMed: number; yMin: number; yMax: number; yrs: string[];
  p0: number; rev: number; revLo: number; revHi: number; cost: number | null; cKind: 'own' | 'ers' | null;
  margin: number | null; marLo: number | null; marHi: number | null; cv: number | null; st: 'high' | 'low' | 'norm' | null;
}
function median(a: number[]): number { const b = a.slice().sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
function cv(a: number[]): number | null { if (a.length < 3) return null; const m = a.reduce((s, x) => s + x, 0) / a.length; if (!m) return null; const v = a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1); return Math.sqrt(v) / Math.abs(m); }
function last(o: Record<string, number> | undefined, n: number): string[] { return Object.keys(o || {}).sort().slice(-n); }

export function sowRows(doc: SowDoc, code: string, costs: Record<string, string>): SowRow[] {
  const R = doc.regions[code]; if (!R) return [];
  const yLast: Record<string, number> = {};
  Object.keys(R.crops).forEach(k => { last(R.crops[k].area, 1).forEach(y => { yLast[y] = (yLast[y] || 0) + R.crops[k].area[y]; }); });
  const G = Math.max(0, ...Object.keys(yLast).map(Number)), out: SowRow[] = [];
  Object.keys(R.crops).forEach(k => {
    const rc = R.crops[k], C = doc.crops[k], yrs = last(rc.yield, 5); if (!C || yrs.length < 3) return;
    const ys = yrs.map(y => rc.yield[y]), ay = last(rc.area, 1)[0], area = ay ? rc.area[ay] : 0;
    const minA = doc.areaUnit === 'acre' ? 2000 : 500; if (area < minA || +ay < G - 2) return;
    const shares = last(rc.area, 5).map(y => { let tot = 0; Object.keys(R.crops).forEach(k2 => { tot += R.crops[k2].area[y] || 0; }); return tot ? rc.area[y] / tot : 0; });
    const p0 = C.price.current && C.price.current.value, ph = last(C.price.hist, 5).map(y => C.price.hist[y]);
    if (!p0) return;
    const pMin = Math.min(...ph, p0), pMax = Math.max(...ph, p0);
    const yMed = median(ys), rev = yMed * p0, revLo = Math.min(...ys) * pMin, revHi = Math.max(...ys) * pMax;
    const hr = last(rc.rev, 5).map(y => rc.rev![y]), v = cv(hr.length >= 3 ? hr : ys);
    const own = costs[doc.country + ':' + k], hasOwn = own !== undefined && own !== '' && isFinite(+own);
    const cost = hasOwn ? +own : (C.costs ? C.costs.operating : null), cKind: SowRow['cKind'] = hasOwn ? 'own' : (C.costs ? 'ers' : null);
    let st: SowRow['st'] = null; if (C.stocks) { const d = C.stocks.ratio / C.stocks.avg5 - 1; st = d > 0.1 ? 'high' : d < -0.1 ? 'low' : 'norm'; }
    out.push({ k, C, area, share: yLast[G] ? area / yLast[G] : 0, maxShare: Math.max(0, ...shares), yMed, yMin: Math.min(...ys), yMax: Math.max(...ys), yrs, p0, rev, revLo, revHi,
      cost, cKind, margin: cost != null ? rev - cost : null, marLo: cost != null ? revLo - cost : null, marHi: cost != null ? revHi - cost : null, cv: v, st });
  });
  const anyCost = out.some(x => x.margin != null);
  return out.sort((a, b) => anyCost ? ((b.margin ?? -1e9) - (a.margin ?? -1e9)) : b.rev - a.rev);
}

export interface SowPlan { anyCost: boolean; parts: { x: SowRow; s: number }[]; unassigned: number; excluded: SowRow[]; negative: SowRow[]; total: number; sum: number; lo: number; hi: number }
export function sowPlan(list: SowRow[], total: number): SowPlan {
  const anyCost = list.some(x => x.margin != null), use = list.filter(x => (anyCost ? x.margin != null : true));
  const val = (x: SowRow) => Math.max(0, anyCost ? x.margin! : x.rev);
  const cand = use.map(x => ({ x, w: val(x) / (1 + (x.cv || 0)), cap: Math.min(0.5, Math.max(x.maxShare >= 0.03 ? 0.05 : 0, 1.5 * x.maxShare)), s: 0 })).filter(c => c.w > 0 && c.cap >= 0.02);
  let left = 1, open = cand.slice(), guard = 0;
  while (open.length && left > 1e-6 && guard++ < 20) {
    const W = open.reduce((s, c) => s + c.w, 0), next: typeof cand = []; let used = 0;
    open.forEach(c => { const add = left * c.w / W; if (c.s + add >= c.cap) { used += c.cap - c.s; c.s = c.cap; } else next.push(c); });
    if (next.length === open.length) { open.forEach(c => { c.s += left * c.w / W; }); left = 0; break; }
    left -= used; open = next;
  }
  const assigned = cand.reduce((s, c) => s + c.s, 0);
  const parts = cand.filter(c => c.s > 0.004 && c.s * total >= 0.5).sort((a, b) => b.s - a.s).map(c => ({ x: c.x, s: c.s }));
  let sum = 0, lo = 0, hi = 0;
  parts.forEach(p => { const ha = p.s * total; sum += ha * (anyCost ? p.x.margin! : p.x.rev); lo += ha * (anyCost ? p.x.marLo! : p.x.revLo); hi += ha * (anyCost ? p.x.marHi! : p.x.revHi); });
  return { anyCost, parts, unassigned: Math.max(0, 1 - assigned), excluded: anyCost ? list.filter(x => x.margin == null) : [], negative: use.filter(x => val(x) <= 0), total, sum, lo, hi };
}
