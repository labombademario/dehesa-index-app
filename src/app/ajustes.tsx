import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp, defaults, isEu, presetFor, resolvePreset } from '../lib/store';
import { webJson } from '../lib/fv';
import { PROFILES, Choice } from '../components/choice';
import { MarketPicker } from '../components/MarketPicker';
import { Screen, Card, Row, Button, Note, Segmented, SectionTitle, s } from '../components/ui';
import { C } from '../lib/theme';
import { LANGS, LANG_NAMES } from '../lib/i18n';
import { notificationsEnabled } from '../lib/notify';
import { tx } from '../lib/tx';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const VERSION: string = require('../../app.json').expo.version;
export default function Ajustes() {
  const { data, user, setUser, t } = useApp();
  const [notif, setNotif] = useState<boolean | null>(null);
  useEffect(() => { notificationsEnabled().then(setNotif); }, []);
  const sources = Object.entries(data.prices.reduce<Record<string, number>>((a, p) => { a[p.sourceName] = (a[p.sourceName] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
  // Al cambiar de mercado, la cesta puede seguir con los precios del anterior: se pregunta si se cambia por los del nuevo
  const changeMarket = (market: string) => {
    if (market === user.market) return;
    setUser({ market });
    Alert.alert(t('basketSwitch'), t('basketSwitchBody'), [
      { text: t('basketKeep'), style: 'cancel' },
      { text: t('basketReplace'), onPress: async () => {
        let prices = data.prices;
        if (isEu(market) && market !== 'ES') { try { const d = await webJson('data/app/v1/eu/' + market + '.json', 6 * 3600e3); if (d?.prices) prices = prices.concat(d.prices); } catch { /* sin red */ } }
        const ids = resolvePreset(prices, presetFor(market, user.profile));
        if (ids.length) setUser({ basket: ids });
      } },
    ]);
  };
  // Nombre de la fuente en el idioma de la app (los datos lo traen en español)
  const srcName = (n: string) => n.replace(/^Comisión Europea/, tx(user.lang, { es: 'Comisión Europea', en: 'European Commission', fr: 'Commission européenne', it: 'Commissione europea' })).replace(/^Banco Mundial/, tx(user.lang, { es: 'Banco Mundial', en: 'World Bank', fr: 'Banque mondiale', it: 'Banca Mondiale' })).replace(/\(Reino Unido\)/, tx(user.lang, { es: '(Reino Unido)', en: '(UK)', fr: '(Royaume-Uni)', it: '(Regno Unito)' }));
  const wipe = () => Alert.alert(t('wipe'), t('wipeConfirm'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('delete'), style: 'destructive', onPress: () => { setUser({ ...defaults(), lang: user.lang }); router.replace('/bienvenida'); } },
  ]);
  return (
    <Screen>
      <Stack.Screen options={{ title: t('settings') }} />
      <SectionTitle>{t('language')}</SectionTitle>
      <Card>{LANGS.map((l, i) => <View key={l} style={i > 0 ? s.rowDivider : undefined}><Choice label={LANG_NAMES[l]} on={user.lang === l} onPress={() => setUser({ lang: l })} /></View>)}</Card>
      <SectionTitle>{t('appearance')}</SectionTitle>
      <Segmented value={user.theme} onChange={theme => setUser({ theme })} options={[{ value: 'auto', label: t('themeAuto') }, { value: 'light', label: t('themeLight') }, { value: 'dark', label: t('themeDark') }]} />
      <SectionTitle>{t('profile')}</SectionTitle>
      <Card>{PROFILES.map((p, i) => <View key={p.v} style={i > 0 ? s.rowDivider : undefined}><Choice label={t(p.k)} on={user.profile === p.v} onPress={() => setUser({ profile: p.v })} /></View>)}</Card>
      <SectionTitle>{t('market')}</SectionTitle>
      <MarketPicker value={user.market} onChange={changeMarket} />
      <SectionTitle>{t('notifications')}</SectionTitle>
      <Card><Row first title={t('notifChannel')} sub={t('notifHow')} right={notif == null ? '' : notif ? t('notifOnShort') : t('notifOffShort')} onPress={() => Linking.openSettings()} /></Card>
      <Button kind="secondary" label={t('replayWelcome')} onPress={() => { setUser({ onboarded: false }); router.replace('/bienvenida'); }} />
      <SectionTitle>{t('sources')}</SectionTitle>
      <Note>{t('sourcesHint')}</Note>
      <Card>
        {sources.map(([name, count], i) => <Row key={name} first={i === 0} title={srcName(name)} right={t('pricesCount', count)} />)}
        <Row title={t('openWeb')} right="›" onPress={() => Linking.openURL('https://dehesaindex.com/metodologia.html')} />
      </Card>
      <Button kind="danger" label={t('wipe')} onPress={wipe} />
      <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center' }}>Dehesa Index · {t('appVersion', VERSION)}</Text>
    </Screen>
  );
}
