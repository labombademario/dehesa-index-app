import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Button, Note, s } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { num, pct, date } from '../lib/format';

export default function Cesta() {
  const { user, setUser, price, t } = useApp();
  const L = user.lang;
  const [editing, setEditing] = useState(false);
  const items = user.basket.map(id => price(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const move = (i: number) => setUser(u => { const b = [...u.basket]; [b[i - 1], b[i]] = [b[i], b[i - 1]]; return { basket: b }; });
  const remove = (id: string) => setUser(u => ({ basket: u.basket.filter(x => x !== id) }));
  return (
    <Screen>
      <Stack.Screen options={{ title: t('basket'), headerRight: () => items.length ? (
        <Pressable onPress={() => setEditing(e => !e)} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={s.linkText}>{editing ? t('done') : t('edit')}</Text></Pressable>) : null }} />
      <Note>{t('mineHint')}</Note>
      {items.length ? (
        <Card>
          {items.map((p, i) => editing ? (
            <View key={p.id} style={[s.row, i > 0 && s.rowDivider]}>
              <View style={{ flex: 1 }}><Text style={s.rowTitle}>{p.name[L]}</Text><Text style={s.rowSub}>{p.place[L]}</Text></View>
              {i > 0 ? <Pressable onPress={() => move(i)} accessibilityRole="button" accessibilityLabel={`${t('moveUp')}: ${p.name[L]}`} hitSlop={6}
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18, color: C.accent }}>↑</Text></Pressable> : <View style={{ width: 44 }} />}
              <Pressable onPress={() => remove(p.id)} accessibilityRole="button" accessibilityLabel={`${t('remove')}: ${p.name[L]}`} hitSlop={6}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ fontSize: 15, fontWeight: '600', color: C.negative }}>{t('remove')}</Text></Pressable>
            </View>
          ) : (
            <Row key={p.id} first={i === 0} title={p.name[L]} sub={`${p.place[L]} · ${date(p.date, L)}`} right={`${num(p.value, L)} ${p.unit[L]}`}
              rightSub={pct(p.changePct, L)} rightColor={changeColor(p.changePct)} onPress={() => router.push(`/serie/${p.id}`)} />
          ))}
        </Card>
      ) : <Note>{t('emptyBasket')}</Note>}
      <Button kind="secondary" label={t('addPrices')} onPress={() => router.push('/precios')} />
    </Screen>
  );
}
