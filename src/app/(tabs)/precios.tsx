import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { LJ } from '../../lib/lonjasNames';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, SectionTitle, Segmented, Sparkline, Button, OfficialBadge, s } from '../../components/ui';
import { C, R, changeColor } from '../../lib/theme';
import { num, pct, date } from '../../lib/format';
import { norm } from '../../lib/logic';
import type { Price } from '../../lib/types';
import { countryName } from '../../lib/fv';
import { flag, tx } from '../../lib/tx';

type Reg = Price['region'];

export default function Prices() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const [q, setQ] = useState('');
  const [reg, setReg] = useState<Reg>(user.market === 'US' ? 'us' : user.market === 'CA' ? 'ca' : 'eu');
  useEffect(() => { setReg(user.market === 'US' ? 'us' : user.market === 'CA' ? 'ca' : 'eu'); }, [user.market]);   // al cambiar de mercado en Ajustes
  const idx = data.today.index;
  const found = useMemo(() => {
    const k = norm(q.trim());
    if (!k) return [];
    return data.prices.filter(p => norm(`${p.name[L]} ${p.place[L]} ${p.name.es} ${p.product}`).includes(k)).slice(0, 30);
  }, [q, data.prices, L]);
  // Europa: primero los precios del país del usuario (si no es España) y luego España, que es la referencia de la UE en la web; nunca se mezclan
  const mine = reg === 'eu' && user.market !== 'ES' ? data.prices.filter(p => p.cc === user.market) : [];
  const list = data.prices.filter(p => p.region === reg && !p.cc);
  const isSpain = (p: Price) => /España/.test(p.place.es);
  const row = (p: Price, i: number) => (
    <Pressable key={p.id} onPress={() => router.push(`/serie/${p.id}`)} accessibilityRole="button" android_ripple={{ color: C.surfaceAlt }}
      style={[s.row, i > 0 && s.rowDivider]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle}>{p.name[L]}</Text>
        <Text style={s.rowSub}>{p.place[L]} · {p.stale ? t('staleData', date(p.date, L)) : date(p.date, L)}</Text>
        <OfficialBadge />
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
      {/* frutas y hortalizas: solo hay datos europeos, así que solo se ofrece con el mercado Europa */}
      {reg === 'eu' ? <Pressable onPress={() => router.push('/frutas')} accessibilityRole="button" accessibilityLabel={t('fvTitle')}
        style={{ backgroundColor: C.surface, borderRadius: R.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ fontSize: 26 }} accessibilityElementsHidden importantForAccessibility="no">🍅🍊🥬</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{t('fvTitle')}</Text>
          <Text style={{ fontSize: 13, color: C.textMuted }}>{t('fvSub', 52)}</Text>
        </View>
        <Text style={{ fontSize: 20, color: C.textMuted }}>›</Text>
      </Pressable> : null}
      <Button kind="secondary" label={t('compare')} onPress={() => router.push('/comparar')} />
      <TextInput value={q} onChangeText={setQ} placeholder={t('search')} placeholderTextColor={C.textMuted} returnKeyType="search"
        accessibilityLabel={t('search')} style={[s.input, { borderRadius: 28, paddingHorizontal: 16, backgroundColor: C.surfaceAlt, borderWidth: 0 }]} />
      {q.trim() ? (
        <Card>{found.length ? found.map(row) : <Row first title={t('noResults')} />}</Card>
      ) : (
        <>
          <SectionTitle>{t('byRegion')}</SectionTitle>
          <Segmented value={reg} onChange={setReg} options={[{ value: 'eu', label: t('regionEu') }, { value: 'us', label: t('regionUs') }, { value: 'ca', label: t('regionCa') }, { value: 'uk', label: t('regionUk') }]} />
          {mine.length ? <>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{flag(user.market)} {countryName(user.market, L)}</Text>
            <Card>{mine.map(row)}</Card>
            {LJ.CTRY[user.market]?.includes('cereales') ? (
              // desde 2026/27 la Comisión publica los cereales por mercado: todos los de este país, cada uno con su nombre
              <Card><Row first title={tx(L, { es: 'Cereales: todos los mercados', en: 'Cereals: every market', fr: 'Céréales : tous les marchés', it: 'Cereali: tutti i mercati' }) + ' · ' + countryName(user.market, L)}
                sub={tx(L, { es: 'Precio de cada mercado (Comisión Europea), sin medias', en: 'Each market’s price (European Commission), no averages', fr: 'Prix de chaque marché (Commission européenne), sans moyennes', it: 'Prezzo di ogni mercato (Commissione europea), senza medie' })}
                right="›" onPress={() => router.push({ pathname: '/lonjas', params: { c: user.market } })} /></Card>
            ) : null}
          </> : null}
          {reg === 'eu' ? <>
            {/* España y, aparte, las referencias de toda la UE o del mercado mundial (avena UE, Brent, urea…): no van bajo «España» */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{flag('ES')} {countryName('ES', L)}</Text>
            <Card>{list.filter(isSpain).map(row)}</Card>
            {list.some(p => !isSpain(p)) ? <>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>🌍 {tx(L, { es: 'Referencias de la UE y del mercado mundial', en: 'EU and world-market references', fr: 'Références de l’UE et du marché mondial', it: 'Riferimenti UE e del mercato mondiale' })}</Text>
              <Card>{list.filter(p => !isSpain(p)).map(row)}</Card>
            </> : null}
          </> : <Card>{list.map(row)}</Card>}
        </>
      )}
    </Screen>
  );
}
