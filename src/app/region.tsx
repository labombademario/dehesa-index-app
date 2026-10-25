import React, { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Button, Note, SectionTitle } from '../components/ui';
import { C, MAX_W } from '../lib/theme';
import { mapFromMemory, loadRegionData } from '../lib/api';
import { RangeChart } from '../components/RangeChart';
import { numAuto } from '../lib/format';
import type { RegionData } from '../lib/types';
import { fmtMetric } from '../components/CountryMapView';
import { openSafe } from '../lib/openLink';
import { param } from '../lib/safe';

// Unidades de Eurostat (en inglés) en el idioma de la app
const UNITS: Record<string, [string, string, string, string]> = { 'EUR million, current prices': ['millones de EUR, precios corrientes', 'EUR million, current prices', 'millions d’EUR, prix courants', 'milioni di EUR, prezzi correnti'], 'thousand ha': ['mil ha', 'thousand ha', 'milliers d’ha', 'migliaia di ha'], 'thousand t': ['mil t', 'thousand t', 'milliers de t', 'migliaia di t'], 'thousand head': ['miles de cabezas', 'thousand head', 'milliers de têtes', 'migliaia di capi'], 'thousand tonnes': ['mil t', 'thousand tonnes', 'milliers de t', 'migliaia di t'] };
const LI: Record<string, number> = { es: 0, en: 1, fr: 2, it: 3 };

export default function Region() {
  const rp = useLocalSearchParams<{ cc: string; r: string }>();   // parámetros saneados: un valor raro (p. ej. desde dehesaindex://) cuenta como no encontrado
  const cc = param(rp.cc, 'cc');
  const r = param(rp.r, 'id');
  const { data, user, t } = useApp();
  const { width } = useWindowDimensions();
  const [rd, setRd] = useState<RegionData | null>(null);
  useEffect(() => { let alive = true; loadRegionData(String(cc)).then(x => { if (alive) setRd(x); }); return () => { alive = false; }; }, [cc]);
  const L = user.lang;
  const un = (u: string) => (UNITS[u] ? UNITS[u][LI[L] ?? 1] : u);
  const map = mapFromMemory(String(cc));
  const reg = map?.regions.find(x => x.id === r);
  const country = data.countries.find(x => x.code === cc);
  if (!map || !reg) return <Screen title="—"><Note>{t('notAvailable')}</Note></Screen>;
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
          <RangeChart points={rec.eaa[0].points!.map(p => [String(p[0]), p[1]] as [string, number])} unit={un(rd!.units.eaa)} label={rd!.labels[rec.eaa[0].k][L]} width={Math.min(width, MAX_W) - 32 - 28 - 2} />
          <Card>{rec.eaa.map((x, i) => <Row key={x.k} first={i === 0} title={rd!.labels[x.k][L]} sub={`${x.period} · ${un(rd!.units.eaa)}`} right={numAuto(x.value, L)} />)}</Card>
        </> : null}
        {rec.crops.length ? <>
          <SectionTitle>{t('regCrops')}</SectionTitle>
          <Card>{rec.crops.map((x, i) => <Row key={x.k} first={i === 0} title={rd!.labels[x.k][L]}
            sub={[x.area ? `${t('regArea')} ${x.area.period} (${un(rd!.units.area)})` : '', x.prod ? `${t('regProd')} ${numAuto(x.prod.value, L)} ${un(rd!.units.prod)}` : ''].filter(Boolean).join(' · ')}
            right={x.area ? numAuto(x.area.value, L) : '—'} />)}</Card>
        </> : null}
        {rec.animals.length || rec.milk ? <>
          <SectionTitle>{t('regAnimals')}</SectionTitle>
          <Card>
            {rec.animals.map((x, i) => <Row key={x.k} first={i === 0} title={rd!.labels[x.k][L]} sub={`${x.period} · ${un(rd!.units.animals)}`} right={numAuto(x.value, L)} />)}
            {rec.milk ? <Row first={!rec.animals.length} title={t('regMilk')} sub={`${rec.milk.period} · ${un(rd!.units.milk)}`} right={numAuto(rec.milk.value, L)} /> : null}
          </Card>
        </> : null}
        {rd!.source ? <Note>{t('regSource')}: {rd!.source.name} · {rd!.source.license}</Note> : null}
      </> : null}
      <Button kind="secondary" label={t('regionWeb')} onPress={() => openSafe(`https://dehesaindex.com/region.html?c=${cc}&r=${reg.id}`)} />
    </Screen>
  );
}
