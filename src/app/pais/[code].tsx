import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { tx } from '../../lib/tx';
import { useApp, staleSuffix } from '../../lib/store';
import { Screen, Card, Row, Button, Note, SectionTitle } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { num, numAuto, pct } from '../../lib/format';
import { SourceCite } from '../../components/SourceCite';
import type { Price, CountryProfile } from '../../lib/types';
import { loadCountry, countryFromMemory } from '../../lib/api';
import { webJson } from '../../lib/fv';
import { CountryMapView } from '../../components/CountryMapView';

const REGION_OF: Record<string, Price['region']> = { US: 'us', CA: 'ca', UK: 'uk', GB: 'uk' };

export default function Pais() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data, user, t, loadEu } = useApp();
  const L = user.lang;
  const c = data.countries.find(x => x.code === code);
  const [prof, setProf] = useState<CountryProfile | null>(() => countryFromMemory(String(code)));
  const [state, setState] = useState<'loading' | 'ok' | 'none' | 'offline'>(prof ? 'ok' : 'loading');
  const [open, setOpen] = useState<string | null>(null);
  const [tradeOk, setTradeOk] = useState(false);
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
  return (
    <Screen>
      <Stack.Screen options={{ title: c.name[L] }} />
      <Text style={{ fontSize: 28, fontWeight: '700', color: C.text }} accessibilityRole="header">{c.name[L]}</Text>
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
      <CountryMapView cc={c.code} />
      {prices.length ? <>
        <SectionTitle>{t('pricesHere')}</SectionTitle>
        <Card>{prices.map((p, i) => <Row key={p.id} first={i === 0} title={p.name[L]} sub={p.place[L] + staleSuffix(p, L, t)} right={`${num(p.value, L)} ${p.unit[L]}`}
          rightSub={pct(p.changePct, L)} rightColor={changeColor(p.changePct)} onPress={() => router.push(`/serie/${p.id}`)} />)}</Card>
      </> : null}
      <SectionTitle>{t('indicators')}</SectionTitle>
      {state === 'loading' ? <Note>{t('indicatorsLoading')}</Note> : null}
      {state === 'none' ? <Note>{t('indicatorsNone')}</Note> : null}
      {state === 'offline' ? <Note>{t('indicatorsOffline')}</Note> : null}
      {prof ? <>
        <Note>{t('indicatorsHint')} {t('indicatorsCount', num(prof.seriesTotal, L, 0), prof.latestPeriod ?? '—')}</Note>
        <Card>
          {prof.groups.map((g, gi) => {
            const on = open === g.id;
            return (
              <View key={g.id}>
                <Pressable onPress={() => setOpen(on ? null : g.id)} accessibilityRole="button" accessibilityState={{ expanded: on }}
                  style={[{ paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, gi > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{g.title[L]}</Text>
                    <Text style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>{t('indicatorsShown', g.series.length, g.total)}</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: C.textMuted }}>{on ? '⌃' : '⌄'}</Text>
                </Pressable>
                {on ? g.series.map(sr => <Row key={sr.id} title={sr.labelT?.[L] ?? sr.label} sub={`${sr.unit} · ${sr.period} · ${t(sr.frequency)}`} right={numAuto(sr.latest, L)}
                  rightSub={sr.changePct == null ? undefined : pct(sr.changePct, L)} rightColor={changeColor(sr.changePct)}
                  onPress={() => router.push({ pathname: '/indicador', params: { cc: c.code, id: sr.id } })} />) : null}
              </View>
            );
          })}
        </Card>
        {Array.from(new Set(prof.groups.flatMap(g => g.series.map(sr => sr.sourceId)))).map(id => <SourceCite key={id} sourceId={id} period={prof.latestPeriod} />)}
      </> : null}
      {(['ES', 'FR', 'IT', 'DE', 'US'].includes(c.code) || ['ES', 'IT', 'PT', 'EL', 'DE', 'FR'].includes(c.code)) ? <Card>
        {['ES', 'FR', 'IT', 'DE', 'US'].includes(c.code) ? <Row first title={'📰 ' + tx(L, { es: 'La semana en este país', en: 'The week in this country', fr: 'La semaine dans ce pays', it: 'La settimana in questo paese' })} right="›" onPress={() => router.push({ pathname: '/semana', params: { c: c.code } })} /> : null}
        {['ES', 'IT', 'PT', 'EL', 'DE', 'FR'].includes(c.code) ? <Row first={!['ES', 'FR', 'IT', 'DE', 'US'].includes(c.code)} title={'🏛️ ' + tx(L, { es: 'Lonjas y mercados locales', en: 'Local markets', fr: 'Marchés locaux', it: 'Piazze e mercati locali' })} right="›" onPress={() => router.push({ pathname: '/lonjas', params: { c: c.code } })} /> : null}
      </Card> : null}
      {['ES', 'FR', 'DE', 'IT', 'PL', 'BE', 'AT', 'HR', 'IE', 'NL', 'PT'].includes(c.code) ? <Card><Row first title={'⛽💧 ' + t('envTitle')} right="›" onPress={() => router.push({ pathname: '/entorno/[cc]', params: { cc: c.code } })} /></Card> : null}
      {tradeOk ? <Card><Row first title={'🚢 ' + t('tradeByProduct')} right="›" onPress={() => router.push({ pathname: '/comercio/[cc]', params: { cc: c.code } })} /></Card> : null}
      {prof ? <Button kind="secondary" label={t('explore')} onPress={() => router.push({ pathname: '/explorar', params: { cc: c.code } })} /> : null}
      <Button label={t('fullProfile')} onPress={() => Linking.openURL(c.url)} />
    </Screen>
  );
}
