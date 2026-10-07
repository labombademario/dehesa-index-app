import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, SectionTitle, Icon, Note } from '../../components/ui';
import { C, changeColor } from '../../lib/theme';
import { movers } from '../../lib/logic';
import { num, pct, date, localTime } from '../../lib/format';

export default function Today() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const mv = movers(data.prices, user.basket);
  const cal = data.today.calendar.filter(e => Date.parse(e.at) > Date.now() - 3600e3).slice(0, 3);
  const news = data.news.slice(0, 2);
  const now = new Date();
  const weekday = new Intl.DateTimeFormat({ es: 'es-ES', en: 'en-GB', fr: 'fr-FR', it: 'it-IT' }[L], { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return (
    <Screen refresh title={t('tabToday')} subtitle={weekday.charAt(0).toUpperCase() + weekday.slice(1)}
      right={<Pressable onPress={() => router.push('/ajustes')} accessibilityRole="button" accessibilityLabel={t('settings')} hitSlop={8}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" color={C.accent} size={22} /></Pressable>}>
      <SectionTitle>{t('todayMovers')}</SectionTitle>
      <Card>
        {mv.length ? mv.map((p, i) => (
          <Row key={p.id} first={i === 0} title={p.name[L]} sub={`${p.place[L]} · ${date(p.date, L)}`}
            right={`${num(p.value, L)} ${p.unit[L]}`} rightSub={pct(p.changePct, L)} rightColor={changeColor(p.changePct)}
            onPress={() => router.push(`/serie/${p.id}`)} />
        )) : <Row first title={t('emptyBasket')} onPress={() => router.push('/precios')} />}
      </Card>

      {cal.length ? <>
        <SectionTitle action={t('seeCalendar')} onAction={() => router.push('/calendario')}>{t('upcoming')}</SectionTitle>
        <Card>{cal.map((e, i) => { const lt = localTime(e.at, L); return <Row key={e.id} first={i === 0} title={e.name} sub={e.agency} right={lt.time} rightSub={lt.day} />; })}</Card>
      </> : null}

      {news.length ? <>
        <SectionTitle action={t('seeAll')} onAction={() => router.push('/noticias')}>{t('news')}</SectionTitle>
        <Card>{news.map((n, i) => <Row key={n.id} first={i === 0} title={n.title} sub={`${n.source} · ${n.country}`} onPress={() => Linking.openURL(n.url)} />)}</Card>
      </> : null}

      {data.today.newDatasets.length ? <>
        <SectionTitle>{t('newData')}</SectionTitle>
        <Card>{data.today.newDatasets.slice(0, 5).map((d, i) => <Row key={d.file} first={i === 0} title={d.name.replace(/^Update /, '')} right={`${num(d.series, L, 0)} ${t('series')}`} />)}</Card>
      </> : null}
      {data.today.revisions ? <Note>{t('revisions', data.today.revisions)}</Note> : null}
      <View style={{ height: 8 }} />
      <Text style={{ fontSize: 12, color: C.textMuted }}>dehesaindex.com</Text>
    </Screen>
  );
}
