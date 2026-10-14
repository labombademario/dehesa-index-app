import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { num } from '../../lib/format';
import { Screen, Card, Note, s } from '../../components/ui';
import { C } from '../../lib/theme';
import { norm } from '../../lib/logic';
import { flag } from '../../lib/tx';
import type { Country } from '../../lib/types';

// Regiones en el orden en que se muestran; los códigos que no estén aquí caen en «Otros»
const GROUPS: { k: string; label: string; codes: string }[] = [
  { k: 'eu', label: 'regEu', codes: 'EU AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE' },
  { k: 'europe', label: 'regEurope', codes: 'UK CH NO IS RS UA TR MD' },
  { k: 'na', label: 'regNA', codes: 'US CA MX' },
  { k: 'sa', label: 'regSA', codes: 'AR CL BR UY PY CO PE BO EC' },
  { k: 'oce', label: 'regOce', codes: 'AU NZ' },
  { k: 'asia', label: 'regAsia', codes: 'JP KR CN IN ID TH VN PH MY' },
  { k: 'africa', label: 'regAfrica', codes: 'ZA MA EG KE NG' },
];

// Color de la cobertura: verde desde 75 %, ámbar entre 50 y 75, rojo por debajo
const AMBER = '#B7791F';
export const covColor = (p: number | null) => (p == null ? C.textMuted : p >= 75 ? C.positive : p >= 50 ? AMBER : C.negative);

function CountryRow({ c, first }: { c: Country; first: boolean }) {
  const { user, setUser, t } = useApp();
  const L = user.lang;
  const favs = user.favCountries ?? [user.market];
  const fav = favs.includes(c.code);
  const col = covColor(c.coveragePct);
  const toggle = () => setUser(u => { const cur = u.favCountries ?? [u.market]; return { favCountries: cur.includes(c.code) ? cur.filter(x => x !== c.code) : [...cur, c.code] }; });
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, !first && s.rowDivider]}>
      <Pressable onPress={() => router.push(`/pais/${c.code}`)} accessibilityRole="button" android_ripple={{ color: C.surfaceAlt }}
        accessibilityLabel={`${c.name[L]}, ${c.coveragePct == null ? '—' : num(c.coveragePct, L, 0)} %`} style={{ flex: 1, paddingLeft: 14, paddingVertical: 11 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.rowTitle}>{flag(c.code)} {c.name[L]}</Text>
          <Text style={[s.rowRight, { color: col }]}>{c.coveragePct == null ? '—' : `${num(c.coveragePct, L, 0)} %`}</Text>
        </View>
        <View style={{ height: 5, backgroundColor: C.surfaceAlt, borderRadius: 3, marginTop: 6 }}>
          <View style={{ height: 5, width: `${c.coveragePct ?? 0}%`, backgroundColor: col, borderRadius: 3 }} />
        </View>
      </Pressable>
      <Pressable onPress={toggle} hitSlop={6} accessibilityRole="button" accessibilityState={{ selected: fav }} accessibilityLabel={`${fav ? t('favRemove') : t('favAdd')}: ${c.name[L]}`}
        style={{ width: 48, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, color: fav ? C.gold : C.textMuted }}>{fav ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  );
}

export default function Countries() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const favCodes = user.favCountries ?? [user.market];
  const mine = useMemo(() => favCodes.map(cc => data.countries.find(c => c.code === cc)).filter((c): c is Country => !!c), [favCodes.join(','), data.countries]);
  const found = useMemo(() => {
    const k = norm(q.trim());
    return k ? data.countries.filter(c => norm(`${c.name[L]} ${c.name.es} ${c.name.en} ${c.code}`).includes(k)) : [];
  }, [q, data.countries, L]);
  const groups = useMemo(() => {
    const known = new Set<string>();
    const out = GROUPS.map(g => {
      const set = new Set(g.codes.split(' ')); set.forEach(x => known.add(x));
      return { ...g, list: data.countries.filter(c => set.has(c.code)) };
    });
    const rest = data.countries.filter(c => !known.has(c.code));
    if (rest.length) out.push({ k: 'other', label: 'regOther', codes: '', list: rest });
    return out.filter(g => g.list.length);
  }, [data.countries]);
  return (
    <Screen refresh title={t('tabCountries')}>
      <Note>{t('coverageHint')}</Note>
      <TextInput value={q} onChangeText={setQ} placeholder={t('countrySearch')} placeholderTextColor={C.textMuted} returnKeyType="search" autoCorrect={false}
        accessibilityLabel={t('countrySearch')} style={[s.input, { borderRadius: 28, paddingHorizontal: 16, backgroundColor: C.surfaceAlt, borderWidth: 0 }]} />
      {q.trim() ? (
        <Card>{found.length ? found.map((c, i) => <CountryRow key={c.code} c={c} first={i === 0} />) : <Text style={{ padding: 14, color: C.textMuted }}>{t('noResults')}</Text>}</Card>
      ) : <>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }} accessibilityRole="header">★ {t('myCountries')}</Text>
          {mine.length ? <Card>{mine.map((c, i) => <CountryRow key={c.code} c={c} first={i === 0} />)}</Card> : <Note>{t('myCountriesEmpty')}</Note>}
        </View>
        {groups.map(g => {
          const on = !!open[g.k];
          return (
            <Card key={g.k}>
              <Pressable onPress={() => setOpen(o => ({ ...o, [g.k]: !o[g.k] }))} accessibilityRole="button" accessibilityState={{ expanded: on }}
                accessibilityLabel={`${t(g.label)}, ${t('regCount', String(g.list.length))}`} android_ripple={{ color: C.surfaceAlt }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 52 }}>
                <Text style={{ fontSize: 16, color: C.textMuted, width: 14 }}>{on ? '▾' : '▸'}</Text>
                <Text style={[s.rowTitle, { flex: 1, fontSize: 16 }]}>{t(g.label)}</Text>
                <Text style={{ fontSize: 13, color: C.textMuted }}>{t('regCount', String(g.list.length))}</Text>
              </Pressable>
              {on ? g.list.map(c => <View key={c.code} style={s.rowDivider}><CountryRow c={c} first /></View>) : null}
            </Card>
          );
        })}
      </>}
    </Screen>
  );
}
