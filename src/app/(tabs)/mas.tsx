import React from 'react';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, SectionTitle } from '../../components/ui';
import type { Section } from '../../lib/types';
import { GROUP_KEY, figureText } from '../../lib/sections';

export default function More() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const groups: Section['group'][] = ['production', 'trade', 'costs', 'data'];
  return (
    <Screen refresh title={t('tabMore')}>
      <Card><Row first title={t('settings')} sub={`${t('language')} · ${t('market')}`} right="›" onPress={() => router.push('/ajustes')} /></Card>
      {groups.map(g => {
        const items = data.sections.filter(x => x.group === g);
        if (!items.length) return null;
        return (
          <React.Fragment key={g}>
            <SectionTitle>{t(GROUP_KEY[g])}</SectionTitle>
            <Card>{g === 'data' ? <Row first title="PAC / CAP" sub={t('pacTitle')} right="›" onPress={() => router.push('/pac')} /> : null}{items.map((x, i) => <Row key={x.id} first={i === 0 && g !== 'data'} title={x.name[L]} sub={x.figure ? x.figure.label[L] : undefined} right={x.figure ? figureText(x, L) : '›'} onPress={() => router.push(`/seccion/${x.id}`)} />)}</Card>
          </React.Fragment>
        );
      })}
    </Screen>
  );
}
