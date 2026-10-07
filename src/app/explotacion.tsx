import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp, type CropLine } from '../lib/store';
import { Screen, Card, Row, Button, Note, Segmented, s } from '../components/ui';
import { C } from '../lib/theme';
import { cropMargin, herdMargin, ratio } from '../lib/logic';
import { num, eur, date } from '../lib/format';
import type { Lang, Price } from '../lib/types';

const n = (v: string) => { const x = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
type Tab = 'crops' | 'livestock' | 'ratios';

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" accessibilityLabel={label} />
    </View>
  );
}

function Result({ L, t, income, cost, margin, extra }: { L: Lang; t: (k: string, ...v: (string | number)[]) => string; income: number; cost: number; margin: number; extra?: React.ReactNode }) {
  return (
    <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.rowSub}>{t('income')} {eur(income, L)} · {t('costs')} {eur(cost, L)}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: margin >= 0 ? C.positive : C.negative, fontVariant: ['tabular-nums'] }}>{t('margin')} {eur(margin, L)}</Text>
      {extra}
    </View>
  );
}

export default function Explotacion() {
  const { data, user, setUser, t } = useApp();
  const L = user.lang;
  const [tab, setTab] = useState<Tab>(user.profile === 'dairy' || user.profile === 'pig' ? 'livestock' : 'crops');
  const eu = (product: string): Price | undefined => data.prices.find(p => p.region === 'eu' && p.product === product);
  const priceRef = (p: Price | undefined) => p ? t('priceRef', `${num(p.value, L)} ${p.unit[L]}`, `${p.place[L]}, ${date(p.date, L)}`) : t('noPrice');

  const setCrop = (id: string, patch: Partial<CropLine>) => setUser(u => ({ crops: u.crops.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const products: CropLine['product'][] = ['trigo', 'maiz', 'cebada'];

  const milk = eu('leche'), pig = eu('cerdo');
  const ratios = [
    { key: 'ratioWheatDiesel', r: ratio(eu('trigo'), eu('diesel')), dec: 0, unit: 'l' },
    { key: 'ratioPigMaize', r: ratio(pig, eu('maiz'), 10), dec: 2, unit: 'kg' },
    { key: 'ratioMilkSoy', r: ratio(milk, eu('harina_soja'), 10), dec: 2, unit: 'kg' },
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: t('farm') }} />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'crops', label: t('crops') }, { value: 'livestock', label: t('livestock') }, { value: 'ratios', label: t('ratios') }]} />
      {tab !== 'ratios' ? <Note>{t('example')} {t('farmEu')}</Note> : <Note>{t('ratiosHint')}</Note>}

      {tab === 'crops' ? <>
        {user.crops.map(c => {
          const p = eu(c.product);
          const m = cropMargin(n(c.ha), n(c.yld), n(c.cost), p?.value ?? 0);
          return (
            <Card key={c.id} style={{ padding: 14, gap: 10 }}>
              <Segmented value={c.product} onChange={product => setCrop(c.id, { product })} options={products.map(x => ({ value: x, label: eu(x)?.name[L] ?? x }))} />
              <Text style={s.rowSub}>{priceRef(p)}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Field label={t('area')} value={c.ha} onChange={ha => setCrop(c.id, { ha })} />
                <Field label={t('yield')} value={c.yld} onChange={yld => setCrop(c.id, { yld })} />
                <Field label={t('costHa')} value={c.cost} onChange={cost => setCrop(c.id, { cost })} />
              </View>
              {p ? <Result L={L} t={t} income={m.income} cost={m.cost} margin={m.margin} extra={<>
                {m.perHa != null ? <Text style={s.rowSub}>{t('perHa', eur(m.perHa, L))}</Text> : null}
                {m.breakEven != null ? <Text style={s.rowSub}>{t('breakEven')}: {num(m.breakEven, L, 0)} {p.unit[L]}</Text> : null}
                {m.cushionPct != null ? <Text style={s.rowSub}>{t('cushion')}: {num(m.cushionPct, L, 1)} %</Text> : null}
              </>} /> : null}
              {user.crops.length > 1 ? <Pressable onPress={() => setUser(u => ({ crops: u.crops.filter(x => x.id !== c.id) }))} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
                <Text style={{ color: C.negative, fontWeight: '600' }}>{t('delete')}</Text></Pressable> : null}
            </Card>
          );
        })}
        <Button kind="secondary" label={t('addCrop')} onPress={() => setUser(u => ({ crops: [...u.crops, { id: 'c' + Date.now().toString(36), product: 'cebada', ha: '10', yld: '5', cost: '900' }] }))} />
        <Note>{t('notForecast')}</Note>
      </> : null}

      {tab === 'livestock' ? <>
        <Card style={{ padding: 14, gap: 10 }}>
          <Text style={[s.rowTitle, { fontSize: 17 }]}>{t('dairy')}</Text>
          <Text style={s.rowSub}>{priceRef(milk)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Field label={t('cows')} value={user.milk.cows} onChange={cows => setUser(u => ({ milk: { ...u.milk, cows } }))} />
            <Field label={t('kgCow')} value={user.milk.kg} onChange={kg => setUser(u => ({ milk: { ...u.milk, kg } }))} />
            <Field label={t('costMilk')} value={user.milk.cost} onChange={cost => setUser(u => ({ milk: { ...u.milk, cost } }))} />
          </View>
          {milk ? (() => { const m = herdMargin(n(user.milk.cows) * n(user.milk.kg), milk.value / 100, n(user.milk.cost) / 100);
            return <Result L={L} t={t} income={m.income} cost={m.cost} margin={m.margin} extra={m.cushionPct != null ? <Text style={s.rowSub}>{t('cushion')}: {num(m.cushionPct, L, 1)} %</Text> : null} />; })() : null}
        </Card>
        <Card style={{ padding: 14, gap: 10 }}>
          <Text style={[s.rowTitle, { fontSize: 17 }]}>{t('pork')}</Text>
          <Text style={s.rowSub}>{priceRef(pig)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Field label={t('pigs')} value={user.pig.n} onChange={v => setUser(u => ({ pig: { ...u.pig, n: v } }))} />
            <Field label={t('kgCarcass')} value={user.pig.kg} onChange={kg => setUser(u => ({ pig: { ...u.pig, kg } }))} />
            <Field label={t('costKg')} value={user.pig.cost} onChange={cost => setUser(u => ({ pig: { ...u.pig, cost } }))} />
          </View>
          {pig ? (() => { const m = herdMargin(n(user.pig.n) * n(user.pig.kg), pig.value / 100, n(user.pig.cost));
            return <Result L={L} t={t} income={m.income} cost={m.cost} margin={m.margin} extra={m.cushionPct != null ? <Text style={s.rowSub}>{t('cushion')}: {num(m.cushionPct, L, 1)} %</Text> : null} />; })() : null}
        </Card>
        <Note>{t('notForecast')}</Note>
      </> : null}

      {tab === 'ratios' ? (
        <Card>
          {ratios.map((x, i) => {
            const r = x.r;
            const sub = !r ? t('noPrice') : r.ago == null ? t('noYearAgo') : `${t('yearAgo')}: ${num(r.ago, L, x.dec)} ${x.unit} · ${r.now >= r.ago ? t('better') : t('worse')}`;
            return <Row key={x.key} first={i === 0} title={t(x.key)} sub={sub} right={r ? `${num(r.now, L, x.dec)} ${x.unit}` : '—'}
              rightColor={r && r.ago != null ? (r.now >= r.ago ? C.positive : C.negative) : undefined} />;
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
