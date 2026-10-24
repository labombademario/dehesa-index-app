import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, s } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { numAuto, pct } from '../lib/format';
import { norm } from '../lib/logic';
import { loadCatalog, countryFromMemory, type CatSeries } from '../lib/api';
import { loadGloss } from '../lib/gloss';
import { tl } from '../lib/labelTl';
import { tx } from '../lib/tx';
import { param } from '../lib/safe';

// Nombre de cada grupo de series en los cuatro idiomas (antes salían ids internos como «idx_perc» o «prices_lv»)
const GROUPS: Record<string, { es: string; en: string; fr: string; it: string }> = {
  product: { es: 'Precios de productos', en: 'Product prices', fr: 'Prix des produits', it: 'Prezzi dei prodotti' }, production: { es: 'Producción', en: 'Production', fr: 'Production', it: 'Produzione' },
  crops: { es: 'Cultivos', en: 'Crops', fr: 'Cultures', it: 'Colture' }, livestock: { es: 'Ganadería', en: 'Livestock', fr: 'Élevage', it: 'Allevamento' }, trade: { es: 'Comercio', en: 'Trade', fr: 'Commerce', it: 'Commercio' },
  quotes: { es: 'Cotizaciones', en: 'Quotes', fr: 'Cotations', it: 'Quotazioni' }, prices: { es: 'Precios', en: 'Prices', fr: 'Prix', it: 'Prezzi' }, prices_paid: { es: 'Precios pagados', en: 'Prices paid', fr: 'Prix payés', it: 'Prezzi pagati' },
  milk: { es: 'Leche', en: 'Milk', fr: 'Lait', it: 'Latte' }, milk_regions: { es: 'Leche por región', en: 'Milk by region', fr: 'Lait par région', it: 'Latte per regione' }, crops_regions: { es: 'Cultivos por región', en: 'Crops by region', fr: 'Cultures par région', it: 'Colture per regione' },
  prices_lv: { es: 'Precios del ganado', en: 'Livestock prices', fr: 'Prix du bétail', it: 'Prezzi del bestiame' }, meat_regions: { es: 'Carne por región', en: 'Meat by region', fr: 'Viande par région', it: 'Carne per regione' }, prices_fv: { es: 'Frutas y hortalizas', en: 'Fruit and vegetables', fr: 'Fruits et légumes', it: 'Frutta e ortaggi' },
  inputs: { es: 'Insumos', en: 'Inputs', fr: 'Intrants', it: 'Mezzi tecnici' }, inputs_f: { es: 'Fertilizantes', en: 'Fertilisers', fr: 'Engrais', it: 'Fertilizzanti' }, inputs_a: { es: 'Piensos', en: 'Feed', fr: 'Aliments du bétail', it: 'Mangimi' },
  idx_perc: { es: 'Índices de precios percibidos', en: 'Output price indices', fr: 'Indices des prix à la production', it: 'Indici dei prezzi alla produzione' }, idx_pag: { es: 'Índices de precios pagados', en: 'Input price indices', fr: 'Indices des prix des intrants', it: 'Indici dei prezzi dei mezzi tecnici' },
  costs: { es: 'Costes', en: 'Costs', fr: 'Coûts', it: 'Costi' }, environment: { es: 'Medio ambiente', en: 'Environment', fr: 'Environnement', it: 'Ambiente' }, organic: { es: 'Ecológico', en: 'Organic', fr: 'Bio', it: 'Biologico' },
  stocks: { es: 'Existencias', en: 'Stocks', fr: 'Stocks', it: 'Scorte' }, income: { es: 'Renta', en: 'Income', fr: 'Revenus', it: 'Redditi' }, partners: { es: 'Socios comerciales', en: 'Trade partners', fr: 'Partenaires commerciaux', it: 'Partner commerciali' }, rates: { es: 'Tipos de interés', en: 'Interest rates', fr: 'Taux d’intérêt', it: 'Tassi d’interesse' },
};

const PAGE = 60;

