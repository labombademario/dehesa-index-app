import React, { useEffect, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Button, Note, Segmented, SectionTitle, s } from '../components/ui';
import { C } from '../lib/theme';
import { evaluateAlert, type AlertRule } from '../lib/logic';
import { num } from '../lib/format';

const parse = (v: string) => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };

export default function Avisos() {
  const { nuevo } = useLocalSearchParams<{ nuevo?: string }>();
  const { data, user, setUser, price, t } = useApp();
  const L = user.lang;
  const [form, setForm] = useState<{ priceId: string; cond: AlertRule['cond']; value: string } | null>(null);
  const [err, setErr] = useState(false);

  const open = (priceId: string) => { const p = price(priceId); setErr(false); setForm({ priceId, cond: 'ge', value: p ? String(Math.round(p.value * 100) / 100) : '' }); };
  useEffect(() => { if (nuevo) open(String(nuevo)); }, [nuevo]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!form) return;
    const v = parse(form.value);
    if (v == null) { setErr(true); return; }
    setUser(u => ({ alerts: [...u.alerts, { id: 'a' + Date.now().toString(36), priceId: form.priceId, cond: form.cond, value: v, on: true }] }));
    setForm(null);
  };
  const toggle = (id: string, on: boolean) => setUser(u => ({ alerts: u.alerts.map(a => a.id === id ? { ...a, on } : a) }));
  const del = (id: string) => setUser(u => ({ alerts: u.alerts.filter(a => a.id !== id) }));

  // Para elegir precio: primero los de la cesta, luego el resto
  const choices = [...user.basket.map(id => price(id)).filter(Boolean), ...data.prices.filter(p => !user.basket.includes(p.id))] as NonNullable<ReturnType<typeof price>>[];
  const fp = form ? price(form.priceId) : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: t('alerts') }} />
      {form ? (
        <Card style={{ padding: 14, gap: 12 }}>
          <Text style={[s.rowTitle, { fontSize: 17 }]}>{t('newAlert')}</Text>
          {fp ? <>
            <Text style={s.rowTitle}>{fp.name[L]} <Text style={s.rowSub}>· {fp.place[L]}</Text></Text>
            <Text style={s.rowSub}>{t('now', `${num(fp.value, L)} ${fp.unit[L]}`)}</Text>
          </> : null}
          <View>
            <Text style={s.label}>{t('whenPrice')}</Text>
            <Segmented value={form.cond} onChange={cond => setForm({ ...form, cond })} options={[{ value: 'ge', label: t('goesUp') }, { value: 'le', label: t('goesDown') }]} />
          </View>
          <View>
            <Text style={s.label}>{t('value')}{fp ? ` (${fp.unit[L]})` : ''}</Text>
            <TextInput style={s.input} value={form.value} onChangeText={value => { setErr(false); setForm({ ...form, value }); }}
              keyboardType="decimal-pad" accessibilityLabel={t('value')} returnKeyType="done" onSubmitEditing={save} />
            {err ? <Text style={{ color: C.negative, fontSize: 13, marginTop: 4 }}>{t('badValue')}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label={t('save')} onPress={save} />
            <Button kind="secondary" label={t('cancel')} onPress={() => setForm(null)} />
          </View>
        </Card>
      ) : null}

      {user.alerts.length ? (
        <Card>
          {user.alerts.map((a, i) => {
            const p = price(a.priceId), st = evaluateAlert(a, p);
            const status = st.kind === 'hit' ? t('hit') : st.kind === 'paused' ? t('paused') : st.kind === 'missing' ? t('missing') : t('gap', `${num(st.gap, L)} ${p?.unit[L] ?? ''}`);
            return (
              <View key={a.id} style={[s.row, i > 0 && s.rowDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{p ? p.name[L] : a.priceId}</Text>
                  <Text style={s.rowSub}>{a.cond === 'ge' ? t('goesUp') : t('goesDown')} {num(a.value, L)} {p?.unit[L] ?? ''}{p ? ` · ${t('now', num(p.value, L))}` : ''}</Text>
                  <Text style={[s.rowSub, { fontWeight: '600', color: st.kind === 'hit' ? C.positive : C.textMuted }]}>{status}</Text>
                  <Pressable onPress={() => del(a.id)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' }}>
                    <Text style={{ color: C.negative, fontSize: 14, fontWeight: '600' }}>{t('delete')}</Text></Pressable>
                </View>
                <Switch value={a.on} onValueChange={on => toggle(a.id, on)} trackColor={{ true: C.accent, false: C.border }} accessibilityLabel={p ? p.name[L] : a.priceId} />
              </View>
            );
          })}
        </Card>
      ) : !form ? <Note>{t('noAlerts')}</Note> : null}

      {!form ? <>
        <SectionTitle>{t('choosePrice')}</SectionTitle>
        <Card>{choices.slice(0, 30).map((p, i) => (
          <Pressable key={p.id} onPress={() => open(p.id)} accessibilityRole="button" android_ripple={{ color: C.surfaceAlt }} style={[s.row, i > 0 && s.rowDivider]}>
            <View style={{ flex: 1 }}><Text style={s.rowTitle}>{p.name[L]}</Text><Text style={s.rowSub}>{p.place[L]}</Text></View>
            <Text style={s.linkText}>+</Text>
          </Pressable>))}
        </Card>
      </> : null}
      <Note>{t('alertsNote')}</Note>
    </Screen>
  );
}
