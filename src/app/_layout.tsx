import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getLocales } from 'expo-localization';
import { AppProvider, useApp } from '../lib/store';
import { C } from '../lib/theme';
import { installFonts, useBrandFonts } from '../lib/fonts';

installFonts();

/** Si una pantalla falla, se ve este aviso con «Reintentar» en lugar de cerrarse la app (expo-router lo usa como límite de errores de todas las rutas) */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const lang = (() => { try { return (getLocales()[0]?.languageCode ?? 'es'); } catch { return 'es'; } })();
  const es = lang === 'es';
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#FBF9F3' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#241F14', textAlign: 'center' }}>{es ? 'Algo ha fallado en esta pantalla' : 'Something went wrong on this screen'}</Text>
      <Text style={{ color: '#4A4535', textAlign: 'center' }}>{es ? 'Tus datos están a salvo. Reintenta o vuelve atrás.' : 'Your data is safe. Try again or go back.'}</Text>
      <Text style={{ color: '#6B6550', fontSize: 12, textAlign: 'center' }} numberOfLines={3}>{String(error?.message ?? '')}</Text>
      <Pressable onPress={() => { retry().catch(() => {}); }} accessibilityRole="button" style={{ backgroundColor: '#1E3328', borderRadius: 10, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: '#FBF9F3', fontWeight: '600' }}>{es ? 'Reintentar' : 'Retry'}</Text></Pressable>
    </View>
  );
}

// La pantalla de inicio se queda hasta que están cargadas las preferencias (evita ver un instante la bienvenida o Hoy sin datos)
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

function RootStack() {
  const { t, ready, mode } = useApp();
  const fontsOk = useBrandFonts();
  useEffect(() => { if (ready && fontsOk) SplashScreen.hideAsync().catch(() => {}); }, [ready, fontsOk]);
  // Al tocar una notificación de aviso, abrir ese precio
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = last?.notification.request.content.data?.url;
    if (last && last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER && typeof url === 'string' && url.startsWith('/serie/')) router.push(url as any);
  }, [last]);
  return (
    <>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    {/* key: al terminar de leer el perfil guardado (ready) las pantallas se montan de nuevo con el mercado y la cesta reales.
        Antes, una pantalla abierta durante la pantalla de carga se quedaba con el usuario por defecto (España). */}
    <Stack key={ready ? 'ready' : 'boot'} screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.accent, headerTitleStyle: { color: C.text }, contentStyle: { backgroundColor: C.bg }, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('tabToday') }} />
      <Stack.Screen name="bienvenida" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="serie/[id]" options={{ title: '' }} />
      <Stack.Screen name="resumen" options={{ title: '' }} />
      <Stack.Screen name="buscar" options={{ title: '' }} />
      <Stack.Screen name="pac" options={{ title: 'PAC' }} />
      <Stack.Screen name="frutas" options={{ title: t('fvTitle') }} />
      <Stack.Screen name="fruta/[id]" options={{ title: '' }} />
      <Stack.Screen name="siembra" options={{ title: t('swTitle') }} />
      <Stack.Screen name="sequia" options={{ title: '' }} />
      <Stack.Screen name="lluviauk" options={{ title: '' }} />
      <Stack.Screen name="granjasuk" options={{ title: '' }} />
      <Stack.Screen name="rentauk" options={{ title: '' }} />
      <Stack.Screen name="ganadouk" options={{ title: '' }} />
      <Stack.Screen name="entorno/index" options={{ title: '' }} />
      <Stack.Screen name="entorno/[cc]" options={{ title: '' }} />
      <Stack.Screen name="lonjas" options={{ title: '' }} />
      <Stack.Screen name="denominaciones" options={{ title: '' }} />
      <Stack.Screen name="vino" options={{ title: '' }} />
      <Stack.Screen name="madera" options={{ title: '' }} />
      <Stack.Screen name="localesus" options={{ title: '' }} />
      <Stack.Screen name="mayoristas" options={{ title: '' }} />
      <Stack.Screen name="glosario" options={{ title: '' }} />
      <Stack.Screen name="cambios" options={{ title: '' }} />
      <Stack.Screen name="empresas" options={{ title: '' }} />
      <Stack.Screen name="blog" options={{ title: '' }} />
      <Stack.Screen name="semana/index" options={{ title: '' }} />
      <Stack.Screen name="sec/[id]" options={{ title: '' }} />
      <Stack.Screen name="recan" options={{ title: '' }} />
      <Stack.Screen name="seccion/[id]" options={{ title: '' }} />
      <Stack.Screen name="pais/[code]" options={{ title: t('tabCountries') }} />
      <Stack.Screen name="explorar" options={{ title: '' }} />
      <Stack.Screen name="comparar" options={{ title: '' }} />
      <Stack.Screen name="region" options={{ title: '' }} />
      <Stack.Screen name="indicador" options={{ title: '' }} />
      <Stack.Screen name="cesta" options={{ title: t('basket') }} />
      <Stack.Screen name="avisos" options={{ title: t('alerts') }} />
      <Stack.Screen name="explotacion" options={{ title: t('farm') }} />
      <Stack.Screen name="calendario" options={{ title: t('upcoming') }} />
      <Stack.Screen name="noticias" options={{ title: t('news') }} />
      <Stack.Screen name="ajustes" options={{ title: t('settings') }} />
    </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}
