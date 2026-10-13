// Precios locales de grano en EE. UU. (como precios-locales.html): ofertas al contado de USDA AMS Market News por estado y producto.
// Reglas de la web: un mercado = una serie; lo que USDA publica como región, terminal o puerto nunca se rotula «elevador local»;
// no se mezclan clases, grados ni entregas; el basis solo se enseña si USDA lo publica; no se calcula ninguna media.
import React, { useEffect, useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle } from '../components/ui';
import { Chips } from '../components/Chips';
import { RangeChart } from '../components/RangeChart';
import { C } from '../lib/theme';
import { num, pct, date as fmtDate } from '../lib/format';
import { webJson } from '../lib/fv';
import { SourceCite } from '../components/SourceCite';
import { tx, type T4 } from '../lib/tx';

type Man = { generatedAt: string; latestObservation: string; states: Record<string, { name: string; commodities: Record<string, { shard: string; latest: string }> }> };
type Ser = {
  id: string; locationName: string | null; locationType: string; commodityClass: string | null; grade: string | null; deliveryPoint: string | null; deliveryPeriod: string | null;
  saleType: string | null; unit: string; basisUnit: string | null; futuresContract: string | null; date: string; avg: number; lo: number | null; hi: number | null;
  bLo: number | null; bHi: number | null; changePct: number | null; freshness: string; pts: (number | string | null)[][];
};
const CN: Record<string, T4> = {
  corn: { es: 'Maíz', en: 'Corn', fr: 'Maïs', it: 'Mais' }, soybeans: { es: 'Soja', en: 'Soybeans', fr: 'Soja', it: 'Soia' }, wheat: { es: 'Trigo', en: 'Wheat', fr: 'Blé', it: 'Frumento' },
  sorghum: { es: 'Sorgo', en: 'Sorghum', fr: 'Sorgho', it: 'Sorgo' }, barley: { es: 'Cebada', en: 'Barley', fr: 'Orge', it: 'Orzo' }, oats: { es: 'Avena', en: 'Oats', fr: 'Avoine', it: 'Avena' },
};
const LT: Record<string, T4> = {
  REGION: { es: 'Resumen de la región (USDA); no es un elevador concreto', en: 'Regional summary (USDA); not a named elevator', fr: 'Résumé de la région (USDA) ; pas un silo précis', it: 'Riepilogo della regione (USDA); non un singolo silo' },
  TERMINAL: { es: 'Terminal o cargadero; no es un precio de elevador local', en: 'Terminal or river elevator; not a local elevator price', fr: 'Terminal ou quai de chargement ; pas un prix de silo local', it: 'Terminale o punto di carico; non un prezzo di silo locale' },
  EXPORT_MARKET: { es: 'Puerto o elevador de exportación; no es un precio local del agricultor', en: 'Export elevator or port; not a local farmer price', fr: 'Silo d’exportation ou port ; pas un prix local à l’agriculteur', it: 'Silo di esportazione o porto; non un prezzo locale' },
  STATE: { es: 'Cifra de todo el estado', en: 'Statewide figure', fr: 'Chiffre pour tout l’État', it: 'Dato dell’intero stato' },
  CITY: { es: 'Ciudad', en: 'City', fr: 'Ville', it: 'Città' }, ELEVATOR: { es: 'Elevador concreto', en: 'Named elevator', fr: 'Silo précis', it: 'Silo specifico' },
};
const FRESH = (f: string) => f === 'LIVE' || f === 'EXPECTED_DELAY';

