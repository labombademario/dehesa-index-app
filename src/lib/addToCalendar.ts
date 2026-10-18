// Añadir una publicación oficial al calendario del teléfono (formulario del sistema, solo permiso de escritura) o a Google Calendar.
// La hora viene en UTC (data/app/v1/today.json → calendar[].at); el calendario la muestra en la hora local del teléfono.
import { Linking, Platform } from 'react-native';
import type { CalendarEvent } from './types';

const pad = (n: number) => (n < 10 ? '0' : '') + n;
const stamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

export function googleCalendarUrl(e: CalendarEvent, notes: string): string {
  const a = new Date(e.at), b = new Date(a.getTime() + 3600e3);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(`${e.name} (${e.agency})`) + '&dates=' + stamp(a) + '/' + stamp(b) + '&details=' + encodeURIComponent(notes);
}

/** Abre el formulario de evento del sistema ya relleno. Devuelve 'saved' | 'canceled' | 'denied' | 'unavailable'. */
export async function addToPhoneCalendar(e: CalendarEvent, notes: string): Promise<string> {
  if (Platform.OS === 'android') return 'unavailable';   // Android: sin permisos de calendario (Google Play los revisa); el llamador abre Google Calendar con el evento relleno
  try {
    const Cal = await import('expo-calendar');
    const p = await Cal.requestCalendarPermissions(true);
    if (!p.granted) return 'denied';
    const start = new Date(e.at), end = new Date(start.getTime() + 3600e3);
    const opts = { title: `${e.name} (${e.agency})`, startDate: start, endDate: end, allDay: false, notes, url: 'https://dehesaindex.com/calendario', alarms: [{ relativeOffset: -30 }] };
    if (Platform.OS === 'ios') { const r = await Cal.getDefaultCalendarSync().addEventWithForm(opts); return r?.action ?? 'canceled'; }
    const cals = await Cal.getCalendars();
    const w = cals.find((c: any) => c.isPrimary && c.allowsModifications) ?? cals.find((c: any) => c.allowsModifications);
    if (!w) return 'unavailable';
    const r = await (w as any).addEventWithForm(opts); return r?.action ?? 'canceled';
  } catch { return 'unavailable'; }
}
export function openGoogle(e: CalendarEvent, notes: string) { Linking.openURL(googleCalendarUrl(e, notes)).catch(() => {}); }
