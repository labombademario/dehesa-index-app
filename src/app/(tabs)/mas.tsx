import React, { useEffect, useState } from 'react';
import { webJson } from '../../lib/fv';
import { router } from 'expo-router';
import { useApp } from '../../lib/store';
import { Screen, Card, Row, SectionTitle } from '../../components/ui';
import type { Section } from '../../lib/types';
import { GROUP_KEY, figureText, secFor } from '../../lib/sections';
import { tx } from '../../lib/tx';

export default function More() {
  const { data, user, t } = useApp();
  const L = user.lang;
  const groups: Section['group'][] = ['production', 'trade', 'costs', 'data'];
  // secciones de la web que ya se ven dentro de la app (data/app/v1/sec/index.json)
  const [secs, setSecs] = useState<{ id: string; title: Record<string, string>; emoji: string }[]>([]);
  useEffect(() => { webJson('data/app/v1/sec/index.json', 6 * 3600e3).then((d: any) => { if (d?.sections) setSecs(Object.keys(d.sections).map(k => ({ id: k, ...d.sections[k] }))); }); }, []);
  return (
    <Screen refresh title={t('tabMore')}>
      <Card><Row first title={t('settings')} sub={`${t('language')} · ${t('market')}`} right="›" onPress={() => router.push('/ajustes')} /></Card>
      <Card>
        <Row first title={'🍅 ' + t('fvTitle')} sub={t('fvSub', 52)} right="›" onPress={() => router.push('/frutas')} />
        <Row title={'🌱 ' + t('swTitle')} sub={t('swSub')} right="›" onPress={() => router.push('/siembra')} />
        <Row title={'💧 ' + t('sqTitle')} sub={t('sqSub')} right="›" onPress={() => router.push('/sequia')} />
        <Row title={'⛽ ' + t('envTitle')} sub={t('envSub')} right="›" onPress={() => router.push('/entorno')} />
      </Card>
      <Card>
        <Row first title={'📰 ' + tx(L, { es: 'La semana en cada país', en: 'The week in each country', fr: 'La semaine dans chaque pays', it: 'La settimana in ogni paese' })} sub={tx(L, { es: 'Qué datos llegaron, qué precios se movieron y titulares', en: 'Data that came in, biggest price moves and headlines', fr: 'Données arrivées, prix qui ont bougé et titres', it: 'Dati arrivati, prezzi che si sono mossi e titoli' })} right="›" onPress={() => router.push('/semana')} />
        <Row title={'🏛️ ' + tx(L, { es: 'Lonjas y mercados locales', en: 'Local markets', fr: 'Marchés locaux', it: 'Piazze e mercati locali' })} sub={tx(L, { es: 'Cereales, aceite y oleaginosas por provincia', en: 'Cereals, olive oil and oilseeds by province', fr: 'Céréales, huile d’olive et oléagineux par province', it: 'Cereali, olio e semi oleosi per provincia' })} right="›" onPress={() => router.push('/lonjas')} />
        <Row title={'🏷️ ' + tx(L, { es: 'Denominaciones de origen', en: 'Designations of origin', fr: 'Appellations d’origine', it: 'Denominazioni di origine' })} sub={tx(L, { es: 'Vinos y quesos protegidos en la UE', en: 'Wines and cheeses protected in the EU', fr: 'Vins et fromages protégés dans l’UE', it: 'Vini e formaggi protetti nell’UE' })} right="›" onPress={() => router.push('/denominaciones')} />
        <Row title={'🍷 ' + tx(L, { es: 'Vino a granel', en: 'Bulk wine', fr: 'Vin en vrac', it: 'Vino sfuso' })} sub={tx(L, { es: 'España (semanal) y Francia (mensual)', en: 'Spain (weekly) and France (monthly)', fr: 'Espagne (hebdomadaire) et France (mensuel)', it: 'Spagna (settimanale) e Francia (mensile)' })} right="›" onPress={() => router.push('/vino')} />
        <Row title={'💶 ' + tx(L, { es: 'Costes y rentas de las explotaciones', en: 'Farm costs and income', fr: 'Coûts et revenus des exploitations', it: 'Costi e redditi delle aziende' })} sub={tx(L, { es: 'España, por comunidad, tipo y tamaño (RECAN)', en: 'Spain, by region, type and size (RECAN)', fr: 'Espagne, par région, type et taille (RECAN)', it: 'Spagna, per regione, tipo e dimensione (RECAN)' })} right="›" onPress={() => router.push('/recan')} />
        <Row title={'🌽 ' + tx(L, { es: 'Precios locales en EE. UU.', en: 'US local grain prices', fr: 'Prix locaux des grains aux É.-U.', it: 'Prezzi locali dei cereali negli USA' })} sub={tx(L, { es: 'Maíz, soja y trigo por estado (USDA)', en: 'Corn, soybeans and wheat by state (USDA)', fr: 'Maïs, soja et blé par État (USDA)', it: 'Mais, soia e frumento per stato (USDA)' })} right="›" onPress={() => router.push('/localesus')} />
        <Row title={'🌲 ' + tx(L, { es: 'Madera', en: 'Timber', fr: 'Bois', it: 'Legname' })} sub={tx(L, { es: 'Precio en Alemania y cortas por país', en: 'German prices and removals by country', fr: 'Prix en Allemagne et récolte par pays', it: 'Prezzi in Germania e tagli per paese' })} right="›" onPress={() => router.push('/madera')} />
      </Card>
      {secs.length ? <>
        <SectionTitle>{tx(L, { es: 'Más datos', en: 'More data', fr: 'Plus de données', it: 'Altri dati' })}</SectionTitle>
        <Card>{secs.map((x, i) => <Row key={x.id} first={i === 0} title={(x.emoji ? x.emoji + ' ' : '') + (x.title[L] ?? x.title.es)} right="›" onPress={() => router.push({ pathname: '/sec/[id]', params: { id: x.id } })} />)}</Card>
      </> : null}
      {groups.map(g => {
        const items = data.sections.filter(x => x.group === g);
        if (!items.length) return null;
        return (
          <React.Fragment key={g}>
            <SectionTitle>{t(GROUP_KEY[g])}</SectionTitle>
            <Card>{g === 'data' ? <Row first title={tx(user.lang, { es: 'PAC', en: 'CAP', fr: 'PAC', it: 'PAC' })} sub={t('pacTitle')} right="›" onPress={() => router.push('/pac')} /> : null}{items.map((x, i) => <Row key={x.id} first={i === 0 && g !== 'data'} title={x.name[L]} sub={x.figure ? x.figure.label[L] : undefined} right={x.figure ? figureText(x, L) : '›'} onPress={() => (x.id === 'recan' ? router.push('/recan') : secFor(x.id, user.market) ? router.push({ pathname: '/sec/[id]', params: { id: secFor(x.id, user.market)! } }) : router.push(`/seccion/${x.id}`))} />)}</Card>
          </React.Fragment>
        );
      })}
    </Screen>
  );
}
