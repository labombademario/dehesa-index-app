// Botón «Descargar datos (CSV)»: baja la serie completa (si hay histórico largo) y la comparte como texto CSV con su fuente y licencia en cada fila.
// Sin módulos nativos nuevos: en iPhone/Android abre la hoja de compartir (Archivos, Notas, correo…); en la versión web descarga un fichero.
import React, { useState } from 'react';
import { Platform, Share } from 'react-native';
import { Button } from './ui';
import { useApp } from '../lib/store';
import { buildCsv, csvFileName } from '../lib/csv';
import { sourceInfo } from './SourceCite';
import { tx } from '../lib/tx';

type Pts = [string, number][];
export function ExportCsv({ title, unit, place, sourceId, sourceName, points, load }: { title: string; unit: string; place?: string; sourceId?: string | null; sourceName?: string; points: Pts; load?: () => Promise<Pts | null> }) {
  const { user } = useApp();
  const L = user.lang;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const go = async () => {
    if (busy) return;
    setBusy(true); setMsg('');
    try {
      const full = load ? await load().catch(() => null) : null;
      const pts = full && full.length >= points.length ? full : points;
      const s = sourceId ? await sourceInfo(sourceId) : null;
      const csv = buildCsv(pts, { series: title, place, unit, source: s?.name ?? sourceName ?? (sourceId || ''), license: s?.licenseName, attribution: s?.attributionText });
      const name = csvFileName(title);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await Share.share({ title: name, message: csv });
      }
    } catch { setMsg(tx(L, { es: 'No se pudo exportar. Inténtalo de nuevo.', en: 'Could not export. Please try again.', fr: 'Export impossible. Réessayez.', it: 'Esportazione non riuscita. Riprova.' })); }
    setBusy(false);
  };
  return <Button kind="secondary" label={msg || tx(L, { es: 'Descargar datos (CSV)', en: 'Download data (CSV)', fr: 'Télécharger les données (CSV)', it: 'Scarica i dati (CSV)' })} onPress={go} />;
}