export default function Explorar() {
  const rp = useLocalSearchParams<{ cc: string; g?: string; q?: string }>();   // parámetros saneados: un valor raro (p. ej. desde dehesaindex://) cuenta como no encontrado
  const cc = param(rp.cc, 'cc');
  const g = param(rp.g, 'flag') || undefined;
  const q0 = param(rp.q, 'text') || undefined;
  const { data, user, t } = useApp();
  const L = user.lang;
  const [cat, setCat] = useState<CatSeries[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [group, setGroup] = useState<string>(g ? String(g) : 'all');
  const [q, setQ] = useState(q0 ? String(q0) : '');
  const [limit, setLimit] = useState(PAGE);
  const prof = countryFromMemory(String(cc));
  const country = data.countries.find(x => x.code === cc);
  useEffect(() => {
    let alive = true;
    loadCatalog(String(cc)).then(r => { if (!alive) return; setCat(r); setState(r ? 'ok' : 'fail'); });
    return () => { alive = false; };
  }, [cc]);
  const gname = (id: string) => prof?.groups.find(x => x.id === id)?.title[L] ?? (GROUPS[id] ? tx(L, GROUPS[id]) : id);
  const [, setGl] = useState(false);
  useEffect(() => { loadGloss(L).then(() => setGl(v => !v)); }, [L]);
  const groups = useMemo(() => {
    const c: Record<string, number> = {};
    (cat ?? []).forEach(x => { c[x.group] = (c[x.group] || 0) + 1; });
    return Object.keys(c).sort((a, b) => c[b] - c[a]).map(id => ({ id, n: c[id] }));
  }, [cat]);
  const list = useMemo(() => {
    const k = norm(q.trim());
    return (cat ?? []).filter(x => (group === 'all' || x.group === group) && (!k || norm(x.label).includes(k)))
      .sort((a, b) => (b.latestPeriod > a.latestPeriod ? 1 : b.latestPeriod < a.latestPeriod ? -1 : 0));
  }, [cat, group, q]);
  return (
    <Screen>
      <Stack.Screen options={{ title: country ? country.name[L] : '' }} />
      <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }} accessibilityRole="header">{t('explore')}</Text>
      {state === 'loading' ? <Note>{t('exploreLoading')}</Note> : null}
      {state === 'fail' ? <Note>{t('exploreFail')}</Note> : null}
      {state === 'ok' ? <>
        <TextInput value={q} onChangeText={x => { setQ(x); setLimit(PAGE); }} placeholder={t('search')} placeholderTextColor={C.textMuted} accessibilityLabel={t('search')}
          style={[s.input, { borderRadius: 28, paddingHorizontal: 16, backgroundColor: C.surfaceAlt, borderWidth: 0 }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, height: 40 }} contentContainerStyle={{ gap: 8, alignItems: 'flex-start' }}>
          {[{ id: 'all', n: cat!.length }, ...groups].map(x => {
            const on = x.id === group;
            return (
              <Pressable key={x.id} onPress={() => { setGroup(x.id); setLimit(PAGE); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: on ? C.accent : C.surfaceAlt }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: on ? C.accentInk : C.text }}>{x.id === 'all' ? t('exploreAll') : gname(x.id)} · {x.n}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Note>{t('exploreCount', list.length)}</Note>
        <Card>
          {list.slice(0, limit).map((x, i) => <Row key={x.id} first={i === 0} title={tl(x.label, L)} sub={`${x.unit} · ${x.latestPeriod} · ${t(x.freq)}`} right={numAuto(x.latest, L)}
            rightSub={x.changePct == null ? undefined : pct(x.changePct, L)} rightColor={changeColor(x.changePct)}
            onPress={() => router.push({ pathname: '/indicador', params: { cc: String(cc), id: x.id } })} />)}
        </Card>
        {list.length > limit ? <Pressable onPress={() => setLimit(limit + PAGE)} accessibilityRole="button" style={{ paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: C.accent, fontWeight: '700' }}>{t('exploreMore')}</Text></Pressable> : null}
      </> : null}
    </Screen>
  );
}
