// Única puerta para abrir enlaces externos: solo https:// (ver safeUrl). Un enlace que no cumple no hace nada.
import { Linking } from 'react-native';
import { safeUrl } from './safe';

export function openSafe(u: unknown): void {
  const s = safeUrl(u);
  if (s) Linking.openURL(s).catch(() => { /* sin app que lo abra: no hacemos nada */ });
}
