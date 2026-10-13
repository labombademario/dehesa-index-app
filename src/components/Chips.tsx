// Fila de botones con bandera o texto para elegir país, mercado o tipo (desplazable en horizontal).
import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { C } from '../lib/theme';

export function Chips<T extends string>({ items, value, onChange }: { items: { value: T; label: string; flag?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {items.map(it => {
        const on = it.value === value;
        return (
          <Pressable key={it.value} onPress={() => onChange(it.value)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={it.label}
            style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? C.accent : C.surfaceAlt }}>
            {it.flag ? <Text style={{ fontSize: 17 }} accessibilityElementsHidden importantForAccessibility="no">{it.flag}</Text> : null}
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: on ? C.accentInk : C.text }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
