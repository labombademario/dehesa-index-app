import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { tx } from '../../lib/tx';
import { norm } from '../../lib/logic';
import { useApp, staleSuffix } from '../../lib/store';
import { Screen, Card, Row, Button, Note, SectionTitle } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { num, numAuto, pct } from '../../lib/format';
import { SourceCite } from '../../components/SourceCite';
import type { Price, CountryProfile } from '../../lib/types';
import { loadCountry, countryFromMemory } from '../../lib/api';
import { webJson } from '../../lib/fv';
import { CountryMapView } from '../../components/CountryMapView';
import { MacroCard, UkFarmersAge } from '../../components/MacroCard';
import { openSafe } from '../../lib/openLink';
import { param } from '../../lib/safe';

const REGION_OF: Record<string, Price['region']> = { US: 'us', CA: 'ca', UK: 'uk', GB: 'uk' };

export default function Pais() {
  const rp = useLocalSearchParams<{ code: string }>();   // parámetros saneados: un valor raro (p. ej. desde dehesaindex://) cuenta como no encontrado
  const code = param(rp.code, 'cc');
  const { data, user, t, loadEu } = useApp();
  const L = user.lang;
  const c = data.countries.find(x => x.code === code);
  const [prof, setProf] = useState<CountryProfile | null>(() => countryFromMemory(String(code)));
  const [state, setState] = useState<'loading' | 'ok' | 'none' | 'offline'>(prof ? 'ok' : 'loading');
  const [open, setOpen] = useState<string | null>(null);
  const [tradeOk, setTradeOk] = useState(false);
  const [q, setQ] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const pos = useRef<Record<string, number>>({});          // posición vertical de cada bloque dentro del scroll
  const grpY = useRef<Record<string, number>>({});         // posición de cada grupo dentro de la tarjeta de indicadores
  const goTo = (k: string, extra = 0) => { const y = (pos.current[k] ?? 0) + extra; scrollRef.current?.scrollTo({ y: Math.max(0, y - 58), animated: true }); };
  const mark = (k: string) => ({ onLayout: (e: { nativeEvent: { layout: { y: number } } }) => { pos.current[k] = e.nativeEvent.layout.y; } });
  const hits = useMemo(() => {
    const k = norm(q.trim());
    if (!k || !prof) return null;
    return prof.groups.flatMap(g => g.series.filter(sr => norm(sr.labelT?.[L] ?? sr.label).includes(k)).map(sr => ({ sr, g })));
  }, [q, prof, L]);
  useEffect(() => { webJson('data/app/v1/trade/index.json', 6 * 3600e3).then(d => setTradeOk(!!d?.countries?.[String(code)])); }, [code]);
  useEffect(() => {
    let alive = true;
    loadCountry(String(code)).then(r => { if (!alive) return; setProf(r.profile); setState(r.profile ? 'ok' : r.offline ? 'offline' : 'none'); });
    loadEu(String(code));   // media nacional de la Comisión para los países de la UE (no viene en prices.json)
    return () => { alive = false; };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return <Screen title="—"><Note>{t('missing')}</Note></Screen>;
  const reg = REGION_OF[c.code];
  const prices = data.prices.filter(p => (reg ? p.region === reg && !p.cc : p.cc === c.code || (c.code === 'ES' && p.region === 'eu' && !p.cc && p.place.es.includes(c.name.es))));
  const pctv = c.coveragePct;
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  const showIndicators = state === 'ok' || state === 'loading' || state === 'none' || state === 'offline';
  const chips: { k: string; label: string }[] = [
    { k: 'map', label: '🗺️ ' + T('Mapa', 'Map', 'Carte', 'Mappa') },
    ...(prices.length ? [{ k: 'prices', label: '💶 ' + T('Precios', 'Prices', 'Prix', 'Prezzi') }] : []),
    ...(showIndicators ? [{ k: 'ind', label: '📊 ' + T('Indicadores', 'Indicators', 'Indicateurs', 'Indicatori') }] : []),
  ];
  const hasWeek = ['ES', 'FR', 'IT', 'DE', 'US'].includes(c.code);
  const hasMkts = ['ES', 'IT', 'PT', 'EL', 'DE', 'FR'].includes(c.code);
  const hasEnv = ['ES', 'FR', 'DE', 'IT', 'PL', 'BE', 'AT', 'HR', 'IE', 'NL', 'PT', 'EU', 'EL', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'HU', 'LT', 'LU', 'LV', 'MT', 'RO', 'SE', 'SI', 'SK'].includes(c.code);
  const tiles: { icon: string; label: string; go: () => void }[] = [
    ...(hasWeek ? [{ icon: '📰', label: T('La semana', 'The week', 'La semaine', 'La settimana'), go: () => router.push({ pathname: '/semana', params: { c: c.code } }) }] : []),
    ...(hasMkts ? [{ icon: '🏛️', label: T('Lonjas', 'Markets', 'Marchés', 'Piazze'), go: () => router.push({ pathname: '/lonjas', params: { c: c.code } }) }] : []),
    ...(hasEnv ? [{ icon: '⛽', label: T('Entorno', 'Environment', 'Contexte', 'Ambiente'), go: () => router.push({ pathname: '/entorno/[cc]', params: { cc: c.code } }) }] : []),
    ...(c.code === 'ES' ? [{ icon: '📍', label: T('Provincias', 'Provinces', 'Provinces', 'Province'), go: () => router.push('/provincias') }] : []),
    ...(c.code === 'UK' ? [{ icon: '🌧️', label: T('Lluvia', 'Rainfall', 'Pluie', 'Pioggia'), go: () => router.push('/lluviauk') }] : []),
    ...(c.code === 'UK' ? [{ icon: '💷', label: T('Granjas', 'Farm accounts', 'Exploitations', 'Aziende'), go: () => router.push('/granjasuk') }] : []),
    ...(c.code === 'UK' ? [{ icon: '🗺️', label: T('Renta por región', 'Income by region', 'Revenu par région', 'Reddito per regione'), go: () => router.push('/rentauk') }] : []),
    ...(c.code === 'UK' ? [{ icon: '🐄', label: T('Ganado', 'Livestock', 'Élevage', 'Bestiame'), go: () => router.push('/ganadouk') }] : []),
    ...(c.code === 'UK' ? [{ icon: '🍎', label: T('Fruta y hortaliza', 'Fruit and veg', 'Fruits et légumes', 'Frutta e ortaggi'), go: () => router.push({ pathname: '/frutas', params: { c: 'UK' } }) }] : []),
    ...(tradeOk ? [{ icon: '🚢', label: T('Comercio', 'Trade', 'Commerce', 'Commercio'), go: () => router.push({ pathname: '/comercio/[cc]', params: { cc: c.code } }) }] : []),
    ...(prof ? [{ icon: '🔎', label: T('Explorar', 'Explore', 'Explorer', 'Esplora'), go: () => router.push({ pathname: '/explorar', params: { cc: c.code } }) }] : []),
  ];
  const bar = (
    <View style={{ backgroundColor: C.bg, paddingVertical: 8, marginHorizontal: -16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
        {chips.map(ch => (
          <Pressable key={ch.k} onPress={() => goTo(ch.k)} accessibilityRole="button" style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: C.surfaceAlt }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{ch.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
  const seriesRow = (sr: NonNullable<typeof prof>['groups'][number]['series'][number], first?: boolean, sub?: string) => (
    <Row key={sr.id} first={first} title={sr.labelT?.[L] ?? sr.label} sub={sub ?? `${sr.unit} · ${sr.period} · ${t(sr.frequency)}`} right={numAuto(sr.latest, L)}
      rightSub={sr.changePct == null ? undefined : pct(sr.changePct, L)} rightColor={changeColor(sr.changePct)}
      onPress={() => router.push({ pathname: '/indicador', params: { cc: c.code, id: sr.id } })} />
  );
  return (
    <Screen scrollRef={scrollRef} sticky={bar}>
      <Stack.Screen options={{ title: c.name[L] }} />
      <Text style={{ fontSize: 28, fontWeight: '700', color: C.text }} accessibilityRole="header">{c.name[L]}</Text>
      {tiles.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tiles.map(ti => (
            <Pressable key={ti.label} onPress={ti.go} accessibilityRole="button" accessibilityLabel={ti.label}
              style={{ flexGrow: 1, flexBasis: '30%', minWidth: 96, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, gap: 4 }}>
              <Text style={{ fontSize: 22 }}>{ti.icon}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>{ti.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {pctv != null ? (
        <Card style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{t('coverage')}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{num(pctv, L, 0)} %</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: C.surfaceAlt, overflow: 'hidden' }} accessibilityLabel={`${num(pctv, L, 0)} %`}>
            <View style={{ width: `${pctv}%`, height: 8, backgroundColor: C.accent }} />
          </View>
          <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 19 }}>{t('coverageText', num(pctv, L, 0), c.name[L])}</Text>
        </Card>
      ) : null}
      <MacroCard cc={c.code} lang={L} />
      <View {...mark('map')}><CountryMapView cc={c.code} /></View>
      {c.code === 'UK' ? <UkFarmersAge lang={L} /> : null}
      {prices.length ? <View {...mark('prices')} style={{ gap: 16 }}>
        <SectionTitle>{t('pricesHere')}</SectionTitle>
        <Card>{prices.map((p, i) => <Row key={p.id} first={i === 0} title={p.name[L]} sub={p.place[L] + staleSuffix(p, L, t)} right={`${num(p.value, L)} ${p.unit[L]}`}
          rightSub={pct(p.changePct, L)} rightColor={changeColor(p.changePct)} onPress={() => router.push(`/serie/${p.id}`)} />)}</Card>
      </View> : null}
      <View {...mark('ind')} style={{ gap: 16 }}>
        <SectionTitle>{t('indicators')}</SectionTitle>
        {state === 'loading' ? <Note>{t('indicatorsLoading')}</Note> : null}
        {state === 'none' ? <Note>{t('indicatorsNone')}</Note> : null}
        {state === 'offline' ? <Note>{t('indicatorsOffline')}</Note> : null}
        {prof ? <>
          <Note>{t('indicatorsHint')} {t('indicatorsCount', num(prof.seriesTotal, L, 0), prof.latestPeriod ?? '—')}</Note>
          <TextInput value={q} onChangeText={setQ} placeholder={T('Buscar indicador: leche, fertilizante…', 'Search indicator: milk, fertiliser…', 'Rechercher un indicateur : lait, engrais…', 'Cerca indicatore: latte, fertilizzante…')}
            placeholderTextColor={C.textMuted} returnKeyType="search" autoCorrect={false} clearButtonMode="while-editing"
            style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: C.text }} />
          {hits ? (
            hits.length ? <>
              <Note>{T(`${hits.length} resultados`, `${hits.length} results`, `${hits.length} résultats`, `${hits.length} risultati`)}</Note>
              <Card>{hits.slice(0, 60).map(({ sr, g }, i) => seriesRow(sr, i === 0, `${g.title[L]} · ${sr.unit} · ${sr.period}`))}</Card>
            </> : <Note>{T('Ningún indicador coincide. Prueba con otra palabra.', 'No indicator matches. Try another word.', 'Aucun indicateur ne correspond. Essayez un autre mot.', 'Nessun indicatore corrisponde. Prova un’altra parola.')}</Note>
          ) : (
            <Card>
              {prof.groups.map((g, gi) => {
                const on = open === g.id;
                const top = g.series.slice(0, 3);
                return (
                  <View key={g.id} onLayout={e => { grpY.current[g.id] = e.nativeEvent.layout.y; }}>
                    <Pressable onPress={() => {
                      const next = on ? null : g.id;
                      setOpen(next);
                      if (next) setTimeout(() => goTo('ind', (grpY.current[g.id] ?? 0) + 120), 60);
                    }} accessibilityRole="button" accessibilityState={{ expanded: on }}
                      style={[{ paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, gi > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{g.title[L]}</Text>
                        <Text style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>{t('indicatorsShown', g.series.length, g.total)}</Text>
                        {!on ? top.map(sr => (
                          <View key={sr.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 8 }}>
                            <Text style={{ flex: 1, fontSize: 13, color: C.textMuted }} numberOfLines={1}>{sr.labelT?.[L] ?? sr.label}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>{numAuto(sr.latest, L)}</Text>
                          </View>
                        )) : null}
                      </View>
                      <Text style={{ fontSize: 18, color: C.textMuted }}>{on ? '⌃' : '⌄'}</Text>
                    </Pressable>
                    {on ? g.series.map(sr => seriesRow(sr)) : null}
                  </View>
                );
              })}
            </Card>
          )}
          {Array.from(new Set(prof.groups.flatMap(g => g.series.map(sr => sr.sourceId)))).map(id => <SourceCite key={id} sourceId={id} period={prof.latestPeriod} />)}
        </> : null}
      </View>
      <Button label={t('fullProfile')} onPress={() => openSafe(c.url)} />
    </Screen>
  );
}
