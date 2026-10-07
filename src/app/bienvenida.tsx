import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, PRESETS, resolvePreset, type Market, type Profile } from '../lib/store';
import { Card, Button, Note, Segmented, s } from '../components/ui';
import { C } from '../lib/theme';
import { LANGS, LANG_NAMES } from '../lib/i18n';
import { PROFILES, MARKETS, Choice } from '../components/choice';

export default function Bienvenida() {
  const { data, user, setUser, t } = useApp();
  const L = user.lang;
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(user.profile);
  const [market, setMarket] = useState<Market>(user.market);
  const preview = resolvePreset(data.prices, PRESETS[market][profile]);

  const finish = () => {
    setUser({ onboarded: true, profile, market, basket: preview });
    router.replace('/');
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={[s.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, justifyContent: 'center' }]}>
      {step > 0 ? <Text style={s.subtitle}>{t('stepOf', step, 2)}</Text> : null}
      {step === 0 ? <>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.accent }}>Dehesa Index</Text>
        <Text style={[s.title, { fontSize: 32 }]} accessibilityRole="header">{t('welcomeTitle')}</Text>
        <Text style={{ fontSize: 16, color: C.textSoft, lineHeight: 23 }}>{t('welcomeText')}</Text>
        <Segmented value={L} onChange={lang => setUser({ lang })} options={LANGS.map(l => ({ value: l, label: LANG_NAMES[l].slice(0, 3) }))} />
        <Button label={t('start')} onPress={() => setStep(1)} style={{ flex: 0 }} />
        <Note>{t('noAccount')}</Note>
      </> : null}

      {step === 1 ? <>
        <Text style={s.title} accessibilityRole="header">{t('whatDoYouDo')}</Text>
        <Card>{PROFILES.map((p, i) => <View key={p.v} style={i > 0 ? s.rowDivider : undefined}><Choice label={t(p.k)} on={profile === p.v} onPress={() => setProfile(p.v)} /></View>)}</Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button kind="secondary" label={t('back')} onPress={() => setStep(0)} />
          <Button label={t('continue')} onPress={() => setStep(2)} />
        </View>
      </> : null}

      {step === 2 ? <>
        <Text style={s.title} accessibilityRole="header">{t('whereSell')}</Text>
        <Segmented value={market} onChange={setMarket} options={MARKETS.map(m => ({ value: m.v, label: t(m.k) }))} />
        <Text style={s.label}>{t('basketStarts')}</Text>
        <Card>{preview.map((id, i) => { const p = data.prices.find(x => x.id === id)!; return (
          <View key={id} style={[s.row, i > 0 && s.rowDivider]}><View style={{ flex: 1 }}><Text style={s.rowTitle}>{p.name[L]}</Text><Text style={s.rowSub}>{p.place[L]}</Text></View></View>); })}
        </Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button kind="secondary" label={t('back')} onPress={() => setStep(1)} />
          <Button label={t('enter')} onPress={finish} />
        </View>
      </> : null}
    </ScrollView>
  );
}
