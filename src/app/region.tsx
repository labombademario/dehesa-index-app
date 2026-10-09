import React, { useEffect, useState } from 'react';
import { Linking, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Button, Note, SectionTitle } from '../components/ui';
import { C } from '../lib/theme';
import { mapFromMemory, loadRegionData } from '../lib/api';
import { RangeChart } from '../components/RangeChart';
import { numAuto } from '../lib/format';
import type { RegionData } from '../lib/types';
import { fmtMetric } from '../components/CountryMapView';

export default function Region() {
  const { cc, r } = useLocalSearchParams<{ cc: string; r: string }>();
  const { data, user, t } = useApp();
  const { width } = useWindowDimensions();
  const [rd, setRd] = useState<RegionData | null>(null);
  useEffect(() => { let alive = true; loadRegionData(String(cc)).then(x => { if (alive) setRd(x); }); return () => { alive = false; }; }, [cc]);
  const L = user.lang;
  const map = mapFromMemory(String(cc));
  const reg = map?.regions.find(x => x.id === r);
  const country = data.countries.find(x => x.code === cc);
  if (!map || !reg) return <Screen title="—"><Note>{t('missing')}</Note></Screen>;
  const rec = rd ? rd.regions[reg.id] : null;
  return (
    <Screen>
      <Stack.Screen options={{ title: reg.name[L] }} />
      <View>
        <Text style={{ fontSize: 14, color: C.textMuted, fontWeight: '500' }}>{country ? country.name[L] : cc}</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', color: C.text }} accessibilityRole="header">{reg.name[L]}</Text>
      </View>
      <SectionTitle>{t('regionAllData')}</SectionTitle>
      <Card>
        {map.metrics.map((m, i) => {
          const v = m.vals[reg.id];
          const all = Object.values(m.vals).sort((a, b) => b - a);
          const rank = v != null ? all.indexOf(v) + 1 : 0;
          return <Row key={m.id} first={i === 0} title={m.label[L]} sub={[m.period ? m.period.slice(0, 10) : '', v != null ? t('regionRank', rank, all.length) : ''].filter(Boolean).join(' · ')} right={v != null ? fmtMetric(m, v, L) : '—'} />;
        })}
      </Card>
      {rec ? <>
        {rec.farms ? <>
          <SectionTitle>{t('regFarms')} · {rec.farms.period}</SectionTitle>
          <Card>
            {rec.farms.HLD != null ? <Row first title={t('regHoldings')} right={numAuto(rec.farms.HLD, L)} /> : null}
            {rec.farms.HA != null ? <Row title={t('regUaa')} right={numAuto(rec.farms.HA, L)} /> : null}
            {rec.farms.LSU != null ? <Row title={t('regLsu')} right={numAuto(rec.farms.LSU, L)} /> : null}
            {rec.farms.AWU != null ? <Row title={t('regAwu')} right={numAuto(rec.farms.AWU, L)} /> : null}
          </Card>
        </> : null}
        {rec.eaa.length ? <>
          <SectionTitle>{t('regOutput')}</SectionTitle>
          <RangeChart points={rec.eaa[0].points!.map(p => [String(p[0]), p[1]] as [string, number])} unit={rd!.units.eaa} label={rd!.labels[rec.eaa[0].k][L]} width={width - 32 - 28 - 2} />
          <Card>{rec.eaa.map((x, i) => <Row key={x.k} first={i === 0} title={rd!.labels[x.k][L]} sub={`${x.period} · ${rd!.units.eaa}`} right={numAuto(x.value, L)} />)}</Card>
        </> : null}
        {rec.crops.length ? <>
          <SectionTitle>{t('regCrops')}</SectionTitle>
          <Card>{rec.crops.map((x, i) => <Row key={x.k} first={i === 0} title={rd!.labels[x.k][L]}
            sub={[x.area ? `${t('regArea')} ${x.area.period} (${rd!.units.area})` : '', x.prod ? `${t('regProd')} ${numAuto(x.prod.value, L)} ${rd!.units.prod}` : ''].filter(Boolean).join(' · ')}
            right={x.area ? numAuto(x.area.value, L) : '—'} />)}</Card>
        </> : null}
        {rec.animals.length || rec.milk ? <>
          <SectionTitle>{t('regAnimals')}</SectionTitle>
          <Card>
            {rec.animals.map((x, i) => <Row key={x.k} first={i === 0} title={rd!.labels[x.k][L]} sub={`${x.period} · ${rd!.units.animals}`} right={numAuto(x.value, L)} />)}
            {rec.milk ? <Row first={!rec.animals.length} title={t('regMilk')} sub={`${rec.milk.period} · ${rd!.units.milk}`} right={numAuto(rec.milk.value, L)} /> : null}
          </Card>
        </> : null}
        {rd!.source ? <Note>{t('regSource')}: {rd!.source.name} · {rd!.source.license}</Note> : null}
      </> : null}
      <Button kind="secondary" label={t('regionWeb')} onPress={() => Linking.openURL(`https://dehesaindex.com/region.html?c=${cc}&r=${reg.id}`)} />
    </Screen>
  );
}
