import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, Button, Note, SectionTitle } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { num, numAuto, pct } from '../../lib/format';
import type { Price, CountryProfile } from '../../lib/types';
import { loadCountry, countryFromMemory } from '../../lib/api';
import { CountryMapView } from '../../components/CountryMapView';

const REGION_OF: Record<string, Price['region']> = { US: 'us', CA: 'ca', UK: 'uk', GB: 'uk' };

export default function Pais() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data, user, t } = useApp();
  const L = user.lang;
  const c = data.countries.find(x => x.code === code);
  const [prof, setProf] = useState<CountryProfile | null>(() => countryFromMemory(String(code)));
  const [state, setState] = useState<'loading' | 'ok' | 'none' | 'offline'>(prof ? 'ok' : 'loading');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadCountry(String(code)).then(r => { if (!alive) return; setProf(r.profile); setState(r.profile ? 'ok' : r.offline ? 'offline' : 'none'); });
    return () => { alive = false; };
  }, [code]);
  if (!c) return <Screen title="—"><Note>{t('missing')}</Note></Screen>;
  const reg = REGION_OF[c.code];
  const prices = data.prices.filter(p => (reg ? p.region === reg : p.region === 'eu' && p.place.es.includes(c.name.es)));
  const pctv = c.coveragePct;
  return (
    <Screen>
      <Stack.Screen options={{ title: c.name[L] }} />
      <Text style={{ fontSize: 28, fontWeight: '700', color: C.text }} accessibilityRole="header">{c.name[L]}</Text>
      {pctv != null ? (
        <Card style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{t('coverage')}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{pctv} %</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: C.surfaceAlt, overflow: 'hidden' }} accessibilityLabel={`${pctv} %`}>
            <View style={{ width: `${pctv}%`, height: 8, backgroundColor: C.accent }} />
          </View>
          <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 19 }}>{t('coverageText', pctv, c.name[L])}</Text>
        </Card>
      ) : null}
      <CountryMapView cc={c.code} />
      {prices.length ? <>
        <SectionTitle>{t('pricesHere')}</SectionTitle>
        <Card>{prices.map((p, i) => <Row key={p.id} first={i === 0} title={p.name[L]} sub={p.place[L]} right={`${num(p.value, L)} ${p.unit[L]}`}
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
      </> : null}
      <Button label={t('fullProfile')} onPress={() => Linking.openURL(c.url)} />
    </Screen>
  );
}
