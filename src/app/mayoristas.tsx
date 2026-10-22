// Mayoristas de fruta y hortaliza por mercado: Canadá (AAFC, CAD) y EE. UU. (USDA AMS, USD). Mismos ficheros que la web.
// Reglas: un mercado = una tabla; precio mínimo y máximo que pide el mayorista por envase; $/kg solo si el envase trae peso conocido; no es precio del agricultor.
import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle, Segmented } from '../components/ui';
import { Chips } from '../components/Chips';
import { C } from '../lib/theme';
import { num, date as fmtDate } from '../lib/format';
import { webJson } from '../lib/fv';
import { SourceCite } from '../components/SourceCite';
import { tx } from '../lib/tx';
import { CA_NAMES } from '../lib/caNames';

type Cty = { code: string; city: string; date: string; n: number };
type Doc = { code: string; city: string; date: string; cols: string[]; rows: (string | number | null)[][] };
type Ctry = 'ca' | 'us';
const CFG = {
  ca: { idx: 'data/ca/wholesale-index.json', file: (c: string) => 'data/ca/wholesale-' + c + '.json', cur: 'C$', kg: 'kg', src: 'aafc_wholesale' },
  us: { idx: 'data/views/fv-us-wh-index.json', file: (c: string) => 'data/views/fv-us-wh-' + c + '.json', cur: '$', kg: 'lb', src: 'usda_ams_mars' },
};
const CITY_ES: Record<string, Record<string, string>> = {
  Montreal: { es: 'Montreal', it: 'Montreal', fr: 'Montréal' }, Toronto: { it: 'Toronto' }, Vancouver: { it: 'Vancouver' },
  'New York': { es: 'Nueva York', fr: 'New York', it: 'New York' }, Chicago: { es: 'Chicago' }, 'Los Angeles': { es: 'Los Ángeles' }, Philadelphia: { es: 'Filadelfia', fr: 'Philadelphie', it: 'Filadelfia' },
  Atlanta: { es: 'Atlanta' }, Boston: { es: 'Boston' }, Miami: { es: 'Miami' }, Detroit: { es: 'Detroit' }, Baltimore: { es: 'Baltimore' },
};
const CAT: Record<string, { es: string; en: string; fr: string; it: string }> = {
  fruit: { es: 'Fruta', en: 'Fruit', fr: 'Fruits', it: 'Frutta' }, veg: { es: 'Hortalizas', en: 'Vegetables', fr: 'Légumes', it: 'Ortaggi' }, nut: { es: 'Frutos secos', en: 'Nuts', fr: 'Fruits à coque', it: 'Frutta secca' },
};
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Mayoristas() {
  const { user, t } = useApp();
  const L = user.lang;
  const [ct, setCt] = useState<Ctry>('ca');
  const [idx, setIdx] = useState<Cty[] | null>(null);
  const [city, setCity] = useState('');
  const [doc, setDoc] = useState<Doc | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [more, setMore] = useState(false);
  const cfg = CFG[ct];
  useEffect(() => {
    let alive = true; setIdx(null); setDoc(null); setErr(false); setCity(''); setMore(false);
    webJson(cfg.idx, 3600e3).then((d: { cities?: Cty[] } | null) => { if (!alive) return; if (d?.cities?.length) { setIdx(d.cities); setCity(d.cities[0].code); } else setErr(true); });
    return () => { alive = false; };
  }, [ct]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!city) return;
    let alive = true; setDoc(null); setErr(false); setMore(false);
    webJson(cfg.file(city), 3600e3).then((d: Doc | null) => { if (!alive) return; if (d?.rows) setDoc(d); else setErr(true); });
    return () => { alive = false; };
  }, [city, ct]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = (en: string, fr?: string | null) => {
    if (ct === 'ca') { if (L === 'en') return en; if (L === 'fr') return fr || en; return CA_NAMES[L]?.[en] || en; }
    return en; // USDA publica los nombres en inglés
  };
  const cityName = (c: string) => CITY_ES[c]?.[L] || c;
  const rows = useMemo(() => {
    if (!doc) return [];
    const ix = (k: string) => doc.cols.indexOf(k);
    const k = norm(q.trim());
    return doc.rows.filter(r => (cat === 'all' || r[ix('cat')] === cat) && (!k || norm(name(String(r[ix('commodity')]), r[ix('commodityFr')] as string) + ' ' + r[ix('commodity')] + ' ' + (r[ix('variety')] || '') + ' ' + (r[ix('origin')] || '')).includes(k)));
  }, [doc, q, cat, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const ix = (k: string) => (doc ? doc.cols.indexOf(k) : -1);
  const shown = more ? rows : rows.slice(0, 40);
  const ttl = tx(L, { es: 'Mayoristas por mercado', en: 'Wholesale markets', fr: 'Marchés de gros', it: 'Mercati all’ingrosso' });
  const perKg = (v: number, w: number | null) => (w ? ' · ' + cfg.cur + num(v / w, L, 2) + '/' + cfg.kg : '');
  return (
    <Screen>
      <Stack.Screen options={{ title: ttl }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">🏬 {ttl}</Text>
      <Text style={{ fontSize: 13, color: C.textMuted }}>{tx(L, {
        es: 'Lo que piden los mayoristas por la fruta y la hortaliza en cada mercado, del precio más bajo al más alto del último día publicado. No es el precio del agricultor.',
        en: 'What wholesalers ask for fruit and vegetables in each market, from the lowest to the highest price of the latest published day. Not the farmer price.',
        fr: 'Ce que demandent les grossistes pour les fruits et légumes sur chaque marché, du prix le plus bas au plus haut du dernier jour publié. Ce n’est pas le prix à l’agriculteur.',
        it: 'Quanto chiedono i grossisti per frutta e ortaggi in ogni mercato, dal prezzo più basso al più alto dell’ultimo giorno pubblicato. Non è il prezzo dell’agricoltore.' })}</Text>
      <Segmented options={[{ value: 'ca', label: '🇨🇦 ' + tx(L, { es: 'Canadá', en: 'Canada', fr: 'Canada', it: 'Canada' }) }, { value: 'us', label: '🇺🇸 ' + tx(L, { es: 'EE. UU.', en: 'United States', fr: 'États-Unis', it: 'Stati Uniti' }) }]} value={ct} onChange={setCt} />
      {err ? <Note>{t('missing')}</Note> : !idx ? <Note>{t('loading')}</Note> : <>
        <SectionTitle>{tx(L, { es: 'Mercado', en: 'Market', fr: 'Marché', it: 'Mercato' })}</SectionTitle>
        <Chips items={idx.map(c => ({ value: c.code, label: cityName(c.city) }))} value={city} onChange={setCity} />
        <Chips items={[{ value: 'all', label: tx(L, { es: 'Todo', en: 'All', fr: 'Tout', it: 'Tutto' }) }, ...(['fruit', 'veg', 'nut'] as const).map(k => ({ value: k as string, label: tx(L, CAT[k]) }))]} value={cat} onChange={setCat} />
        <TextInput value={q} onChangeText={setQ} placeholder={tx(L, { es: 'Buscar un producto…', en: 'Find a product…', fr: 'Chercher un produit…', it: 'Cerca un prodotto…' })} placeholderTextColor={C.textMuted}
          accessibilityLabel={ttl} autoCorrect={false} autoCapitalize="none" style={{ height: 44, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: C.text, backgroundColor: C.surfaceAlt }} />
        {!doc ? <Note>{t('loading')}</Note> : !rows.length ? <Note>{tx(L, { es: 'Ningún producto coincide.', en: 'No product matches.', fr: 'Aucun produit ne correspond.', it: 'Nessun prodotto corrisponde.' })}</Note> : <>
          <Card>
            {shown.map((r, i) => {
              const lo = r[ix('low')] as number | null, hi = r[ix('high')] as number | null, w = r[ix(ct === 'ca' ? 'kg' : 'lb')] as number | null;
              const nm = name(String(r[ix('commodity')]), r[ix('commodityFr')] as string);
              const spec = [r[ix('variety')], r[ix('origin')], r[ix('package')], r[ix('grade')]].filter(Boolean).join(' · ');
              const mid = lo != null && hi != null ? (lo + hi) / 2 : lo ?? hi;
              return <Row key={i} first={i === 0} title={nm} sub={spec + (mid != null ? perKg(mid, w) : '')}
                right={lo != null && hi != null && lo !== hi ? cfg.cur + num(lo, L, 2) + ' – ' + num(hi, L, 2) : cfg.cur + num((lo ?? hi) as number, L, 2)} />;
            })}
          </Card>
          {rows.length > 40 && !more ? <Row first title={tx(L, { es: 'Ver los ' + rows.length + ' productos', en: 'Show all ' + rows.length + ' products', fr: 'Voir les ' + rows.length + ' produits', it: 'Mostra i ' + rows.length + ' prodotti' })} right="›" onPress={() => setMore(true)} /> : null}
          <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'Fecha de los datos: ', en: 'Data date: ', fr: 'Date des données : ', it: 'Data dei dati: ' }) + fmtDate(doc.date, L)}</Text>
        </>}
        <SourceCite sourceId={cfg.src} period={doc?.date} />
        <Text style={{ fontSize: 12, color: C.textMuted }}>{ct === 'ca' ? tx(L, {
          es: 'Fuente: Agriculture and Agri-Food Canada, Daily Wholesale Prices Report (Open Government Licence – Canada). Dólares canadienses por envase; el precio por kg solo aparece cuando el envase trae un peso conocido.',
          en: 'Source: Agriculture and Agri-Food Canada, Daily Wholesale Prices Report (Open Government Licence – Canada). Canadian dollars per package; the per-kg price appears only when the package has a known weight.',
          fr: 'Source : Agriculture et Agroalimentaire Canada, Rapport quotidien des prix de gros (Licence du gouvernement ouvert – Canada). Dollars canadiens par emballage ; le prix au kg n’apparaît que si le poids de l’emballage est connu.',
          it: 'Fonte: Agriculture and Agri-Food Canada, Daily Wholesale Prices Report (Open Government Licence – Canada). Dollari canadesi per confezione; il prezzo al kg compare solo se il peso della confezione è noto.' }) : tx(L, {
          es: 'Fuente: USDA AMS Market News (terminales). Dominio público de EE. UU.; crédito: U.S. Department of Agriculture. Dólares por envase; el precio por libra solo aparece cuando el envase trae un peso conocido.',
          en: 'Source: USDA AMS Market News (terminal markets). US public domain; credit: U.S. Department of Agriculture. Dollars per package; the per-pound price appears only when the package has a known weight.',
          fr: 'Source : USDA AMS Market News (marchés terminaux). Domaine public américain ; crédit : U.S. Department of Agriculture. Dollars par emballage ; le prix à la livre n’apparaît que si le poids de l’emballage est connu.',
          it: 'Fonte: USDA AMS Market News (mercati terminali). Pubblico dominio USA; credito: U.S. Department of Agriculture. Dollari per confezione; il prezzo alla libbra compare solo se il peso della confezione è noto.' })}</Text>
      </>}
    </Screen>
  );
}
