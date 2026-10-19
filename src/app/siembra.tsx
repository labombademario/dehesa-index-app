// «Qué sembrar este año» (como siembra.html de la web): una ficha por cultivo con el cálculo explicado, barra de mal a buen año,
// avisos de existencias, variabilidad y precio antiguo, coste propio en la ficha y reparto orientativo de la superficie.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../lib/store';
import { Screen, Card, Note, SectionTitle } from '../components/ui';
import { CountrySelect } from '../components/CountryPicker';
import { SowMap } from '../components/SowMap';
import { countryName } from '../lib/fv';
import { flag } from '../lib/tx';
import { C } from '../lib/theme';
import { num, parseNum } from '../lib/format';
import { webJson } from '../lib/fv';
import { sowRows, sowPlan, type SowDoc, type SowRow } from '../lib/sowing';
import type { Lang } from '../lib/types';

// Los 21 países con fichero data/sowing/<pais>.json (los mismos que siembra.html de la web)
const SOW_CC = ['ES', 'FR', 'DE', 'IT', 'PL', 'PT', 'NL', 'DK', 'SE', 'FI', 'EL', 'BG', 'HR', 'HU', 'CZ', 'SK', 'SI', 'LT', 'RO', 'US', 'CA'];
type CC = string;
const KEY = 'dehesa:siembra:v1';
const US: Record<string, string> = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
function title(s: string): string { return s.toLowerCase().replace(/(^|[\s-])\S/g, m => m.toUpperCase()); }

