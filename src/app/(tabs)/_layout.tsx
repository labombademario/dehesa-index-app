import React from 'react';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../lib/store';
import { C, ANDROID } from '../../lib/theme';
import { Icon } from '../../components/ui';

const ICONS = {
  index: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  precios: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  paises: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  mi: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
};

// Android (Material 3): la pestaña activa lleva una cápsula de color detrás del icono
function TabIcon({ d, focused, color }: { d: string; focused: boolean; color: string }) {
  if (!ANDROID) return <Icon d={d} color={color} />;
  return <View style={{ width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? C.accentSoft : 'transparent' }}><Icon d={d} color={color} /></View>;
}

export default function TabsLayout() {
  const { t, user, ready } = useApp();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, ANDROID ? 0 : 8);
  if (ready && !user.onboarded) return <Redirect href="/bienvenida" />;
  const icon = (k: keyof typeof ICONS) => ({ focused, color }: { focused: boolean; color: ColorValue }) => <TabIcon d={ICONS[k]} focused={focused} color={String(color)} />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: ANDROID ? '#10251A' : C.accent,
      tabBarInactiveTintColor: ANDROID ? C.textSoft : C.textMuted,
      tabBarStyle: { backgroundColor: ANDROID ? C.surfaceAlt : '#FBF9F3', borderTopColor: C.border, height: ANDROID ? 80 : 52 + bottom, paddingBottom: ANDROID ? undefined : bottom, paddingTop: ANDROID ? undefined : 6 },
      tabBarLabelStyle: { fontSize: ANDROID ? 12 : 10.5, fontWeight: '600' },
      sceneStyle: { backgroundColor: C.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: t('tabToday'), tabBarIcon: icon('index') }} />
      <Tabs.Screen name="precios" options={{ title: t('tabPrices'), tabBarIcon: icon('precios') }} />
      <Tabs.Screen name="paises" options={{ title: t('tabCountries'), tabBarIcon: icon('paises') }} />
      <Tabs.Screen name="mi" options={{ title: t('tabMine'), tabBarIcon: icon('mi') }} />
      <Tabs.Screen name="mas" options={{ title: t('tabMore'), tabBarIcon: icon('mas') }} />
    </Tabs>
  );
}
