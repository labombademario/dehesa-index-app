import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../lib/store';
import { C } from '../lib/theme';
import { installFonts, useBrandFonts } from '../lib/fonts';

installFonts();

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
    <Stack screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.accent, headerTitleStyle: { color: C.text }, contentStyle: { backgroundColor: C.bg }, headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('tabToday') }} />
      <Stack.Screen name="bienvenida" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="serie/[id]" options={{ title: '' }} />
      <Stack.Screen name="resumen" options={{ title: '' }} />
      <Stack.Screen name="buscar" options={{ title: '' }} />
      <Stack.Screen name="pac" options={{ title: 'PAC' }} />
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
