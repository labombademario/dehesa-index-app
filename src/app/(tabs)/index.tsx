import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, SectionTitle, Icon, Note } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { movers } from '../../lib/logic';
import { num, pct, date, localTime } from '../../lib/format';

// Nombre legible de un conjunto de datos: si el feed solo trae el nombre del fichero, se limpia (data/abares-stats.json -> abares)
function dataName(name: string, file: string): string {
  const n = name.replace(/^Update /, '');
  if (/^data\/.+\.json$/.test(n)) return n.replace(/^data\//, '').replace(/\.json$/, '').replace(/-stats$/, '').replace(/-/g, ' ');
  return n;
}

export default function Today() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const mv = movers(data.prices, user.basket);
  const cal = data.today.calendar.filter(e => Date.parse(e.at) > Date.now() - 3600e3).slice(0, 3);
  const news = data.news.slice(0, 2);
  const now = new Date();
  const weekday = new Intl.DateTimeFormat({ es: 'es-ES', en: 'en-GB', fr: 'fr-FR', it: 'it-IT' }[L], { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return (
    <Screen refresh title={t('tabToday')} subtitle={weekday.charAt(0).toUpperCase() + weekday.slice(1)}>
      <View style={{ backgroundColor: C.hero, borderRadius: 20, padding: 22, gap: 14 }}>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 33, fontWeight: '700', color: '#FFFFFF' }}>{t('heroTitle')}</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: 'rgba(251,249,243,0.82)' }}>{t('heroSub')}</Text>
        <Pressable onPress={() => router.navigate('/mi')} accessibilityRole="button" style={{ backgroundColor: C.gold, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E3328', textAlign: 'center' }}>{t('heroCta')} →</Text>
        </Pressable>
      </View>

      <SectionTitle>{t('todayMovers')}</SectionTitle>
      <Card>
        {mv.length ? mv.map((p, i) => (
          <Row key={p.id} badge first={i === 0} title={p.name[L]} sub={`${p.place[L]} · ${date(p.date, L)}`}
            right={`${num(p.value, L)} ${p.unit[L]}`} rightSub={pct(p.changePct, L)} rightColor={changeColor(p.changePct)}
            onPress={() => router.push(`/serie/${p.id}`)} />
        )) : <Row first title={t('emptyBasket')} onPress={() => router.push('/precios')} />}
      </Card>

      <SectionTitle>{t('summaryTitle')}</SectionTitle>
      <Card><Row first title={t('summaryTitle')} sub={t('summarySub')} right="›" onPress={() => router.push('/resumen')} /><Row title={t('gsTitle')} sub={t('gsPlaceholder')} right="›" onPress={() => router.push('/buscar')} /></Card>

      {cal.length ? <>
        <SectionTitle action={t('seeCalendar')} onAction={() => router.push('/calendario')}>{t('upcoming')}</SectionTitle>
        <Card>{cal.map((e, i) => { const lt = localTime(e.at, L); return <Row key={e.id} first={i === 0} title={e.name} sub={e.agency} right={lt.time} rightSub={lt.day} />; })}</Card>
      </> : null}

      {news.length ? <>
        <SectionTitle action={t('seeAll')} onAction={() => router.push('/noticias')}>{t('news')}</SectionTitle>
        <Card>{news.map((n, i) => <Row key={n.id} first={i === 0} title={n.title} sub={[n.source, n.country].filter(Boolean).join(' · ')} onPress={() => Linking.openURL(n.url)} />)}</Card>
      </> : null}

      {data.today.newDatasets.length ? <>
        <SectionTitle>{t('newData')}</SectionTitle>
        <Card>{data.today.newDatasets.slice(0, 5).map((d, i) => <Row key={d.file} first={i === 0} title={d.nameT?.[L] ?? dataName(d.name, d.file)} right={`${num(d.series, L, 0)} ${t('series')}`} />)}</Card>
      </> : null}
      {data.today.revisions ? <Note>{t('revisions', data.today.revisions)}</Note> : null}
      <View style={{ height: 8 }} />
      <Text style={{ fontSize: 12, color: C.textMuted }}>dehesaindex.com</Text>
    </Screen>
  );
}
