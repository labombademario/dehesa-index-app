// Frutas, hortalizas y frutos secos: los 52 productos de la web (precios.html?tab=hortalizas) con su precio semanal en el país elegido.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note, Segmented } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { num, date as fmtDate } from '../lib/format';
import { loadFv, countryName, stageName, type FvDoc, type FvProduct } from '../lib/fv';
import { norm } from '../lib/logic';

type G = 'all' | 'veg' | 'fruit' | 'nut';

export default function Frutas() {
  const { user, t } = useApp();
  const L = user.lang;
  const [doc, setDoc] = useState<FvDoc | null>(null);
  const [done, setDone] = useState(false);
  const [cc, setCc] = useState(user.market !== 'US' && user.market !== 'CA' ? user.market : 'ES');
  const [g, setG] = useState<G>('all');
  const [q, setQ] = useState('');
  useEffect(() => { loadFv().then(d => { setDoc(d); setDone(true); }); }, []);
  const groups = useMemo(() => {
    if (!doc) return [] as { g: 'veg' | 'fruit' | 'nut'; items: FvProduct[] }[];
    const qq = norm(q);
    // solo productos con dato del país elegido: nunca se rellena con lo de otro país
    const has = (p: FvProduct) => !!p.eu?.latest[cc] || (cc === 'ES' && !!p.perc);
    return (['veg', 'fruit', 'nut'] as const).filter(x => g === 'all' || g === x).map(x => ({
      g: x,
      items: doc.products.filter(p => p.group === x && has(p) && (!qq || norm(p.name[L] + ' ' + p.name.es + ' ' + p.name.en).includes(qq))).sort((a, b) => a.name[L].localeCompare(b.name[L], L)),
    })).filter(x => x.items.length);
  }, [doc, g, q, L, cc]);
  const hidden = useMemo(() => (doc ? doc.products.filter(p => (g === 'all' || p.group === g) && !(p.eu?.latest[cc] || (cc === 'ES' && p.perc))).length : 0), [doc, g, cc]);
  const ccs = useMemo(() => (doc ? doc.countries.slice().sort((a, b) => countryName(a, L).localeCompare(countryName(b, L), L)) : []), [doc, L]);
  const now = Date.now();
  const gName = { veg: t('fvVeg'), fruit: t('fvFruit'), nut: t('fvNut') };
  return (
    <Screen>
      <Stack.Screen options={{ title: t('fvTitle') }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{t('fvTitle')}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{t('fvIntro')}</Text>
      {!doc ? <Note>{done ? t('noDataNow') : t('loading')}</Note> : <>
        <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600' }}>{t('fvCountry')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {ccs.map(c => {
            const on = c === cc;
            return (
              <Pressable key={c} onPress={() => setCc(c)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? C.accent : C.surfaceAlt }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: on ? C.accentInk : C.text }}>{countryName(c, L)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Segmented options={[{ value: 'all', label: t('fvAll') }, { value: 'veg', label: t('fvVeg') }, { value: 'fruit', label: t('fvFruit') }, { value: 'nut', label: t('fvNut') }]} value={g} onChange={setG} />
        <TextInput value={q} onChangeText={setQ} placeholder={t('fvFind')} placeholderTextColor={C.textMuted} clearButtonMode="while-editing" autoCorrect={false}
          style={{ height: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: C.surfaceAlt, color: C.text, fontSize: 15 }} accessibilityLabel={t('fvFind')} />
        {!groups.length ? <Note>{t('fvNone')}</Note> : groups.map(gr => (
          <View key={gr.g} style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.textMuted, marginTop: 4 }} accessibilityRole="header">{gName[gr.g]}</Text>
            <Card>
              {gr.items.map((p, i) => {
                const x = p.eu?.latest[cc], old = x ? now - Date.parse(x.d) > 56 * 864e5 : false;
                const ch = x && x.p ? (x.v / x.p - 1) * 100 : null;
                const sub = x ? `${stageName(x.stage, L)} · ${fmtDate(x.d, L)}${old ? ' · ' + t('fvOld') : ''}` : (cc === 'ES' && p.perc ? t('fvFarmer', fmtDate(p.perc.m, L) + ': ' + num(p.perc.v, L, 2) + ' €/kg') : t('fvNoWeekly'));
                return (
                  <Pressable key={p.id} onPress={() => router.push({ pathname: '/fruta/[id]', params: { id: p.id, c: cc } })} accessibilityRole="button" android_ripple={{ color: C.surfaceAlt }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                      <Text style={{ fontSize: 22, width: 30, textAlign: 'center' }} accessibilityElementsHidden importantForAccessibility="no">{p.emoji}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{p.name[L]}</Text>
                        <Text style={{ fontSize: 12.5, color: C.textMuted }} numberOfLines={2}>{sub}</Text>
                      </View>
                      {x ? <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: old ? C.textMuted : C.text, fontVariant: ['tabular-nums'] }}>{num(x.v, L, 2)} €/kg</Text>
                        {ch != null ? <Text style={{ fontSize: 12.5, color: changeColor(ch), fontVariant: ['tabular-nums'] }}>{ch > 0 ? '+' : ''}{num(ch, L, 0)} %</Text> : null}
                      </View> : <Text style={{ color: C.textMuted, fontSize: 16 }}>›</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))}
        {hidden ? <Text style={{ fontSize: 12, color: C.textMuted }}>{t('fvHidden', hidden, countryName(cc, L))}</Text> : null}
        <Text style={{ fontSize: 12, color: C.textMuted }}>{t('fvHow')}</Text>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{cc === 'ES' ? t('fvSources') : t('fvSourcesX')}</Text>
      </>}
    </Screen>
  );
}
