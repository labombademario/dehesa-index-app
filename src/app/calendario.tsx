import React from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle } from '../components/ui';
import { localTime } from '../lib/format';
import { addToPhoneCalendar, openGoogle } from '../lib/addToCalendar';
import { tx } from '../lib/tx';
import type { CalendarEvent } from '../lib/types';

export default function Calendario() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const ev = data.today.calendar.filter(e => Date.parse(e.at) > Date.now() - 3600e3).sort((a, b) => a.at.localeCompare(b.at));
  const N = (e: CalendarEvent) => tx(L, { es: 'Publicación oficial de ' + e.agency + '. Datos y contexto en Dehesa Index: https://dehesaindex.com/calendario', en: 'Official release from ' + e.agency + '. Data and context on Dehesa Index: https://dehesaindex.com/calendario', fr: 'Publication officielle de ' + e.agency + '. Données et contexte sur Dehesa Index : https://dehesaindex.com/calendario', it: 'Pubblicazione ufficiale di ' + e.agency + '. Dati e contesto su Dehesa Index: https://dehesaindex.com/calendario' });
  const add = (e: CalendarEvent) => {
    const lt = localTime(e.at, L);
    Alert.alert(e.name, `${lt.day} · ${lt.time}`, [
      { text: tx(L, { es: '📅 Añadir a mi calendario', en: '📅 Add to my calendar', fr: '📅 Ajouter à mon agenda', it: '📅 Aggiungi al calendario' }), onPress: async () => {
        const r = await addToPhoneCalendar(e, N(e));
        if (r === 'denied') Alert.alert(tx(L, { es: 'Sin permiso para el calendario', en: 'No calendar permission', fr: 'Pas d’accès à l’agenda', it: 'Nessun permesso per il calendario' }), tx(L, { es: 'Puedes darlo en Ajustes del teléfono, o usar Google Calendar.', en: 'You can allow it in the phone Settings, or use Google Calendar.', fr: 'Vous pouvez l’autoriser dans les Réglages, ou utiliser Google Agenda.', it: 'Puoi concederlo nelle Impostazioni, o usare Google Calendar.' }));
        else if (r === 'unavailable') openGoogle(e, N(e));
      } },
      { text: tx(L, { es: 'Google Calendar', en: 'Google Calendar', fr: 'Google Agenda', it: 'Google Calendar' }), onPress: () => openGoogle(e, N(e)) },
      { text: tx(L, { es: 'Cancelar', en: 'Cancel', fr: 'Annuler', it: 'Annulla' }), style: 'cancel' },
    ]);
  };
  const days: { day: string; items: typeof ev }[] = [];
  ev.forEach(e => { const d = localTime(e.at, L).day; const last = days[days.length - 1]; if (last && last.day === d) last.items.push(e); else days.push({ day: d, items: [e] }); });
  return (
    <Screen refresh>
      <Stack.Screen options={{ title: t('calendar') }} />
      <Note>{t('calendarHint')}</Note>
      {days.length ? days.map(g => (
        <React.Fragment key={g.day}>
          <SectionTitle>{g.day}</SectionTitle>
          <Card>{g.items.map((e, i) => <Row key={e.id} first={i === 0} title={e.name} sub={e.agency + ' · ' + tx(L, { es: 'toca para añadir a tu calendario', en: 'tap to add to your calendar', fr: 'touchez pour l’ajouter à votre agenda', it: 'tocca per aggiungerlo al calendario' })} right={'📅 ' + localTime(e.at, L).time} onPress={() => add(e)} accessibilityLabel={e.name + ', ' + localTime(e.at, L).time} />)}</Card>
        </React.Fragment>
      )) : <Note>{t('noEvents')}</Note>}
    </Screen>
  );
}
