/** Cuantiles sobre los valores distintos publicados, hasta 5 clases (con empates no se repiten cortes) */
export function classify(vals: number[]) {
  const sorted = vals.slice().sort((a, b) => a - b);
  const d = Array.from(new Set(sorted));   // cortes sobre valores distintos: con empates (muchos ceros) los cortes no se repiten y todas las clases existen
  const n = Math.min(5, Math.max(1, d.length));
  const br: number[] = [];
  for (let i = 1; i < n; i++) br.push(d[Math.floor(d.length * i / n)]);
  const cls = (x: number) => { let c = 0; for (const b of br) if (x >= b) c++; return Math.min(c, n - 1); };
  return { n, br, cls, min: sorted[0], max: sorted[sorted.length - 1] };
}
