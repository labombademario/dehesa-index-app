// Provincias de España: clima del mes frente a lo normal (NASA POWER) y censos de ganado (MAPA), como en «Mi mercado» de la web.
// Lee data/app/v1/prov/ES.json (scripts/build-app-prov.mjs). No se calcula ni se estima nada en la app.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle, Segmented } from '../components/ui';
import { RangeChart } from '../components/RangeChart';
import { C, changeColor } from '../lib/theme';
import { num, pct, date as fmtDate } from '../lib/format';
import { webJson } from '../lib/fv';
import { norm } from '../lib/logic';
import { tx } from '../lib/tx';
import { openSafe } from '../lib/openLink';
import { param } from '../lib/safe';

type Hist = { from: string; p: (number | null)[]; t: (number | null)[]; bp: number[]; bt: number[] };
type Clim = { city: string; m: [string, number, number, number | null, number, number, number][]; h?: Hist };
type Prov = { id: string; name: string; climate: Clim | null; live: Record<string, [string, number][]>; jcyl?: [string, string, number, number, number | null, number | null][] };
type Doc = { baseline: string; climateAsOf: string; climateSource: { name: string; url: string }; liveSource: { name: string; url: string }; jcylSource?: { name: string; url: string; license: string; lastPeriod: string }; provinces: Prov[] };
const SP: Record<string, [string, string, string, string]> = { bovino: ['🐄 Vacuno', '🐄 Cattle', '🐄 Bovins', '🐄 Bovini'], ovino: ['🐑 Ovino', '🐑 Sheep', '🐑 Ovins', '🐑 Ovini'], caprino: ['🐐 Caprino', '🐐 Goats', '🐐 Caprins', '🐐 Caprini'], porcino: ['🐖 Porcino', '🐖 Pigs', '🐖 Porcins', '🐖 Suini'] };
const LI = { es: 0, en: 1, fr: 2, it: 3 } as const;
type CropsIdx = { groups?: Record<string, { campaigns?: number[] }> };
const GRP: Record<string, [string, string, string, string]> = { cereales: ['cereales', 'cereals', 'céréales', 'cereali'], leguminosas: ['leguminosas', 'pulses', 'légumineuses', 'leguminose'], tuberculos: ['tubérculos', 'tubers', 'tubercules', 'tuberi'], industriales: ['cultivos industriales', 'industrial crops', 'cultures industrielles', 'colture industriali'], hortalizas: ['hortalizas', 'vegetables', 'légumes', 'ortaggi'], citricos: ['cítricos', 'citrus', 'agrumes', 'agrumi'], frutales: ['frutales', 'fruit trees', 'arbres fruitiers', 'frutta da albero'], olivar: ['olivar', 'olive groves', 'oliveraies', 'oliveti'], vinedo: ['viñedo', 'vineyards', 'vignobles', 'vigneti'], otros_lenosos: ['otros leñosos', 'other woody crops', 'autres ligneux', 'altre legnose'] };
// Línea de campaña: se calcula con data/spain-crops/index.json (MAPA). Cuando el MAPA publica más grupos cambia sola y desaparece cuando están todos.
function campaignLine(ix: CropsIdx | null, L: 'es' | 'en' | 'fr' | 'it', fallback: string): string | null {
  const G = ix?.groups; if (!G) return fallback;
  const keys = Object.keys(G); let mx = 0, prev = 0;
  keys.forEach(k => (G[k].campaigns ?? []).forEach(c => { if (c > mx) mx = c; }));
  if (!mx) return fallback;
  const have = keys.filter(k => (G[k].campaigns ?? []).includes(mx));
  if (have.length === keys.length) return null;
  keys.forEach(k => (G[k].campaigns ?? []).forEach(c => { if (c < mx && c > prev) prev = c; }));
  const i = LI[L], g = have.map(k => (GRP[k] ? GRP[k][i] : k)).join(', ');
  return [`Campaña ${mx}: solo los grupos que el MAPA ya ha publicado (${g}); el resto está en la campaña ${prev || mx - 1}.`, `Campaign ${mx}: only the groups MAPA has already published (${g}); the rest is in campaign ${prev || mx - 1}.`, `Campagne ${mx} : seulement les groupes déjà publiés par le MAPA (${g}) ; le reste est dans la campagne ${prev || mx - 1}.`, `Campagna ${mx}: solo i gruppi già pubblicati dal MAPA (${g}); il resto è nella campagna ${prev || mx - 1}.`][i];
}
const iso = (p: string) => (p.length === 7 ? p + '-01' : p);
const r1 = (v: number) => Math.round(v * 10) / 10;
// Meses de un año a partir del histórico compacto: mismo cálculo que la web (media mm/día × días del mes; diferencia con la media redondeada)
function climYear(H: Hist, y: number) {
  const y0 = +H.from.slice(0, 4), out: { period: string; p: number | null; pb: number; pct: number | null; t: number | null; tb: number; dt: number | null }[] = [];
  for (let mi = 0; mi < 12; mi++) {
    const i = (y - y0) * 12 + mi - (+H.from.slice(5, 7) - 1); if (i < 0 || i >= H.p.length) continue;
    const days = new Date(Date.UTC(y, mi + 1, 0)).getUTCDate(), pb = r1(H.bp[mi] * days), tb = r1(H.bt[mi]), p = H.p[i], t = H.t[i];
    out.push({ period: y + '-' + (mi < 9 ? '0' : '') + (mi + 1), p, pb, pct: p == null || !(pb > 0) ? null : r1(100 * (p / pb - 1)), t, tb, dt: t == null ? null : r1(t - tb) });
  }
  return out;
}
const jcNice = (n: string) => { const x = n.toLowerCase(); return (x.charAt(0).toUpperCase() + x.slice(1)).replace(/\bigp\b/i, 'IGP').replace(/^m\.g\./i, 'M.G.').replace(/\bc\.c\./i, 'C.C.'); };

