import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { num } from '../../lib/format';
import { Screen, Card, Note, s } from '../../components/ui';
import { C } from '../../lib/theme';
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

function CountryRow({ c, first }: { c: Country; first: boolean }) {
  const { user } = useApp();
  const L = user.lang;
  return (
    <Pressable onPress={() => router.push(`/pais/${c.code}`)} accessibilityRole="button" android_ripple={{ color: C.surfaceAlt }}
      accessibilityLabel={`${c.name[L]}, ${c.coveragePct == null ? '—' : num(c.coveragePct, L, 0)} %`} style={[{ paddingHorizontal: 14, paddingVertical: 11 }, !first && s.rowDivider]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.rowTitle}>{c.name[L]}</Text>
        <Text style={s.rowRight}>{c.coveragePct == null ? '—' : `${num(c.coveragePct, L, 0)} %`}</Text>
      </View>
      <View style={{ height: 5, backgroundColor: C.surfaceAlt, borderRadius: 3, marginTop: 6 }}>
        <View style={{ height: 5, width: `${c.coveragePct ?? 0}%`, backgroundColor: C.accent, borderRadius: 3 }} />
      </View>
    </Pressable>
  );
}

export default function Countries() {
  const { data, t } = useApp();
  const [open, setOpen] = useState<Record<string, boolean>>({});
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
            {on ? g.list.map((c, i) => <View key={c.code} style={s.rowDivider}><CountryRow c={c} first /></View>) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
