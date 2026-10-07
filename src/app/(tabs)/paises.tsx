import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Note, s } from '../../components/ui';
import { C } from '../../lib/theme';

export default function Countries() {
  const { data, user, t } = useApp();
  const L = user.lang;
  return (
    <Screen refresh title={t('tabCountries')}>
      <Note>{t('coverageHint')}</Note>
      <Card>
        {data.countries.map((c, i) => (
          <Pressable key={c.code} onPress={() => router.push(`/pais/${c.code}`)} accessibilityRole="button" android_ripple={{ color: C.surfaceAlt }}
            accessibilityLabel={`${c.name[L]}, ${c.coveragePct ?? '—'} %`} style={[{ paddingHorizontal: 14, paddingVertical: 11 }, i > 0 && s.rowDivider]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.rowTitle}>{c.name[L]}</Text>
              <Text style={s.rowRight}>{c.coveragePct == null ? '—' : `${c.coveragePct} %`}</Text>
            </View>
            <View style={{ height: 5, backgroundColor: C.surfaceAlt, borderRadius: 3, marginTop: 6 }}>
              <View style={{ height: 5, width: `${c.coveragePct ?? 0}%`, backgroundColor: C.accent, borderRadius: 3 }} />
            </View>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
