import React, { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SourceCite } from '../../components/SourceCite';
import { ExportCsv } from '../../components/ExportCsv';
import { useApp, BASKET_MAX, staleSuffix, srcName } from '../../lib/store';
import { Screen, Card, Row, Button, Note, SectionTitle, Change, OfficialBadge, text } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { RangeChart } from '../../components/RangeChart';
import { loadPriceHistory } from '../../lib/api';
import { num, pct, date } from '../../lib/format';
import { Chips } from '../../components/Chips';
import { webJson } from '../../lib/fv';
import { tx } from '../../lib/tx';

type ProvX = { province: string; last: string; value: number; changePct: number | null; points: [string, number][] };
type ProvDoc = { products: Record<string, { unit: string; default: string; provinces: ProvX[] }> };
const PROV_FR: Record<string, string> = { Quebec: 'Québec' };

export default function Serie() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { price, data, user, setUser, t, loadEu } = useApp();
  const { width } = useWindowDimensions();
  const L = user.lang;
  const p = price(String(id));
  // Precio de otro país de la UE (desde un aviso o un enlace): se carga su fichero antes de decir que no existe
  const euCc = /^eu_([a-z]{2})_/.exec(String(id))?.[1].toUpperCase();
  const [tried, setTried] = useState(!euCc);
  useEffect(() => { if (!p && euCc) loadEu(euCc).finally(() => setTried(true)); }, [euCc]); // eslint-disable-line react-hooks/exhaustive-deps
  // Canadá (Statistics Canada): si hay varias provincias con dato al día, se puede elegir cuál ver; sin el fichero, todo queda como siempre
  const isCa = !!p && p.region === 'ca' && p.sourceId === 'statcan';
  const [pv, setPv] = useState<ProvDoc | null>(null);
  const [prov, setProv] = useState<string | null>(null);
  useEffect(() => { if (isCa) webJson('data/canada-farm-prices-prov.json', 6 * 3600e3).then((d: ProvDoc | null) => { if (d?.products) setPv(d); }); }, [isCa]);
  if (!p) return <Screen title="—"><Note>{tried ? t('missing') : t('loading')}</Note></Screen>;
  const P = isCa && pv ? pv.products[p.product] : null;
  const provs = P && P.provinces.length > 1 ? P.provinces : null;
  const selP = provs && prov && prov !== P!.default ? provs.find(x => x.province === prov) ?? null : null;
  const provLabel = (n: string) => (L === 'fr' && PROV_FR[n]) || n;
  const shownVal = selP ? selP.value : p.value, shownChg = selP ? selP.changePct : p.changePct, shownPts = selP ? selP.points : p.points, shownDate = selP ? selP.last : p.date;
  const shownPlace = selP ? provLabel(selP.province) + ', Canada' : p.place[L];
  const yaP = selP ? shownPts.find(x => x[0] === String(+shownDate.slice(0, 4) - 1) + shownDate.slice(4)) : null;
  const inB = user.basket.includes(p.id);
  const others = data.prices.filter(x => x.product === p.product && x.id !== p.id);
  const pts = shownPts.map(x => x[1]);
  const mn = Math.min(...pts), mx = Math.max(...pts);
  const toggle = () => setUser(u => ({ basket: inB ? u.basket.filter(x => x !== p.id) : u.basket.length < BASKET_MAX ? [...u.basket, p.id] : u.basket }));
  return (
    <Screen>
      <Stack.Screen options={{ title: p.name[L] }} />
      <View>
        <Text style={{ fontSize: 14, color: C.textMuted, fontWeight: '500' }}>{shownPlace}</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{p.name[L]}</Text>
        <OfficialBadge />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Text style={text.big}>{num(shownVal, L)}</Text>
        <Text style={{ fontSize: 16, color: C.textMuted }}>{p.unit[L]}</Text>
        <Change v={shownChg} text={pct(shownChg, L)} />
      </View>
      {provs ? <>
        <Text style={{ fontSize: 12.5, color: C.textMuted }}>{tx(L, { es: 'Provincia', en: 'Province', fr: 'Province', it: 'Provincia' }) + ' · ' + tx(L, { es: 'Statistics Canada, dólares canadienses sin convertir', en: 'Statistics Canada, Canadian dollars not converted', fr: 'Statistique Canada, dollars canadiens non convertis', it: 'Statistics Canada, dollari canadesi non convertiti' })}</Text>
        <Chips items={provs.map(x => ({ value: x.province, label: provLabel(x.province) + (x.province === P!.default ? ' ★' : '') }))} value={prov ?? P!.default} onChange={setProv} />
      </> : null}
      {p.stale && !selP ? <Note>{t('staleData', date(p.date, L))}</Note> : null}
      <RangeChart key={selP ? selP.province : 'd'} points={shownPts} unit={p.unit[L]} label={p.name[L]} width={width - 32 - 28 - 2} load={selP ? undefined : () => loadPriceHistory(p.id, p.date)} />
      <Card>
        <Row first title={t('source')} right={srcName(p.sourceName, L)} />
        <Row title={t('lastData')} right={date(shownDate, L)} />
        <Row title={t('frequency')} right={t(p.frequency)} />
        {selP ? (yaP ? <Row title={t('yearAgo')} sub={date(yaP[0], L)} right={`${num(yaP[1], L)} ${p.unit[L]}`} /> : null) : p.yearAgo ? <Row title={t('yearAgo')} sub={date(p.yearAgo.date, L)} right={`${num(p.yearAgo.value, L)} ${p.unit[L]}`} /> : null}
      </Card>
      <SourceCite sourceId={p.sourceId} period={p.date} />
      <ExportCsv title={p.name[L]} place={p.place[L]} unit={p.unit[L]} sourceId={p.sourceId} sourceName={p.sourceName} points={p.points} load={() => loadPriceHistory(p.id, p.date)} />
      {p.note ? <Note>{L === 'es' ? '' : t('noteEs') + ' '}{p.note.es}</Note> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} label={t('createAlert')} onPress={() => router.push({ pathname: '/avisos', params: { nuevo: p.id } })} />
        <Button style={{ flex: 1 }} kind="secondary" label={inB ? t('removeBasket') : t('addBasket')} onPress={toggle} />
      </View>
      <Button kind="secondary" label={t('compare')} onPress={() => router.push({ pathname: '/comparar', params: { ids: p.id } })} />
      {others.length ? <>
        <SectionTitle>{t('otherMarkets')}</SectionTitle>
        <Card>{others.map((o, i) => <Row key={o.id} first={i === 0} title={o.place[L]} sub={o.unit[L] + staleSuffix(o, L, t)} right={num(o.value, L)} rightSub={pct(o.changePct, L)} rightColor={changeColor(o.changePct)} onPress={() => router.push(`/serie/${o.id}`)} />)}</Card>
      </> : null}
      {!inB && user.basket.length >= BASKET_MAX ? <Note>{t('basketFull')}</Note> : null}
    </Screen>
  );
}
