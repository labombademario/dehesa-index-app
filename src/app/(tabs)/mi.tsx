import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Note, Icon, s } from '../../components/ui';
import { C, R } from '../../lib/theme';

export default function Mine() {
  const { user, t } = useApp();
  const items = [
    { k: 'cesta', name: t('basket'), hint: t('basketHint', user.basket.length), icon: 'M3 7h18l-2 12H5zM8 7l4-4 4 4', go: () => router.push('/cesta') },
    { k: 'avisos', name: t('alerts'), hint: t('alertsHint', user.alerts.filter(a => a.on).length), icon: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4', go: () => router.push('/avisos') },
    { k: 'granja', name: t('farm'), hint: t('farmHint'), icon: 'M3 21V10l9-6 9 6v11M9 21v-6h6v6', go: () => router.push('/explotacion') },
    { k: 'local', name: t('myMarket'), hint: t('myMarketHint'), icon: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z', go: () => Linking.openURL('https://dehesaindex.com/mi-mercado.html') },
  ];
  return (
    <Screen refresh title={t('tabMine')}>
      <Note>{t('mineHint')}</Note>
      {items.map(h => (
        <Pressable key={h.k} onPress={h.go} accessibilityRole="button" android_ripple={{ color: C.surfaceAlt }}
          style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Icon d={h.icon} color={C.accent} size={22} /></View>
          <View style={{ flex: 1 }}><Text style={[s.rowTitle, { fontSize: 16 }]}>{h.name}</Text><Text style={s.rowSub}>{h.hint}</Text></View>
        </Pressable>
      ))}
    </Screen>
  );
}
