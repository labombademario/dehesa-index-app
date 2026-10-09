import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, SectionTitle, Segmented, Sparkline, Button, s } from '../../components/ui';
import { C, R, changeColor } from '../../lib/theme';
import { num, pct, date } from '../../lib/format';
import { norm } from '../../lib/logic';
import type { Price } from '../../lib/types';

type Reg = Price['region'];

export default function Prices() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const [q, setQ] = useState('');
  const [reg, setReg] = useState<Reg>(user.market === 'US' ? 'us' : user.market === 'CA' ? 'ca' : 'eu');
  const idx = data.today.index;
  const found = useMemo(() => {
    const k = norm(q.trim());
    if (!k) return [];
    return data.prices.filter(p => norm(`${p.name[L]} ${p.place[L]} ${p.name.es} ${p.product}`).includes(k)).slice(0, 30);
  }, [q, data.prices, L]);
  const list = data.prices.filter(p => p.region === reg);
  const row = (p: Price, i: number) => (
    <Pressable key={p.id} onPress={() => router.push(`/serie/${p.id}`)} accessibilityRole="button" android_ripple={{ color: C.surfaceAlt }}
      style={[s.row, i > 0 && s.rowDivider]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle}>{p.name[L]}</Text>
        <Text style={s.rowSub}>{p.place[L]} · {date(p.date, L)}</Text>
      </View>
      <Sparkline points={p.points.slice(-12).map(x => x[1])} color={changeColor(p.changePct)} />
      <View style={{ alignItems: 'flex-end', minWidth: 96 }}>
        <Text style={s.rowRight}>{num(p.value, L)}</Text>
        <Text style={{ fontSize: 11.5, color: C.textMuted }}>{p.unit[L]}</Text>
        <Text style={[s.rowRightSub, { color: changeColor(p.changePct) }]}>{pct(p.changePct, L)}</Text>
      </View>
    </Pressable>
  );
  return (
    <Screen refresh title={t('tabPrices')}>
      {idx ? (
        <Pressable onPress={() => router.push('/seccion/indice')} accessibilityRole="button"
          style={{ backgroundColor: C.accent, borderRadius: R.card, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: C.accentInk, fontSize: 13, opacity: 0.85 }}>{t('index')} · {date(idx.period, L)}</Text>
            <Text style={{ color: C.accentInk, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{num(idx.value, L, 2)}</Text>
            <Text style={{ color: C.accentInk, fontSize: 13, opacity: 0.9 }}>{t('indexBase', date(idx.base.period, L))}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: C.accentInk, fontWeight: '700' }}>{t('inMonth', pct(idx.changeMoMPct, L))}</Text>
            <Text style={{ color: C.accentInk, fontWeight: '700' }}>{t('inYear', pct(idx.changeYoYPct, L))}</Text>
          </View>
        </Pressable>
      ) : null}
      <Button kind="secondary" label={t('compare')} onPress={() => router.push('/comparar')} />
      <TextInput value={q} onChangeText={setQ} placeholder={t('search')} placeholderTextColor={C.textMuted} returnKeyType="search"
        accessibilityLabel={t('search')} style={[s.input, { borderRadius: 28, paddingHorizontal: 16, backgroundColor: C.surfaceAlt, borderWidth: 0 }]} />
      {q.trim() ? (
        <Card>{found.length ? found.map(row) : <Row first title={t('noResults')} />}</Card>
      ) : (
        <>
          <SectionTitle>{t('byRegion')}</SectionTitle>
          <Segmented value={reg} onChange={setReg} options={[{ value: 'eu', label: t('regionEu') }, { value: 'us', label: t('regionUs') }, { value: 'ca', label: t('regionCa') }, { value: 'uk', label: t('regionUk') }]} />
          <Card>{list.map(row)}</Card>
        </>
      )}
    </Screen>
  );
}
