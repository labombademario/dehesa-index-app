// Frutas, hortalizas y frutos secos: los 52 productos de la web (precios.html?tab=hortalizas) con su precio semanal en el país elegido.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note, Segmented } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { num, date as fmtDate } from '../lib/format';
import { loadFv, countryName, stageName, webJson, type FvDoc, type FvProduct } from '../lib/fv';
import { tx, type T4 } from '../lib/tx';
import { norm } from '../lib/logic';
import { CountrySelect } from '../components/CountryPicker';
import { flag } from '../lib/tx';
import { param } from '../lib/safe';

type G = 'all' | 'veg' | 'fruit' | 'nut';
// Sudamérica (formato estándar de la web: un precio por kilo y producto, data/cl/fv.json). Argentina y Uruguay: sin fuente con licencia verificada.
const SA = ['AR', 'CL', 'UY'];
// Reino Unido: precio mayorista de producto local en Inglaterra y Gales (Defra), cada dos semanas, en libras y en la unidad publicada (data/views/fv-uk.json).
interface UkItem { id: string; g: 'veg' | 'fruit' | 'flower'; n: string[]; e: string; u: string; v: number; p: number | null; y: number | null; d: string }
interface UkDoc { items: UkItem[]; source: { name: string; url: string; license: string } }
const UK_UNIT: Record<string, T4> = { kg: { es: 'kg', en: 'kg', fr: 'kg', it: 'kg' }, head: { es: 'pieza', en: 'head', fr: 'pièce', it: 'pezzo' }, stem: { es: 'tallo', en: 'stem', fr: 'tige', it: 'stelo' }, 'twin pack': { es: 'pack de 2', en: 'twin pack', fr: 'lot de 2', it: 'conf. da 2' }, bunch: { es: 'manojo', en: 'bunch', fr: 'botte', it: 'mazzo' }, each: { es: 'unidad', en: 'each', fr: 'unité', it: 'unità' } };
const UK_NOTE: T4 = { es: 'Precio medio mayorista en Inglaterra y Gales de producto cultivado en el Reino Unido (Defra), cada dos semanas: lo que paga el comprador en el mercado mayorista, no lo que cobra el agricultor. La variación es frente al dato anterior; un producto fuera de temporada muestra su último precio en gris.', en: 'Average wholesale price in England and Wales for UK-grown produce (Defra), every two weeks: what buyers pay at wholesale markets, not what the farmer gets. The change is against the previous figure; a product out of season shows its last price in grey.', fr: 'Prix de gros moyen en Angleterre et au pays de Galles pour les produits cultivés au Royaume-Uni (Defra), toutes les deux semaines : ce que paie l’acheteur sur le marché de gros, pas ce que touche l’agriculteur. La variation est par rapport à la donnée précédente ; un produit hors saison affiche son dernier prix en gris.', it: 'Prezzo medio all’ingrosso in Inghilterra e Galles per prodotti coltivati nel Regno Unito (Defra), ogni due settimane: quanto paga l’acquirente al mercato all’ingrosso, non quanto incassa l’agricoltore. La variazione è rispetto al dato precedente; un prodotto fuori stagione mostra l’ultimo prezzo in grigio.' };
const FLOWERS: T4 = { es: 'Flores', en: 'Flowers', fr: 'Fleurs', it: 'Fiori' };
interface ClItem { id: string; g: 'veg' | 'fruit' | 'nut'; n: string[]; e: string; stage: 'wholesale' | 'retail'; v: number; p: number | null; y: number | null; d: string; nl: number }
interface ClDoc { items: ClItem[]; source: { name: string; url: string; license: string } }
const SA_NOTE: Record<string, T4> = {
  AR: { es: 'Sin precios por ahora. Los datos abiertos del Ministerio de Agricultura sobre frutas y hortalizas llegan solo hasta 2018, y el Mercado Central no publica un fichero con licencia de reutilización. Se añadirá cuando haya una fuente verificada.', en: 'No prices yet. The Ministry of Agriculture’s open data on fruit and vegetables stops in 2018, and the Central Market publishes no file with a reuse licence. A verified source will be added when there is one.', fr: 'Pas encore de prix. Les données ouvertes du ministère de l’Agriculture sur les fruits et légumes s’arrêtent en 2018, et le Marché central ne publie aucun fichier avec licence de réutilisation. Une source vérifiée sera ajoutée dès qu’il y en aura une.', it: 'Ancora nessun prezzo. I dati aperti del Ministero dell’Agricoltura su frutta e ortaggi si fermano al 2018 e il Mercato Centrale non pubblica un file con licenza di riutilizzo. Si aggiungerà una fonte verificata quando ci sarà.' },
  UY: { es: 'Sin precios por ahora. La Unidad Agroalimentaria Metropolitana publica precios mayoristas, pero su licencia de reutilización está pendiente de confirmar; sin ella no se publican.', en: 'No prices yet. The Metropolitan Agrifood Unit publishes wholesale prices, but its reuse licence is still to be confirmed; without it they are not published.', fr: 'Pas encore de prix. L’Unité agroalimentaire métropolitaine publie des prix de gros, mais sa licence de réutilisation reste à confirmer ; sans elle, ils ne sont pas publiés.', it: 'Ancora nessun prezzo. L’Unità agroalimentare metropolitana pubblica prezzi all’ingrosso, ma la licenza di riutilizzo è ancora da confermare; senza di essa non vengono pubblicati.' },
};
const CL_NOTE: T4 = { es: 'Precio por kilo en pesos chilenos (ODEPA): mayorista en Lo Valledor (Santiago) y al consumidor en la Región Metropolitana. Es la mediana de los puntos medios de las líneas que indican su peso; mezcla variedades y calidades. El cambio es frente al dato anterior de las mismas líneas. Es un precio de mercado, no el del agricultor.', en: 'Price per kilo in Chilean pesos (ODEPA): wholesale at Lo Valledor (Santiago) and consumer prices in the Metropolitan Region. It is the median of the midpoints of the lines that state their weight; it mixes varieties and grades. The change is against the earlier figure for the same lines. It is a market price, not the farmer’s price.', fr: 'Prix au kilo en pesos chiliens (ODEPA) : gros à Lo Valledor (Santiago) et consommation dans la Région métropolitaine. C’est la médiane des points médians des lignes qui indiquent leur poids ; elle mélange variétés et qualités. La variation est calculée par rapport à la valeur antérieure des mêmes lignes. C’est un prix de marché, pas celui de l’agriculteur.', it: 'Prezzo al chilo in pesos cileni (ODEPA): ingrosso a Lo Valledor (Santiago) e consumo nella Regione Metropolitana. È la mediana dei punti medi delle righe che indicano il peso; mescola varietà e qualità. La variazione è rispetto al dato precedente delle stesse righe. È un prezzo di mercato, non quello dell’agricoltore.' };
const ST_CL: Record<string, T4> = { wholesale: { es: 'mayorista', en: 'wholesale', fr: 'gros', it: 'ingrosso' }, retail: { es: 'consumidor', en: 'consumer', fr: 'consommation', it: 'consumo' } };