export default function Siembra() {
  const { user, t, ready } = useApp();
  const L = user.lang;
  const [st, setSt] = useState<{ c: CC; r: string; area: string; costs: Record<string, string> }>({ c: SOW_CC.includes(user.market) ? user.market : 'ES', r: '', area: '', costs: {} });
  const [doc, setDoc] = useState<SowDoc | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then(raw => { if (raw) { try { setSt(s => ({ ...s, ...JSON.parse(raw) })); } catch { /* */ } } setLoaded(true); }); }, []);
  useEffect(() => { if (loaded && ready) AsyncStorage.setItem(KEY, JSON.stringify(st)).catch(() => {}); }, [st, loaded, ready]);   // antes de leer el perfil no se guarda nada (se guardaba España por defecto)
  const [docDone, setDocDone] = useState(false);
  // la respuesta de un país que ya no está elegido se descarta (al cambiar rápido de país)
  useEffect(() => { let alive = true; setDoc(null); setDocDone(false); webJson('data/sowing/' + st.c.toLowerCase() + '.json', 12 * 3600e3).then((d: any) => { if (alive) { setDoc(d); setDocDone(true); } }).catch(() => { if (alive) setDocDone(true); }); return () => { alive = false; }; }, [st.c]);
  const rname = (code: string) => { const R = doc?.regions[code]; if (!R) return code; if (R.names) return R.names[L] ?? R.name; if (st.c === 'US') return US[code] ?? code; return R.name ? title(R.name) : code; };
  const regs = useMemo(() => (doc ? Object.keys(doc.regions).sort((a, b) => rname(a).localeCompare(rname(b), L)) : []), [doc, L]);
  const costsN = useMemo(() => { const o: Record<string, string> = {}; Object.keys(st.costs).forEach(k => { const x = parseNum(st.costs[k], L); if (x != null) o[k] = String(x); }); return o; }, [st.costs, L]);   // «1.250» son 1250 en es/fr/it
  // una región es elegible solo si tiene algún cultivo con datos suficientes (superficie mínima, serie reciente, precio): si no, sale en gris y deshabilitada
  const okMap = useMemo(() => { const o: Record<string, boolean> = {}; if (doc) Object.keys(doc.regions).forEach(k => { o[k] = sowRows(doc, k, {}).length > 0; }); return o; }, [doc]);
  const rows = useMemo(() => (doc && st.r && doc.regions[st.r] ? sowRows(doc, st.r, costsN) : []), [doc, st.r, costsN]);
  const au = doc?.areaUnit === 'acre' ? 'acres' : 'ha', uS = doc?.areaUnit === 'acre' ? 'acre' : 'ha', ru = rows[0]?.C.revUnit ?? '';
  const anyCost = rows.some(x => x.margin != null), best = anyCost ? rows.find(x => x.margin != null) : rows[0];
  const pctS = (v: number) => (v > 0 && v < 0.005 ? '<1' : num(v * 100, L, 0)) + ' %';
  const setCost = (k: string, v: string) => setSt(s => { const c = { ...s.costs }; if (v === '') delete c[s.c + ':' + k]; else c[s.c + ':' + k] = v; return { ...s, costs: c }; });
  const tot = parseNum(st.area, L) ?? 0, plan = tot > 0 && rows.length ? sowPlan(rows, tot) : null, cy = new Date().getFullYear();
  const card = (x: SowRow) => {
    const nm = x.C.name[L] ?? x.C.name.es, hasM = x.margin != null, main = hasM ? x.margin! : x.rev, vLo = hasM ? x.marLo! : x.revLo, vHi = hasM ? x.marHi! : x.revHi;
    const b0 = Math.min(0, vLo), b1 = Math.max(vHi, 1), sc = (v: number) => (v - b0) / (b1 - b0) * 100;
    const cur = x.C.price.current!, pk = cur.kind === 'avg12m' ? t('swAvg12') : cur.kind === 'implied' ? t('swImplied') + ' (' + cur.to + ')' : t('swCtd');
    const oldY = cur.kind === 'implied' && cur.to ? parseInt(String(cur.to).slice(0, 4), 10) : null;
    const sig: string[] = [];
    if (x.C.stocks && x.st) sig.push(t(x.st === 'high' ? 'swStH' : x.st === 'low' ? 'swStL' : 'swStN', pctS(x.C.stocks.ratio), pctS(x.C.stocks.avg5)));
    if (x.cv != null) sig.push(t(x.cv < 0.12 ? 'swCvL' : x.cv < 0.25 ? 'swCvM' : 'swCvH', num(x.cv * 100, L, 0) + ' %'));
    const dec = (v: number) => (v < 20 ? 2 : 0), own = st.costs[st.c + ':' + x.k];
    return (
      <Card key={x.k} style={{ padding: 14, gap: 6 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, fontFamily: 'serif' }}>{nm}</Text>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{t(x.share < 0.03 ? 'swSmall' : 'swGrown', num(x.area, L, 0), au, pctS(x.share))}</Text>
        <Text style={{ color: C.textMuted, fontSize: 13 }}><Text style={{ fontSize: 26, fontWeight: '700', color: x.margin != null && x.margin < 0 ? C.negative : C.text, fontVariant: ['tabular-nums'] }}>{num(main, L, 0)}</Text> {ru} {hasM ? t('swMargin') : t('swNormal')}</Text>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: C.surfaceAlt, marginTop: 2 }} accessible accessibilityLabel={`${t('swBad', num(vLo, L, 0))}, ${t('swGood', num(vHi, L, 0))}`}>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${sc(vLo)}%`, width: `${Math.max(1, sc(vHi) - sc(vLo))}%`, borderRadius: 5, backgroundColor: C.accent, opacity: 0.35 }} />
          {b0 < 0 ? <View style={{ position: 'absolute', top: -3, bottom: -3, left: `${sc(0)}%`, width: 2, backgroundColor: C.textMuted }} /> : null}
          <View style={{ position: 'absolute', top: -1, left: `${sc(main)}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: C.accent, borderWidth: 2, borderColor: C.surface }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 11.5, color: C.textMuted }}>{t('swBad', num(vLo, L, 0))}</Text><Text style={{ fontSize: 11.5, color: C.textMuted }}>{t('swGood', num(vHi, L, 0))}</Text></View>
        {hasM ? <Text style={{ fontSize: 13, fontWeight: '600', color: x.margin! < 0 ? C.negative : C.text }}>{t('swMar', num(x.rev, L, 0), num(x.cost!, L, 0), num(x.margin!, L, 0), ru)}</Text> : null}
        <Text style={{ fontSize: 13, color: C.text, lineHeight: 18 }}>{t('swCalc', num(x.yMed, L, dec(x.yMed)), x.C.yieldUnit, x.yrs.length, num(x.p0, L, x.p0 < 10 ? 2 : 0), x.C.priceUnit, pk)}</Text>
        {oldY && oldY <= cy - 2 ? <Text style={{ fontSize: 12.5, color: C.text, backgroundColor: C.surfaceAlt, padding: 6, borderRadius: 6 }}>{t('swOld', oldY)}</Text> : null}
        {sig.map((q, i) => <Text key={i} style={{ fontSize: 12.5, color: C.text, lineHeight: 18 }}>• {q}</Text>)}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 13, color: C.text, flex: 1 }}>{t('swCost', ru)}</Text>
          <TextInput value={own ?? ''} onChangeText={v => setCost(x.k, v)} keyboardType="decimal-pad" placeholder={x.C.costs ? num(x.C.costs.operating, L, 0) : '450'} placeholderTextColor={C.textMuted}
            style={{ width: 110, height: 38, borderRadius: 8, paddingHorizontal: 10, backgroundColor: C.surfaceAlt, color: C.text, fontSize: 15, textAlign: 'right' }} accessibilityLabel={t('swCost', ru) + ' · ' + nm} />
        </View>
        <Text style={{ fontSize: 11.5, color: C.textMuted }}>{x.cKind === 'own' ? t('swCostOwn') : x.cKind === 'ers' ? t('swCostErs', x.C.costs!.year) : t('swCostNone')}</Text>
      </Card>
    );
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: t('swTitle') }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{t('swTitle')}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{t('swSub')}</Text>
      <CountrySelect items={SOW_CC.map(c => ({ value: c, label: countryName(c, L), flag: flag(c) }))} value={st.c} onChange={c => setSt(s => ({ ...s, c, r: '' }))} title={t('swCountry')} />
      {!doc ? <Note>{docDone ? t('noDataNow') : t('loading')}</Note> : <>
        <SowMap cc={st.c} codes={regs} ok={k => !!okMap[k]} selected={st.r} onPick={r => setSt(s => ({ ...s, r }))} nameOf={rname} />
        <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600' }}>{t('swRegion')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {regs.map(r => (
            <Pressable key={r} onPress={okMap[r] ? () => setSt(s => ({ ...s, r })) : undefined} accessibilityRole="button" accessibilityState={{ selected: r === st.r, disabled: !okMap[r] }} accessibilityLabel={rname(r) + (okMap[r] ? '' : ' (' + t('swNod') + ')')}
              style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: r === st.r ? C.accent : C.surfaceAlt, opacity: okMap[r] ? 1 : 0.45 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: r === st.r ? C.accentInk : C.text }}>{rname(r)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600' }}>{t('swArea', au)}</Text>
        <TextInput value={st.area} onChangeText={v => setSt(s => ({ ...s, area: v }))} keyboardType="decimal-pad" placeholder="70" placeholderTextColor={C.textMuted}
          style={{ height: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: C.surfaceAlt, color: C.text, fontSize: 15, width: 160 }} accessibilityLabel={t('swArea', au)} />
        {!st.r ? <Note>{t('swPick')}</Note> : !rows.length ? <Note>{t('swNoData')}</Note> : <>
          <SectionTitle>{rname(st.r)}</SectionTitle>
          {best ? <Text style={{ fontSize: 15, color: C.text, lineHeight: 21 }}>{anyCost ? t('swLeadM', uS, best.C.name[L], num(best.margin!, L, 0), ru) : t('swLeadR', uS, best.C.name[L], num(best.rev, L, 0), ru)}</Text> : null}
          <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 17 }}>{t('swHow', uS)}</Text>
          {rows.map(card)}
          {plan ? <>
            <SectionTitle>{t('swPlan')}</SectionTitle>
            {!plan.anyCost ? <Note>{t('swPlanRev')}</Note> : null}
            <Card>
              {plan.parts.map((p, i) => (
                <View key={p.x.k} style={{ paddingHorizontal: 16, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{p.x.C.name[L]}</Text><Text style={{ fontSize: 15, color: C.text, fontVariant: ['tabular-nums'] }}>{num(p.s * tot, L, 0)} {au} · {num(p.s * 100, L, 0)} %</Text></View>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: C.surfaceAlt, marginTop: 5 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: C.accent, width: `${Math.max(1, p.s * 100)}%` }} /></View>
                </View>
              ))}
              {plan.unassigned > 0.004 ? <View style={{ paddingHorizontal: 16, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 14, color: C.textMuted, flex: 1 }}>{t('swPlanLeft')}</Text><Text style={{ fontSize: 14, color: C.textMuted }}>{num(plan.unassigned * tot, L, 0)} {au}</Text></View> : null}
            </Card>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{t('swPlanTot', num(plan.sum, L, 0), doc.currency, num(plan.lo, L, 0), num(plan.hi, L, 0))}</Text>
            <Text style={{ fontSize: 12, color: C.textMuted }}>{t('swPlanWhy')}</Text>
          </> : null}
        </>}
        <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 17 }}>{t('swCaveat')}</Text>
      </>}
    </Screen>
  );
}
