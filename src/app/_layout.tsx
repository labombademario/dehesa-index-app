import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../lib/store';
import { C } from '../lib/theme';

function RootStack() {
  const { t } = useApp();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.accent, headerTitleStyle: { color: C.text }, contentStyle: { backgroundColor: C.bg }, headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('tabToday') }} />
      <Stack.Screen name="bienvenida" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="serie/[id]" options={{ title: '' }} />
      <Stack.Screen name="seccion/[id]" options={{ title: '' }} />
      <Stack.Screen name="pais/[code]" options={{ title: t('tabCountries') }} />
      <Stack.Screen name="cesta" options={{ title: t('basket') }} />
      <Stack.Screen name="avisos" options={{ title: t('alerts') }} />
      <Stack.Screen name="explotacion" options={{ title: t('farm') }} />
      <Stack.Screen name="calendario" options={{ title: t('upcoming') }} />
      <Stack.Screen name="noticias" options={{ title: t('news') }} />
      <Stack.Screen name="ajustes" options={{ title: t('settings') }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <RootStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}
