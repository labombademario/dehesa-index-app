// Denominaciones de origen (como la sección de la web, data/gi/<CC>.json): vinos y quesos con nombre protegido en la UE según el registro
// eAmbrosia de la Comisión Europea. Solo lo que publica el registro: nombre, DOP/IGP, año de protección y enlace al texto legal.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note, Segmented } from '../components/ui';
import { Chips } from '../components/Chips';
import { C } from '../lib/theme';
import { webJson, countryName } from '../lib/fv';
import { norm } from '../lib/logic';
import { tx, fill, flag } from '../lib/tx';
import { CountrySelect } from '../components/CountryPicker';
import { openSafe } from '../lib/openLink';
import { param } from '../lib/safe';
import { GiZone, ZONE_TXT, type GiGeo } from '../components/GiZone';

type GI = { n: string[]; t: 'PDO' | 'PGI' | 'GI'; y?: number; f?: string; u?: string };
type Kind = 'wine' | 'cheese';
const TYPE = { PDO: { es: 'DOP', en: 'PDO', fr: 'AOP', it: 'DOP' }, PGI: { es: 'IGP', en: 'PGI', fr: 'IGP', it: 'IGP' }, GI: { es: 'IG', en: 'GI', fr: 'IG', it: 'IG' } };

export default function Denominaciones() {
  const { user, t } = useApp();
  const L = user.lang;
  const [idx, setIdx] = useState<Record<string, { wine: number; cheese: number }> | null>(null);
  const rp = useLocalSearchParams<{ c?: string }>();   // parámetros saneados: un valor raro (p. ej. desde dehesaindex://) cuenta como no encontrado
  const pc = param(rp.c, 'cc') || undefined;
  const [cc, setCc] = useState<string>(pc ? String(pc) : 'ES');
  const [doc, setDoc] = useState<Record<string, { wine: GI[]; cheese: GI[] } | null>>({});
  const [kind, setKind] = useState<Kind>('wine');
  const [ty, setTy] = useState<'all' | 'PDO' | 'PGI'>('all');
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [idxDone, setIdxDone] = useState(false);
  const [geo, setGeo] = useState<Record<string, GiGeo | null>>({});   // zonas por país (no hay para FR: sus contornos van aparte en la web)
  const [zone, setZone] = useState<string | null>(null);
  useEffect(() => { webJson('data/gi/index.json', 24 * 3600e3).catch(() => null).then((d: any) => { const c = d?.countries ?? null; setIdx(c); setIdxDone(true); if (c && !pc && user.market && c[user.market]) setCc(user.market); }); }, []);
  useEffect(() => { if (doc[cc] === undefined) webJson('data/gi/' + cc + '.json', 24 * 3600e3).catch(() => null).then((d: any) => setDoc(o => ({ ...o, [cc]: d ? { wine: d.wine ?? [], cheese: d.cheese ?? [] } : null }))); setAll(false); setZone(null); if (cc !== 'FR' && geo[cc] === undefined) webJson('data/gi/' + cc + '-geo.json', 24 * 3600e3).catch(() => null).then((g: any) => setGeo(o => ({ ...o, [cc]: g && g.areas ? g : null }))); }, [cc]);
  const ccs = useMemo(() => (idx ? Object.keys(idx).filter(k => idx[k].wine + idx[k].cheese > 0).sort((a, b) => (idx[b].wine + idx[b].cheese) - (idx[a].wine + idx[a].cheese)) : []), [idx]);
  const d = doc[cc];
  const items = useMemo(() => {
    if (!d) return [] as GI[]; const qq = norm(q);
    return d[kind].filter(g => (ty === 'all' || g.t === ty) && (!qq || norm(g.n.join(' ')).includes(qq))).sort((a, b) => a.n[0].localeCompare(b.n[0], L));
  }, [d, kind, ty, q, L]);
  const shown = all || q ? items : items.slice(0, 40);
  return (
    <Screen>
      <Stack.Screen options={{ title: tx(L, { es: 'Denominaciones de origen', en: 'Designations of origin', fr: 'Appellations d’origine', it: 'Denominazioni di origine' }) }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">{tx(L, { es: 'Denominaciones de origen', en: 'Designations of origin', fr: 'Appellations d’origine', it: 'Denominazioni di origine' })}</Text>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20 }}>{tx(L, { es: 'Vinos y quesos con nombre protegido en la UE (registrados y vigentes).', en: 'Wines and cheeses with a name protected in the EU (registered and in force).', fr: 'Vins et fromages au nom protégé dans l’UE (enregistrés et en vigueur).', it: 'Vini e formaggi con nome protetto nell’UE (registrati e in vigore).' })}</Text>
      {!idx ? <Note>{idxDone ? t('noDataNow') : t('loading')}</Note> : <>
        <CountrySelect items={ccs.map(c => ({ value: c, label: countryName(c, L), flag: flag(c) }))} value={cc} onChange={setCc} />
        <Segmented options={[{ value: 'wine' as Kind, label: '🍷 ' + tx(L, { es: 'Vinos', en: 'Wines', fr: 'Vins', it: 'Vini' }) + (idx[cc] ? ' (' + idx[cc].wine + ')' : '') }, { value: 'cheese' as Kind, label: '🧀 ' + tx(L, { es: 'Quesos', en: 'Cheeses', fr: 'Fromages', it: 'Formaggi' }) + (idx[cc] ? ' (' + idx[cc].cheese + ')' : '') }]} value={kind} onChange={setKind} />
        <Segmented options={[{ value: 'all' as const, label: tx(L, { es: 'Todas', en: 'All', fr: 'Toutes', it: 'Tutte' }) }, { value: 'PDO' as const, label: tx(L, TYPE.PDO) }, { value: 'PGI' as const, label: tx(L, TYPE.PGI) }]} value={ty} onChange={setTy} />
        <TextInput value={q} onChangeText={setQ} placeholder={tx(L, { es: 'Buscar', en: 'Search', fr: 'Rechercher', it: 'Cerca' })} placeholderTextColor={C.textMuted} clearButtonMode="while-editing" autoCorrect={false}
          style={{ height: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: C.surfaceAlt, color: C.text, fontSize: 15 }} />
        {d === undefined ? <Note>{t('loading')}</Note> : !items.length ? <Note>{tx(L, { es: 'Sin denominaciones registradas.', en: 'No registered designations.', fr: 'Aucune appellation enregistrée.', it: 'Nessuna denominazione registrata.' })}</Note> : <Card>
          {shown.map((g, i) => (
            <React.Fragment key={g.f ?? g.n[0]}>
            <Pressable disabled={!g.u} onPress={() => g.u && openSafe(g.u)} accessibilityRole={g.u ? 'link' : undefined}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{g.n.join(' / ')}</Text>
                {g.y ? <Text style={{ fontSize: 12, color: C.textMuted }}>{fill(tx(L, { es: 'protegida desde {0}', en: 'protected since {0}', fr: 'protégée depuis {0}', it: 'protetta dal {0}' }), g.y)}</Text> : null}
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: g.t === 'PDO' ? C.accent : C.surfaceAlt }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: g.t === 'PDO' ? C.accentInk : C.text }}>{tx(L, TYPE[g.t] ?? TYPE.GI)}</Text>
              </View>
            </Pressable>
            {g.f && geo[cc]?.areas[g.f] ? <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <Pressable onPress={() => setZone(zone === g.f ? null : g.f!)} accessibilityRole="button" accessibilityState={{ expanded: zone === g.f }}>
                <Text style={{ color: C.accent, fontWeight: '600', fontSize: 13 }}>{tx(L, zone === g.f ? ZONE_TXT.hide : ZONE_TXT.show)}</Text>
              </Pressable>
              {zone === g.f ? <GiZone geo={geo[cc]!} f={g.f} L={L} /> : null}
            </View> : null}
            </React.Fragment>
          ))}
          {!all && !q && items.length > 40 ? <Pressable onPress={() => setAll(true)} accessibilityRole="button" style={{ padding: 12, borderTopWidth: 1, borderTopColor: C.border }}>
            <Text style={{ color: C.accent, fontWeight: '600', textAlign: 'center' }}>{fill(tx(L, { es: 'Ver las {0}', en: 'Show all {0}', fr: 'Voir les {0}', it: 'Vedi tutte le {0}' }), items.length)}</Text>
          </Pressable> : null}
        </Card>}
        <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'DOP: vínculo más estrecho con la zona (queso: todo el proceso; vino: toda la uva). IGP: vínculo más flexible (queso: al menos una fase; vino: al menos el 85 % de la uva). Toca una para abrir su texto legal.', en: 'PDO: closest link to the area (cheese: the whole process; wine: all the grapes). PGI: looser link (cheese: at least one stage; wine: at least 85% of the grapes). Tap one to open its legal text.', fr: 'AOP : lien le plus étroit avec la zone (fromage : tout le processus ; vin : tout le raisin). IGP : lien plus souple (fromage : au moins une étape ; vin : au moins 85 % du raisin). Touchez-en une pour ouvrir son texte légal.', it: 'DOP: legame più stretto con la zona (formaggio: tutto il processo; vino: tutta l’uva). IGP: legame più flessibile (formaggio: almeno una fase; vino: almeno l’85% dell’uva). Toccane una per aprire il testo legale.' })}</Text>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{tx(L, { es: 'Fuente: © Unión Europea, eAmbrosia (registro de indicaciones geográficas de la UE), CC BY 4.0.', en: 'Source: © European Union, eAmbrosia (EU geographical indications register), CC BY 4.0.', fr: 'Source : © Union européenne, eAmbrosia (registre des indications géographiques de l’UE), CC BY 4.0.', it: 'Fonte: © Unione europea, eAmbrosia (registro delle indicazioni geografiche dell’UE), CC BY 4.0.' })}</Text>
      </>}
    </Screen>
  );
}
