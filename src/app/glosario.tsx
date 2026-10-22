// Glosario: siglas, términos de precio y términos de Dehesa (mismo fichero que la web: data/glosario-<idioma>.json).
import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle } from '../components/ui';
import { C } from '../lib/theme';
import { webJson } from '../lib/fv';
import { tx, type T4 } from '../lib/tx';

type E = { id: string; c: string; t: string[]; d: string };
const CAT: Record<string, T4> = {
  dehesa: { es: 'Términos de Dehesa', en: 'Dehesa terms', fr: 'Termes de Dehesa', it: 'Termini di Dehesa' },
  pre: { es: 'Precios y mercados', en: 'Prices and markets', fr: 'Prix et marchés', it: 'Prezzi e mercati' },
  inf: { es: 'Informes y bases de datos', en: 'Reports and databases', fr: 'Rapports et bases de données', it: 'Rapporti e banche dati' },
  org: { es: 'Organismos', en: 'Agencies', fr: 'Organismes', it: 'Enti' },
  ind: { es: 'Índices', en: 'Indices', fr: 'Indices', it: 'Indici' },
  con: { es: 'Conceptos', en: 'Concepts', fr: 'Concepts', it: 'Concetti' },
  uni: { es: 'Unidades', en: 'Units', fr: 'Unités', it: 'Unità' },
  pol: { es: 'Políticas', en: 'Policies', fr: 'Politiques', it: 'Politiche' },
};
const ORDER = ['dehesa', 'pre', 'inf', 'org', 'ind', 'con', 'uni', 'pol'];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Glosario() {
  const { user, t } = useApp();
  const L = user.lang;
  const [es, setEs] = useState<E[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setEs(null); setErr(false);
    webJson('data/glosario-' + L + '.json', 24 * 3600e3).then((d: { entries?: E[] } | null) => { if (!alive) return; if (d?.entries) setEs(d.entries); else setErr(true); });
    return () => { alive = false; };
  }, [L]);
  const groups = useMemo(() => {
    if (!es) return [];
    const k = norm(q.trim());
    const f = k ? es.filter(e => norm(e.t.join(' ') + ' ' + e.d).includes(k)) : es;
    return ORDER.map(c => ({ c, items: f.filter(e => e.c === c).sort((a, b) => a.t[0].localeCompare(b.t[0])) })).filter(g => g.items.length);
  }, [es, q]);
  const ttl = tx(L, { es: 'Glosario', en: 'Glossary', fr: 'Glossaire', it: 'Glossario' });
  return (
    <Screen>
      <Stack.Screen options={{ title: ttl }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">📖 {ttl}</Text>
      <Text style={{ fontSize: 13, color: C.textMuted }}>{tx(L, { es: 'Siglas y términos técnicos que aparecen en los datos, con su definición en una línea.', en: 'Acronyms and technical terms used in the data, defined in one line.', fr: 'Sigles et termes techniques utilisés dans les données, définis en une ligne.', it: 'Sigle e termini tecnici usati nei dati, definiti in una riga.' })}</Text>
      <TextInput value={q} onChangeText={setQ} placeholder={tx(L, { es: 'Buscar un término…', en: 'Search a term…', fr: 'Chercher un terme…', it: 'Cerca un termine…' })} placeholderTextColor={C.textMuted}
        accessibilityLabel={ttl} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
        style={{ height: 44, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: C.text, backgroundColor: C.surfaceAlt }} />
      {err ? <Note>{t('missing')}</Note> : !es ? <Note>{t('loading')}</Note> : !groups.length ? <Note>{tx(L, { es: 'Ningún término coincide.', en: 'No term matches.', fr: 'Aucun terme ne correspond.', it: 'Nessun termine corrisponde.' })}</Note> : groups.map(g => (
        <React.Fragment key={g.c}>
          <SectionTitle>{tx(L, CAT[g.c])}</SectionTitle>
          <Card>
            {g.items.map((e, i) => (
              <React.Fragment key={e.id}>
                <Row first={i === 0} title={e.t.join(' · ')} right={open === e.id ? '−' : '+'} onPress={() => setOpen(open === e.id ? null : e.id)} />
                {open === e.id || q.trim() ? <Text style={{ fontSize: 13.5, lineHeight: 20, color: C.textMuted, paddingHorizontal: 14, paddingBottom: 12 }}>{e.d}</Text> : null}
              </React.Fragment>
            ))}
          </Card>
        </React.Fragment>
      ))}
    </Screen>
  );
}
