// CSV de una serie (como el que baja la web desde el comparador): fecha, valor y, en cada fila, la unidad, la serie, la fuente y la licencia.
// Una hoja de cálculo no debe interpretar una celda como fórmula: las que empiezan por = + - @ o tabulador llevan un apóstrofo delante.
export type CsvMeta = { series: string; place?: string; unit: string; source: string; license?: string; attribution?: string };

export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  let x = String(v);
  if (/^[=+\-@\t\r]/.test(x)) x = "'" + x;
  return /[",\n\r;]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
}

export function buildCsv(points: [string, number][], m: CsvMeta): string {
  const head = ['date', 'value', 'unit', 'series', 'place', 'source', 'license', 'attribution'];
  const rows = points.filter(p => typeof p[1] === 'number' && Number.isFinite(p[1])).map(p => [p[0], p[1], m.unit, m.series, m.place ?? '', m.source, m.license ?? '', m.attribution ?? '']);
  return '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function csvFileName(series: string): string {
  const s = series.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return 'dehesa-index-' + (s || 'serie') + '.csv';
}