export default function Provincias() {
  const { user } = useApp();
  const L = user.lang;
  const rp = useLocalSearchParams<{ p?: string }>();   // parámetros saneados: un valor raro (p. ej. desde dehesaindex://) cuenta como no encontrado
  const p0 = param(rp.p, 'text') || undefined;
  const { width } = useWindowDimensions();
  const cw = Math.min(width, 700) - 32 - 28;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [done, setDone] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(p0 ? String(p0) : null);
  const [sp, setSp] = useState('bovino');
  const [yr, setYr] = useState<string>('last');
  const [cropsIx, setCropsIx] = useState<CropsIdx | null>(null);
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  useEffect(() => { webJson('data/app/v1/prov/ES.json', 6 * 3600e3).then(d => { setDoc(d); setDone(true); }); }, []);
  useEffect(() => { webJson('data/spain-crops/index.json', 12 * 3600e3).then(setCropsIx); }, []);
  const list = useMemo(() => { const k = norm(q.trim()); return (doc?.provinces ?? []).filter(x => !k || norm(x.name).includes(k)); }, [doc, q]);
  const pv = doc?.provinces.find(x => x.id === sel) ?? null;
  const species = pv ? Object.keys(SP).filter(k => pv.live[k]) : [];
  const spCur = species.includes(sp) ? sp : species[0];
  const live = pv && spCur ? pv.live[spCur] : null;
  const last = pv?.climate?.m[pv.climate.m.length - 1];
  const H = pv?.climate?.h ?? null;
  const years = useMemo(() => { if (!H) return [] as number[]; const y0 = +H.from.slice(0, 4), y1 = y0 + Math.floor((+H.from.slice(5, 7) - 1 + H.p.length - 1) / 12); const a: number[] = []; for (let y = y1; y >= y0; y--) a.push(y); return a; }, [H]);
  const yrRows = H && yr !== 'last' ? climYear(H, +yr) : null;
  const yrFull = yrRows && yrRows.length === 12 && yrRows.every(x => x.p != null && x.t != null);
  const campLine = campaignLine(cropsIx, L, T('Campaña de cultivos: aún sin datos cargados.', 'Crop campaign: no data loaded yet.', 'Campagne des cultures : pas encore de données chargées.', 'Campagna delle colture: nessun dato ancora caricato.'));
  const title = T('Provincias de España', 'Provinces of Spain', 'Provinces d’Espagne', 'Province della Spagna');
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{pv ? pv.name : title}</Text>
      {!doc ? <Note>{done ? T('Sin datos ahora mismo.', 'No data right now.', 'Pas de données pour le moment.', 'Nessun dato al momento.') : T('Cargando…', 'Loading…', 'Chargement…', 'Caricamento…')}</Note> : !pv ? <>
        <Note>{T('Elige una provincia: lluvia y temperatura del mes frente a lo normal y censos de ganado.', 'Pick a province: rainfall and temperature for the month against normal, and livestock counts.', 'Choisissez une province : pluie et température du mois par rapport à la normale, et effectifs d’élevage.', 'Scegli una provincia: pioggia e temperatura del mese rispetto alla norma ed effettivi zootecnici.')}</Note>
        <TextInput value={q} onChangeText={setQ} placeholder={T('Buscar provincia', 'Search province', 'Rechercher une province', 'Cerca provincia')} placeholderTextColor={C.textMuted} autoCorrect={false} clearButtonMode="while-editing"
          style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: C.text }} />
        <Card>{list.map((x, i) => <Row key={x.id} first={i === 0} title={x.name} sub={[x.climate ? '🌦️' : '', Object.keys(x.live).length ? '🐄' : ''].filter(Boolean).join(' ')} onPress={() => { setSel(x.id); setYr('last'); }} />)}</Card>
      </> : <>
        <Pressable onPress={() => setSel(null)} accessibilityRole="button"><Text style={{ color: C.accent, fontWeight: '600' }}>‹ {T('Otra provincia', 'Another province', 'Autre province', 'Altra provincia')}</Text></Pressable>
        {last && pv.climate ? <>
          <SectionTitle>{'🌦️ ' + T('Clima', 'Climate', 'Climat', 'Clima')}</SectionTitle>
          <Text style={{ fontSize: 12.5, color: C.textMuted }}>{T(`Punto de ${pv.climate.city}. Frente a la media ${doc.baseline} del mismo mes.`, `Point at ${pv.climate.city}. Against the ${doc.baseline} average for the same month.`, `Point de ${pv.climate.city}. Par rapport à la moyenne ${doc.baseline} du même mois.`, `Punto di ${pv.climate.city}. Rispetto alla media ${doc.baseline} dello stesso mese.`)}</Text>
          <Card>
            <Row first title={T('Lluvia', 'Rainfall', 'Pluie', 'Pioggia') + ' · ' + fmtDate(last[0], L)} sub={T('Normal: ', 'Normal: ', 'Normale : ', 'Norma: ') + num(last[2], L, 1) + ' mm'} right={num(last[1], L, 1) + ' mm'} rightSub={last[3] == null ? undefined : pct(last[3], L)} rightColor={changeColor(last[3])} />
            <Row title={T('Temperatura media', 'Mean temperature', 'Température moyenne', 'Temperatura media') + ' · ' + fmtDate(last[0], L)} sub={T('Normal: ', 'Normal: ', 'Normale : ', 'Norma: ') + num(last[5], L, 1) + ' °C'} right={num(last[4], L, 1) + ' °C'} rightSub={(last[6] >= 0 ? '+' : '−') + num(Math.abs(last[6]), L, 1) + ' °C'} rightColor={changeColor(-last[6])} />
          </Card>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Lluvia frente a lo normal (%)', 'Rainfall against normal (%)', 'Pluie par rapport à la normale (%)', 'Pioggia rispetto alla norma (%)')}</Text>
          <RangeChart key={pv.id + 'r'} points={pv.climate.m.filter(x => x[3] != null).map(x => [iso(x[0]), x[3] as number] as [string, number])} unit="%" label={T('Lluvia frente a lo normal', 'Rainfall against normal', 'Pluie par rapport à la normale', 'Pioggia rispetto alla norma')} width={cw} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Temperatura frente a lo normal (°C)', 'Temperature against normal (°C)', 'Température par rapport à la normale (°C)', 'Temperatura rispetto alla norma (°C)')}</Text>
          <RangeChart key={pv.id + 't'} points={pv.climate.m.map(x => [iso(x[0]), x[6]] as [string, number])} unit="°C" label={T('Temperatura frente a lo normal', 'Temperature against normal', 'Température par rapport à la normale', 'Temperatura rispetto alla norma')} width={cw} />
          {H ? <>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('Ver otro año', 'View another year', 'Voir une autre année', 'Vedi un altro anno')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['last', ...years.map(String)].map(k => (
                <Pressable key={k} onPress={() => setYr(k)} accessibilityRole="button" accessibilityState={{ selected: yr === k }}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: yr === k ? C.accent : C.border, backgroundColor: yr === k ? C.accent : C.surface }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: yr === k ? '#fff' : C.text }}>{k === 'last' ? T('Últimos 12 meses', 'Last 12 months', '12 derniers mois', 'Ultimi 12 mesi') : k}</Text>
                </Pressable>))}
            </ScrollView>
            {yrRows ? <>
              <Card>
                {yrRows.map((x, i) => (
                  <Row key={x.period} first={i === 0} title={fmtDate(x.period, L)}
                    sub={x.p == null ? T('sin dato', 'no data', 'pas de donnée', 'nessun dato') : T('Normal: ', 'Normal: ', 'Normale : ', 'Norma: ') + num(x.pb, L, 1) + ' mm · ' + num(x.tb, L, 1) + ' °C'}
                    right={x.p == null ? '—' : num(x.p, L, 1) + ' mm'} rightSub={x.t == null ? undefined : num(x.t, L, 1) + ' °C' + (x.dt == null ? '' : ' (' + (x.dt >= 0 ? '+' : '−') + num(Math.abs(x.dt), L, 1) + ')')} rightColor={changeColor(x.pct)} />))}
                {yrFull ? <Row title={T('Total del año', 'Year total', 'Total de l’année', 'Totale dell’anno')} sub={T('Temperatura media del año: ', 'Year mean temperature: ', 'Température moyenne de l’année : ', 'Temperatura media dell’anno: ') + num(yrRows!.reduce((a, x) => a + (x.t as number), 0) / 12, L, 1) + ' °C'} right={num(yrRows!.reduce((a, x) => a + (x.p as number), 0), L, 0) + ' mm'} /> : null}
              </Card>
              <Text style={{ fontSize: 12.5, color: C.textMuted }}>{T('Histórico desde 2001 (NASA POWER). El año en curso muestra solo los meses cerrados; el total del año se calcula solo con los 12 meses.', 'History since 2001 (NASA POWER). The current year shows only closed months; the year total is computed only with all 12 months.', 'Historique depuis 2001 (NASA POWER). L’année en cours n’affiche que les mois clos ; le total annuel n’est calculé qu’avec les 12 mois.', 'Storico dal 2001 (NASA POWER). L’anno in corso mostra solo i mesi chiusi; il totale annuo è calcolato solo con tutti i 12 mesi.')}</Text>
            </> : null}
          </> : null}
          <Pressable onPress={() => openSafe(doc.climateSource.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{T('Fuente: ', 'Source: ', 'Source : ', 'Fonte: ') + doc.climateSource.name}</Text></Pressable>
        </> : null}
        {pv.jcyl && pv.jcyl.length && doc.jcylSource ? <>
          <SectionTitle>{'🌾 ' + T('Precios en origen (Junta de Castilla y León)', 'Farm-gate prices (Junta de Castilla y León)', 'Prix à la production (Junta de Castilla y León)', 'Prezzi alla produzione (Junta de Castilla y León)')}</SectionTitle>
          <Card>
            {[...pv.jcyl].sort((a, b) => a[0].localeCompare(b[0], L)).map((r, i) => (
              <Row key={r[0]} first={i === 0} title={jcNice(r[0])} sub={fmtDate(String(r[2]).slice(0, 4) + '-' + String(r[2]).slice(4), L) + (r[5] == null ? '' : ' · ' + T('año ant.: ', 'vs year ago: ', 'vs an passé : ', 'vs anno prima: ') + pct(r[5], L))}
                right={num(r[3], L, 2) + ' ' + r[1]} rightSub={r[4] == null ? undefined : pct(r[4], L)} rightColor={changeColor(r[4])} />))}
          </Card>
          <Text style={{ fontSize: 12.5, color: C.textMuted }}>{T('Precio mensual en origen que publica la Junta de Castilla y León (sin transporte, subvenciones ni impuestos indirectos). La cifra pequeña es el cambio frente al mes anterior. Solo productos con dato en los últimos 12 meses.', 'Monthly farm-gate price published by the Junta de Castilla y León (excluding transport, subsidies and indirect taxes). The small figure is the change from the previous month. Only products with data in the last 12 months.', 'Prix mensuel à la production publié par la Junta de Castilla y León (hors transport, subventions et taxes indirectes). Le petit chiffre est la variation par rapport au mois précédent. Seulement les produits avec donnée sur les 12 derniers mois.', 'Prezzo mensile alla produzione pubblicato dalla Junta de Castilla y León (esclusi trasporto, sussidi e imposte indirette). La cifra piccola è la variazione sul mese precedente. Solo prodotti con dato negli ultimi 12 mesi.')}</Text>
          <Pressable onPress={() => openSafe(doc.jcylSource!.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{T('Fuente: ', 'Source: ', 'Source : ', 'Fonte: ') + doc.jcylSource.name + ' · ' + doc.jcylSource.license}</Text></Pressable>
        </> : null}
        {live && spCur ? <>
          <SectionTitle>{'🐄 ' + T('Ganadería', 'Livestock', 'Élevage', 'Zootecnia')}</SectionTitle>
          <Segmented options={species.map(k => ({ value: k, label: SP[k][LI[L]] }))} value={spCur} onChange={setSp} />
          <Card>
            <Row first title={SP[spCur][LI[L]]} sub={T('Censo de ', 'Count in ', 'Effectif de ', 'Censimento di ') + fmtDate(live[live.length - 1][0], L)} right={num(live[live.length - 1][1], L, 0)}
              rightSub={live.length > 2 && live[live.length - 3][1] ? pct((live[live.length - 1][1] / live[live.length - 3][1] - 1) * 100, L) : undefined} rightColor={live.length > 2 && live[live.length - 3][1] ? changeColor((live[live.length - 1][1] / live[live.length - 3][1] - 1) * 100) : undefined} />
          </Card>
          <Text style={{ fontSize: 12.5, color: C.textMuted }}>{T('Cabezas en total (mayo y noviembre). La variación compara con el mismo mes del año anterior.', 'Total head (May and November). Change is against the same month a year earlier.', 'Total de têtes (mai et novembre). La variation compare au même mois un an plus tôt.', 'Totale capi (maggio e novembre). La variazione confronta con lo stesso mese dell’anno prima.')}</Text>
          <RangeChart key={pv.id + spCur} points={live.map(x => [iso(x[0]), x[1]] as [string, number])} unit={T('cabezas', 'head', 'têtes', 'capi')} label={SP[spCur][LI[L]]} width={cw} />
          <Pressable onPress={() => openSafe(doc.liveSource.url)} accessibilityRole="link"><Text style={{ fontSize: 12, color: C.accent }}>{T('Fuente: ', 'Source: ', 'Source : ', 'Fonte: ') + doc.liveSource.name}</Text></Pressable>
        </> : null}
        <SectionTitle>{T('Lo que aún no tenemos para tu zona', 'What we do not have yet for your area', 'Ce que nous n’avons pas encore pour votre zone', 'Ciò che non abbiamo ancora per la tua zona')}</SectionTitle>
        <Card>
          <Row first title={T('Lonjas provinciales independientes', 'Independent provincial auction halls', 'Lonjas provinciales indépendantes', 'Borse merci provinciali indipendenti')}
            sub={T('No las incorporamos. Mostramos los mercados por provincia de la Comisión Europea y, en Castilla y León, los precios en origen de la Junta; el resto de precios que seguimos son nacionales, europeos o mundiales.', 'Not included. We show the province-level markets from the European Commission and, in Castilla y León, the Junta’s farm-gate prices; the other prices we follow are national, European or world.', 'Non incluses. Nous montrons les marchés par province de la Commission européenne et, en Castille-et-León, les prix à la production de la Junta ; les autres prix suivis sont nationaux, européens ou mondiaux.', 'Non incluse. Mostriamo i mercati per provincia della Commissione europea e, in Castilla y León, i prezzi alla produzione della Junta; gli altri prezzi che seguiamo sono nazionali, europei o mondiali.')}
            right="›" onPress={() => router.push('/lonjas')} />
          <Row title={T('Seguro agrario (Agroseguro)', 'Crop insurance (Agroseguro)', 'Assurance agricole (Agroseguro)', 'Assicurazione agraria (Agroseguro)')}
            sub={T('Solo cifras nacionales y pendientes de contraste; no por provincia.', 'National figures only, still pending verification; not by province.', 'Chiffres nationaux seulement, encore à vérifier ; pas par province.', 'Solo cifre nazionali, ancora da verificare; non per provincia.')}
            right="›" onPress={() => openSafe('https://dehesaindex.com/precios.html?tab=seguro')} />
          <Row title={T('Sequía por provincia', 'Drought by province', 'Sécheresse par province', 'Siccità per provincia')}
            sub={T('No hay cifra oficial por provincia; solo la sequía por cuenca hidrográfica.', 'There is no official figure by province; only drought by river basin.', 'Il n’existe pas de chiffre officiel par province ; seulement par bassin hydrographique.', 'Non esiste un dato ufficiale per provincia; solo per bacino idrografico.')}
            right="›" onPress={() => router.push('/sequia')} />
          {campLine ? <Row title={T('Campaña de cultivos', 'Crop campaign', 'Campagne des cultures', 'Campagna delle colture')} sub={campLine} /> : null}
        </Card>
      </>}
    </Screen>
  );
}
