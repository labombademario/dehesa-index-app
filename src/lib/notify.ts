// Avisos de precio con la app cerrada. Sin servidor: el teléfono comprueba los precios en segundo plano
// (expo-background-task: iOS y Android deciden la hora exacta) y lanza una notificación local cuando un aviso se cumple.
// Este módulo se importa en index.js, antes que las pantallas, para que la tarea exista también cuando el sistema
// despierta la app sin abrirla.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { bundled, cached, refresh } from './api';
import { newlyHit, type AlertRule } from './logic';
import { translate } from './i18n';
import { num } from './format';
import type { AppData, Lang } from './types';

export const TASK = 'dehesa-alerts-check';
export const USER_KEY = 'dehesa:user:v1';
const HIT_KEY = 'dehesa:alerts-hit:v1';
const CHANNEL = 'alertas';
const INTERVAL_MIN = 240; // cada 4 h como mínimo; los precios se publican a diario o cada semana

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function readHit(): Promise<string[]> {
  try { const raw = await AsyncStorage.getItem(HIT_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function writeHit(ids: string[]) {
  try { await AsyncStorage.setItem(HIT_KEY, JSON.stringify(ids)); } catch { /* nada */ }
}

/** Al crear un aviso que ya se cumple: se marca como visto para no notificar algo que el usuario está viendo. */
export async function markSeen(ruleId: string) {
  const h = await readHit();
  if (!h.includes(ruleId)) await writeHit([...h, ruleId]);
}

async function granted(): Promise<boolean> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch { return false; }
}

async function ensureChannel(lang: Lang) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: translate(lang, 'notifChannel'), importance: Notifications.AndroidImportance.HIGH });
}

/** Pide permiso (solo cuando el usuario crea su primer aviso). Devuelve si las notificaciones quedan activadas. */
export async function ensurePermission(lang: Lang): Promise<boolean> {
  try {
    await ensureChannel(lang);
    if (await granted()) return true;
    const r = await Notifications.requestPermissionsAsync();
    return r.granted;
  } catch { return false; }
}

export async function notificationsEnabled(): Promise<boolean> { return granted(); }

/** Compara los avisos con los precios y notifica los recién cumplidos. Devuelve cuántos ha notificado. */
export async function runCheck(data: AppData, rules: AlertRule[], lang: Lang): Promise<number> {
  const { fire, hit } = newlyHit(rules, data.prices, await readHit());
  await writeHit(hit);
  if (!fire.length || !(await granted())) return 0;
  await ensureChannel(lang);
  for (const { rule, price } of fire) {
    const u = price.unit[lang];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${price.name[lang]} · ${price.place[lang]}`,
        body: translate(lang, 'notifBody', `${num(price.value, lang)} ${u}`, translate(lang, rule.cond === 'ge' ? 'goesUp' : 'goesDown'), `${num(rule.value, lang)} ${u}`),
        data: { url: `/serie/${price.id}` },
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
  }
  return fire.length;
}

/** Lo que hace el sistema al despertar la app: datos nuevos (o los guardados si no hay red) y comprobación. */
async function backgroundCheck() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return;
  const user = JSON.parse(raw) as { lang?: Lang; alerts?: AlertRule[] };
  const rules = (user.alerts ?? []).filter(a => a.on);
  if (!rules.length) return;
  let data: AppData;
  try { data = await refresh(); } catch { data = (await cached()) ?? bundled(); }
  await runCheck(data, rules, user.lang ?? 'es');
}

TaskManager.defineTask(TASK, async () => {
  try { await backgroundCheck(); return BackgroundTask.BackgroundTaskResult.Success; }
  catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});

/** Registra la tarea si hay avisos activos y la quita si no hay ninguno (no gastar batería sin motivo). */
export async function syncBackgroundTask(active: boolean) {
  try {
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
    const reg = await TaskManager.isTaskRegisteredAsync(TASK);
    if (active && !reg) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: INTERVAL_MIN });
    if (!active && reg) await BackgroundTask.unregisterTaskAsync(TASK);
  } catch { /* p. ej. Expo Go: sin tareas en segundo plano */ }
}
