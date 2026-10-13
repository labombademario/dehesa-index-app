// Fila de botones con bandera o texto para elegir país, mercado o tipo (desplazable en horizontal; el elegido siempre queda a la vista).
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { C } from '../lib/theme';

export function Chips<T extends string>({ items, value, onChange }: { items: { value: T; label: string; flag?: string }[]; value: T; onChange: (v: T) => void }) {
  const ref = useRef<ScrollView>(null);
  const xs = useRef<Record<string, number>>({});
  const done = useRef<string | null>(null);
  const show = () => { const x = xs.current[value]; if (x != null && done.current !== value) { done.current = value; ref.current?.scrollTo({ x: Math.max(0, x - 16), animated: false }); } };
  useEffect(show, [value]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {items.map(it => {
        const on = it.value === value;
        return (
          <Pressable key={it.value} onPress={() => onChange(it.value)} onLayout={e => { xs.current[it.value] = e.nativeEvent.layout.x; if (on) show(); }}
            accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={it.label}
            style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? C.accent : C.surfaceAlt }}>
            {it.flag ? <Text style={{ fontSize: 17 }} accessibilityElementsHidden importantForAccessibility="no">{it.flag}</Text> : null}
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: on ? C.accentInk : C.text }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