export default function LocalesUS() {
  const { user, t } = useApp();
  const L = user.lang;
  const { width } = useWindowDimensions();
  const [man, setMan] = useState<Man | null>(null);
  const [done, setDone] = useState(false);
  const [st, setSt] = useState('IA');
  const [cm, setCm] = useState('corn');
  const [ser, setSer] = useState<Ser[] | null>(null);
  const [err, setErr] = useState(false);
  const [all, setAll] = useState(false);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { webJson('data/us-cash-bids/manifest.json', 3600e3).then((m: Man | null) => { setMan(m); setDone(true); }); }, []);
  const coms = man?.states[st] ? Object.keys(man.states[st].commodities) : [];
  useEffect(() => { if (man && coms.length && !coms.includes(cm)) setCm(coms[0]); }, [man, st]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!man) return;
    const c = man.states[st]?.commodities[cm];
    if (!c) { setSer(null); return; }
    let alive = true; setSer(null); setErr(false); setOpen(null); setMore(false);
    webJson('data/us-cash-bids/' + c.shard, 3600e3).then((d: { series: Ser[] } | null) => { if (!alive) return; if (d?.series) setSer(d.series); else setErr(true); });
    return () => { alive = false; };
  }, [man, st, cm]);
  const cw = Math.min(width, 700) - 32 - 28;
  const list = useMemo(() => {
    if (!ser) return [];
    const k = (s: Ser) => [s.commodityClass || '', s.locationName || '', s.deliveryPeriod || '', s.grade || ''].join('|');
    return ser.filter(s => all || FRESH(s.freshness)).sort((a, b) => k(a).localeCompare(k(b)));
  }, [ser, all]);
  const hidden = ser ? ser.length - ser.filter(s => FRESH(s.freshness)).length : 0;
  const shown = more ? list : list.slice(0, 25);
  const ttl = tx(L, { es: 'Precios locales en EE. UU.', en: 'US local grain prices', fr: 'Prix locaux des grains aux É.-U.', it: 'Prezzi locali dei cereali negli USA' });
  const bu = (u: string) => (u === 'bu' ? '$/bu' : '$/' + u);
  return (
    <Screen>
      <Stack.Screen options={{ title: ttl }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">🌽 {ttl}</Text>
      <Text style={{ fontSize: 13, color: C.textMuted }}>{tx(L, {
        es: 'Qué pagan los compradores por maíz, soja, trigo y otros granos en cada estado, según los informes diarios de USDA. Ofertas al contado, no futuros.',
        en: 'What buyers pay for corn, soybeans, wheat and other grains in each state, from USDA daily reports. Cash bids, not futures.',
        fr: 'Ce que paient les acheteurs pour le maïs, le soja, le blé et d’autres grains dans chaque État, d’après les rapports quotidiens de l’USDA. Prix au comptant, pas des contrats à terme.',
        it: 'Cosa pagano gli acquirenti per mais, soia, frumento e altri cereali in ogni stato, dai rapporti giornalieri USDA. Prezzi a pronti, non future.' })}</Text>
      {!done ? <Note>{t('loading')}</Note> : !man ? <Note>{t('missing')}</Note> : <>
        <SectionTitle>{tx(L, { es: 'Estado', en: 'State', fr: 'État', it: 'Stato' })}</SectionTitle>
        <Chips items={Object.keys(man.states).sort((a, b) => man.states[a].name.localeCompare(man.states[b].name)).map(k => ({ value: k, label: man.states[k].name }))} value={st} onChange={setSt} />
        <SectionTitle>{tx(L, { es: 'Producto', en: 'Commodity', fr: 'Produit', it: 'Prodotto' })}</SectionTitle>
        <Chips items={coms.map(k => ({ value: k, label: CN[k] ? tx(L, CN[k]) : k }))} value={cm} onChange={setCm} />
        {err ? <Note>{t('missing')}</Note> : !ser ? <Note>{t('loading')}</Note> : !list.length ? <Note>{tx(L, { es: 'Sin cotización reciente para esta selección.', en: 'No recent quote for this selection.', fr: 'Aucune cotation récente pour cette sélection.', it: 'Nessuna quotazione recente per questa selezione.' })}</Note> : <>
          <Card>
            {shown.map((s, i) => {
              const spec = [s.commodityClass, s.grade, s.deliveryPeriod, s.saleType, s.deliveryPoint].filter(Boolean).join(' · ');
              const isOpen = open === s.id;
              const pts = s.pts.filter(p => typeof p[1] === 'number').map(p => [String(p[0]), p[1] as number] as [string, number]);
              return (
                <View key={s.id}>
                  <Row first={i === 0} title={(s.locationName || man.states[st].name) + ' · ' + fmtDate(s.date, L)} sub={spec || undefined}
                    right={num(s.avg, L, 2) + ' ' + bu(s.unit)} rightSub={s.changePct != null ? pct(s.changePct, L) : undefined} onPress={() => setOpen(isOpen ? null : s.id)} />
                  {isOpen ? <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, LT[s.locationType] || LT.REGION)}</Text>
                    {s.lo != null && s.hi != null ? <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'Rango publicado: ', en: 'Published range: ', fr: 'Fourchette publiée : ', it: 'Intervallo pubblicato: ' }) + num(s.lo, L, 2) + ' – ' + num(s.hi, L, 2) + ' ' + bu(s.unit)}</Text> : null}
                    {s.bLo != null && s.bHi != null ? <Text style={{ fontSize: 12, color: C.textMuted }}>{'Basis: ' + num(s.bLo, L, 0) + ' / ' + num(s.bHi, L, 0) + ' ' + (s.basisUnit || '') + (s.futuresContract ? ' · ' + s.futuresContract : '')}</Text>
                      : <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'USDA no publica basis en este informe.', en: 'USDA does not publish basis in this report.', fr: 'L’USDA ne publie pas de base dans ce rapport.', it: 'L’USDA non pubblica la base in questo rapporto.' })}</Text>}
                    {!FRESH(s.freshness) ? <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'Último dato de esta serie; ya no se actualiza con regularidad.', en: 'Last quote of this series; no longer updated regularly.', fr: 'Dernière cotation de cette série ; plus mise à jour régulièrement.', it: 'Ultima quotazione di questa serie; non più aggiornata regolarmente.' }) }</Text> : null}
                    {pts.length > 1 ? <RangeChart points={pts} unit={bu(s.unit)} label={s.locationName || ''} width={cw} /> : null}
                  </View> : null}
                </View>
              );
            })}
          </Card>
          {list.length > 25 && !more ? <Row first title={tx(L, { es: 'Ver los ' + list.length + ' mercados', en: 'Show all ' + list.length + ' markets', fr: 'Voir les ' + list.length + ' marchés', it: 'Mostra i ' + list.length + ' mercati' })} right="›" onPress={() => setMore(true)} /> : null}
          {hidden > 0 ? <Row first title={all ? tx(L, { es: 'Ocultar mercados sin cotización reciente', en: 'Hide markets without a recent quote', fr: 'Masquer les marchés sans cotation récente', it: 'Nascondi i mercati senza quotazione recente' }) : tx(L, { es: 'Mostrar ' + hidden + ' mercados sin cotización reciente', en: 'Show ' + hidden + ' markets without a recent quote', fr: 'Afficher ' + hidden + ' marchés sans cotation récente', it: 'Mostra ' + hidden + ' mercati senza quotazione recente' })} right="›" onPress={() => setAll(!all)} /> : null}
        </>}
        <SourceCite sourceId="usda_ams_mars" period={man.latestObservation} />
        <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, {
          es: 'Fuente: USDA AMS Market News. Datos de dominio público de EE. UU.; crédito: U.S. Department of Agriculture. Cada fila es un mercado y una especificación: no se mezclan ni se calcula ninguna media.',
          en: 'Source: USDA AMS Market News. US public-domain data; credit: U.S. Department of Agriculture. Each row is one market and one specification: nothing is mixed and no average is calculated.',
          fr: 'Source : USDA AMS Market News. Données du domaine public américain ; crédit : U.S. Department of Agriculture. Chaque ligne est un marché et une spécification : rien n’est mélangé et aucune moyenne n’est calculée.',
          it: 'Fonte: USDA AMS Market News. Dati di pubblico dominio USA; credito: U.S. Department of Agriculture. Ogni riga è un mercato e una specifica: nulla viene mescolato e non si calcola alcuna media.' })}</Text>
      </>}
    </Screen>
  );
}
