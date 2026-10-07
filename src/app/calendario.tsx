import React from 'react';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle } from '../components/ui';
import { localTime } from '../lib/format';

export default function Calendario() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const ev = data.today.calendar.filter(e => Date.parse(e.at) > Date.now() - 3600e3).sort((a, b) => a.at.localeCompare(b.at));
  const days: { day: string; items: typeof ev }[] = [];
  ev.forEach(e => { const d = localTime(e.at, L).day; const last = days[days.length - 1]; if (last && last.day === d) last.items.push(e); else days.push({ day: d, items: [e] }); });
  return (
    <Screen refresh>
      <Stack.Screen options={{ title: t('calendar') }} />
      <Note>{t('calendarHint')}</Note>
      {days.length ? days.map(g => (
        <React.Fragment key={g.day}>
          <SectionTitle>{g.day}</SectionTitle>
          <Card>{g.items.map((e, i) => <Row key={e.id} first={i === 0} title={e.name} sub={e.agency} right={localTime(e.at, L).time} />)}</Card>
        </React.Fragment>
      )) : <Note>{t('noEvents')}</Note>}
    </Screen>
  );
}
