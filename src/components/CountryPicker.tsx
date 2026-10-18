// Selector de país (norma del sitio): botón con la bandera y el nombre que abre una hoja con buscador y grupos
// Zona euro · Resto de Europa · América · Resto del mundo. Con pocas opciones (≤ 6) basta la fila de chips.
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/store';
import { C } from '../lib/theme';
import { s } from './ui';
import { Chips } from './Chips';
import { norm } from '../lib/logic';
import { groupCodes, GROUP_LABEL } from '../lib/countryGroups';
import { tx } from '../lib/tx';

export type CountryItem<T extends string> = { value: T; label: string; flag?: string; code?: string };

export function CountryPicker<T extends string>({ items, value, onChange, title }: { items: CountryItem<T>[]; value: T; onChange: (v: T) => void; title?: string }) {
  const { user } = useApp();
  const L = user.lang;
  const ins = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const cur = items.find(x => x.value === value);
  const shown = useMemo(() => { const k = norm(q.trim()); return k ? items.filter(x => norm(x.label + ' ' + (x.code ?? x.value)).includes(k)) : items; }, [q, items]);
  const groups = useMemo(() => groupCodes(shown, x => (x.code ?? x.value) as string), [shown]);
  const pick = (v: T) => { setOpen(false); setQ(''); if (v !== value) onChange(v); };
  const T0 = { es: 'Elegir país', en: 'Choose country', fr: 'Choisir un pays', it: 'Scegli paese' };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${title ?? tx(L, T0)}: ${cur?.label ?? ''}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, height: 40, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border }}>
        {cur?.flag ? <Text style={{ fontSize: 18 }} accessibilityElementsHidden importantForAccessibility="no">{cur.flag}</Text> : null}
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: C.text }}>{cur?.label ?? tx(L, T0)}</Text>
        <Text style={{ color: C.textMuted }} accessibilityElementsHidden importantForAccessibility="no">▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
            <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: C.text }} accessibilityRole="header">{title ?? tx(L, T0)}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={tx(L, { es: 'Cerrar', en: 'Close', fr: 'Fermer', it: 'Chiudi' })}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.accent }}>{tx(L, { es: 'Cerrar', en: 'Close', fr: 'Fermer', it: 'Chiudi' })}</Text>
            </Pressable>
          </View>
          <TextInput value={q} onChangeText={setQ} placeholder={tx(L, { es: 'Buscar país…', en: 'Search country…', fr: 'Rechercher un pays…', it: 'Cerca paese…' })} placeholderTextColor={C.textMuted}
            autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" onSubmitEditing={() => { const f = groups[0]?.items[0]; if (f) pick(f.value); }}
            style={[s.input, { marginHorizontal: 16, marginTop: 12, borderRadius: 24, paddingHorizontal: 16, backgroundColor: C.surfaceAlt, borderWidth: 0 }]} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 24 + ins.bottom, gap: 16 }}>
            {groups.length ? groups.map(g => (
              <View key={g.k} style={{ gap: 8 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.textMuted, letterSpacing: 0.3 }} accessibilityRole="header">{GROUP_LABEL[g.k][L]}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {g.items.map(x => {
                    const on = x.value === value;
                    return (
                      <Pressable key={x.value} onPress={() => pick(x.value)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={x.label}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 19, backgroundColor: on ? C.accent : C.surfaceAlt }}>
                        {x.flag ? <Text style={{ fontSize: 17 }} accessibilityElementsHidden importantForAccessibility="no">{x.flag}</Text> : null}
                        <Text style={{ fontSize: 14, fontWeight: '600', color: on ? C.accentInk : C.text }}>{x.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )) : <Text style={{ color: C.textMuted }}>{tx(L, { es: 'Sin resultados', en: 'No results', fr: 'Aucun résultat', it: 'Nessun risultato' })}</Text>}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/** Pocas opciones: fila de chips; muchas: selector con buscador y grupos. */
export function CountrySelect<T extends string>(p: { items: CountryItem<T>[]; value: T; onChange: (v: T) => void; title?: string }) {
  return p.items.length > 6 ? <CountryPicker {...p} /> : <Chips items={p.items} value={p.value} onChange={p.onChange} />;
}