export default function Frutas() {
  const { user, t } = useApp();
  const L = user.lang;
  const [doc, setDoc] = useState<FvDoc | null>(null);
  const [done, setDone] = useState(false);
  const prm = { c: param(useLocalSearchParams<{ c?: string }>().c, 'cc') || undefined };   // parámetro saneado
  const [cc, setCc] = useState(typeof prm.c === 'string' && /^[A-Z]{2}$/.test(prm.c) ? prm.c : user.market !== 'US' && user.market !== 'CA' ? user.market : 'ES');
  const [g, setG] = useState<G>('all');
  const [q, setQ] = useState('');
  const [cl, setCl] = useState<ClDoc | null>(null);
  const [uk, setUk] = useState<UkDoc | null>(null);
  const [extDone, setExtDone] = useState<Record<string, boolean>>({});
  useEffect(() => { loadFv().then(d => { setDoc(d); setDone(true); }); }, []);
  useEffect(() => { if (cc === 'UK' && !uk) webJson('data/views/fv-uk.json', 6 * 3600e3).then((d: UkDoc | null) => { setUk(d); setExtDone(x => ({ ...x, UK: true })); }); }, [cc, uk]);
  useEffect(() => { if (cc === 'CL' && !cl) webJson('data/cl/fv.json', 3 * 3600e3).then((d: ClDoc | null) => { setCl(d); setExtDone(x => ({ ...x, CL: true })); }); }, [cc, cl]);
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
  const ccs = useMemo(() => (doc ? doc.countries.concat(SA, ['UK']).sort((a, b) => countryName(a, L).localeCompare(countryName(b, L), L)) : []), [doc, L]);
  const isUK = cc === 'UK', isSA = SA.includes(cc), li = { es: 0, en: 1, fr: 2, it: 3 }[L];
  const saGroups = useMemo(() => {
    if (!cl) return [] as { g: 'veg' | 'fruit' | 'nut'; items: ClItem[] }[];
    const qq = norm(q);
    return (['veg', 'fruit', 'nut'] as const).filter(x => g === 'all' || g === x).map(x => ({
      g: x, items: cl.items.filter(i => i.g === x && (!qq || norm(i.n.join(' ')).includes(qq))).sort((a, b) => a.n[li].localeCompare(b.n[li], L) || (a.stage < b.stage ? 1 : -1)),
    })).filter(x => x.items.length);
  }, [cl, g, q, L, li]);
  const ukGroups = useMemo(() => {
    if (!uk) return [] as { g: 'veg' | 'fruit' | 'flower'; items: UkItem[] }[];
    const qq = norm(q);
    return (['veg', 'fruit', 'flower'] as const).filter(x => g === 'all' || g === x || (g === 'nut' && x === 'flower')).map(x => ({
      g: x, items: uk.items.filter(i => i.g === x && (!qq || norm(i.n.join(' ')).includes(qq))).sort((a, b) => a.n[li].localeCompare(b.n[li], L)),
    })).filter(x => x.items.length);
  }, [uk, g, q, L, li]);
  const ukNewest = uk ? uk.items.reduce((m, i) => (i.d > m ? i.d : m), '') : '';
  const now = Date.now();
  const gName = { veg: t('fvVeg'), fruit: t('fvFruit'), nut: t('fvNut') };
  return (
    <Screen>
      <Stack.Screen options={{ title: t('fvTitle') }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{t('fvTitle')}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{t('fvIntro')}</Text>
      {!doc ? <Note>{done ? t('noDataNow') : t('loading')}</Note> : <>
        <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600' }}>{t('fvCountry')}</Text>
        <CountrySelect items={ccs.map(c => ({ value: c, label: countryName(c, L), flag: flag(c) }))} value={cc} onChange={setCc} title={t('fvCountry')} />
        <Segmented options={[{ value: 'all', label: t('fvAll') }, { value: 'veg', label: t('fvVeg') }, { value: 'fruit', label: t('fvFruit') }, { value: 'nut', label: isUK ? tx(L, FLOWERS) : t('fvNut') }]} value={g} onChange={setG} />
        <TextInput value={q} onChangeText={setQ} placeholder={t('fvFind')} placeholderTextColor={C.textMuted} clearButtonMode="while-editing" autoCorrect={false}
          style={{ height: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: C.surfaceAlt, color: C.text, fontSize: 15 }} accessibilityLabel={t('fvFind')} />
        {isUK ? (!uk ? <Note>{extDone.UK ? t('noDataNow') : t('loading')}</Note> : !ukGroups.length ? <Note>{t('fvNone')}</Note> : <>
          {ukGroups.map(gr => (
            <View key={gr.g} style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.textMuted, marginTop: 4 }} accessibilityRole="header">{gr.g === 'flower' ? tx(L, FLOWERS) : gName[gr.g]}</Text>
              <Card>
                {gr.items.map((p, i) => {
                  const old = Date.parse(ukNewest) - Date.parse(p.d) > 35 * 864e5, ch = !old && p.p ? (p.v / p.p - 1) * 100 : null;
                  return (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                      <Text style={{ fontSize: 22, width: 30, textAlign: 'center' }} accessibilityElementsHidden importantForAccessibility="no">{p.e}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{p.n[li]}</Text>
                        <Text style={{ fontSize: 12.5, color: C.textMuted }} numberOfLines={2}>{fmtDate(p.d, L)}{old ? ' · ' + t('fvOld') : ''}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: old ? C.textMuted : C.text, fontVariant: ['tabular-nums'] }}>£{num(p.v, L, 2)}/{UK_UNIT[p.u] ? tx(L, UK_UNIT[p.u]) : p.u}</Text>
                        {ch != null ? <Text style={{ fontSize: 12.5, color: changeColor(ch), fontVariant: ['tabular-nums'] }}>{ch > 0 ? '+' : ''}{num(ch, L, 1)} %</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>
          ))}
          <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, UK_NOTE)}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{uk.source.name} · {uk.source.license}</Text>
        </>) : isSA ? (cc !== 'CL' ? <Note>{tx(L, SA_NOTE[cc])}</Note> : !cl ? <Note>{extDone.CL ? t('noDataNow') : t('loading')}</Note> : !saGroups.length ? <Note>{t('fvNone')}</Note> : <>
          {saGroups.map(gr => (
            <View key={gr.g} style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.textMuted, marginTop: 4 }} accessibilityRole="header">{gName[gr.g]}</Text>
              <Card>
                {gr.items.map((p, i) => {
                  const ch = p.p ? (p.v / p.p - 1) * 100 : null;
                  return (
                    <View key={p.id + p.stage} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                      <Text style={{ fontSize: 22, width: 30, textAlign: 'center' }} accessibilityElementsHidden importantForAccessibility="no">{p.e}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{p.n[li]}</Text>
                        <Text style={{ fontSize: 12.5, color: C.textMuted }} numberOfLines={2}>{tx(L, ST_CL[p.stage])} · {fmtDate(p.d, L)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] }}>{num(p.v, L, 0)} CLP/kg</Text>
                        {ch != null ? <Text style={{ fontSize: 12.5, color: changeColor(ch), fontVariant: ['tabular-nums'] }}>{ch > 0 ? '+' : ''}{num(ch, L, 1)} %</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>
          ))}
          <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, CL_NOTE)}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{cl.source.name} · {cl.source.license}</Text>
        </>) : <>
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
      </>}
    </Screen>
  );
}
