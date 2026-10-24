// Cita de fuente bajo una cifra (como js/cite.js de la web): una línea corta que, al pulsarla, despliega la fuente completa con enlace,
// la licencia y el texto de atribución tal como los publica la fuente. Todo sale de data/views/license-cite.json (generado desde data/license-registry.json)
// a través del sourceId: ningún texto de fuente o licencia se escribe a mano en las pantallas.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../lib/store';
import { webJson } from '../lib/fv';
import { C } from '../lib/theme';
import { date as fmtDate } from '../lib/format';
import { tx } from '../lib/tx';
import { openSafe } from '../lib/openLink';

type Src = { name: string; short?: string; url?: string; licenseUrl?: string; licenseName?: string; attributionText?: string; verifiedAt?: string; status?: string; aliases?: string[] };
let REG: Record<string, Src> | null = null;
let PENDING: Promise<Record<string, Src> | null> | null = null;
function loadReg(): Promise<Record<string, Src> | null> {
  if (REG) return Promise.resolve(REG);
  if (!PENDING) PENDING = webJson('data/views/license-cite.json', 24 * 3600e3).then((d: { sources?: Record<string, Src> } | null) => { REG = d?.sources ?? null; PENDING = null; return REG; });
  return PENDING;
}
function find(reg: Record<string, Src>, id: string): Src | null {
  if (reg[id]) return reg[id];
  for (const k of Object.keys(reg)) if ((reg[k].aliases || []).includes(id)) return reg[k];
  return null;
}
/** Datos de una fuente (nombre, licencia, atribución) para otras pantallas, p. ej. el CSV */
export async function sourceInfo(id: string): Promise<Src | null> { const r = await loadReg(); return r ? find(r, id) : null; }
const safe = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : '');

export function SourceCite({ sourceId, period }: { sourceId?: string | null; period?: string | null }) {
  const { user } = useApp();
  const L = user.lang;
  const [reg, setReg] = useState<Record<string, Src> | null>(REG);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!REG) loadReg().then(setReg); }, []);
  const s = reg && sourceId ? find(reg, sourceId) : null;
  if (!s) return null;
  const per = period ? (/^\d{4}-\d{2}-\d{2}$/.test(period) ? fmtDate(period, L) : period) : '';
  const lab = { fontSize: 12, color: C.textMuted };
  const link = (label: string, url?: string) => (safe(url) ? <Pressable onPress={() => openSafe(url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{label}</Text></Pressable> : <Text style={lab}>{label}</Text>);
  return (
    <View style={{ gap: 4 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={tx(L, { es: 'Fuente y licencia', en: 'Source and licence', fr: 'Source et licence', it: 'Fonte e licenza' })}>
        <Text style={lab}>{tx(L, { es: 'Fuente', en: 'Source', fr: 'Source', it: 'Fonte' })}: {s.short || s.name}{per ? ' · ' + per : ''} {open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? <View style={{ gap: 3 }}>
        {link(s.name, s.url)}
        {s.licenseName ? <Text style={lab}>{tx(L, { es: 'Licencia', en: 'Licence', fr: 'Licence', it: 'Licenza' })}: {s.licenseName}</Text> : null}
        {safe(s.licenseUrl) ? link(tx(L, { es: 'Condiciones de reutilización', en: 'Reuse terms', fr: 'Conditions de réutilisation', it: 'Condizioni di riutilizzo' }), s.licenseUrl) : null}
        {s.attributionText ? <Text style={lab}>{s.attributionText}</Text> : null}
        <Text style={lab}>{s.status === 'VERIFIED'
          ? tx(L, { es: 'Licencia verificada', en: 'Licence verified', fr: 'Licence vérifiée', it: 'Licenza verificata' }) + (s.verifiedAt ? ' · ' + fmtDate(s.verifiedAt, L) : '')
          : tx(L, { es: 'Licencia de reutilización aún sin verificar: se cita la fuente tal como la publica el dato.', en: 'Reuse licence not yet verified: the source is cited as published with the data.', fr: 'Licence de réutilisation pas encore vérifiée : la source est citée telle que publiée avec la donnée.', it: 'Licenza di riutilizzo non ancora verificata: la fonte è citata come pubblicata con il dato.' })}</Text>
      </View> : null}
    </View>
  );
}
