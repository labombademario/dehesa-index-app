// Franja macro de la ficha de país (22-oct-2026), igual que en la web: PIB, PIB por habitante, población, paro, sector primario,
// consumo de los hogares (% del PIB), inflación, deuda y tipo de interés oficial. Lee data/country-macro.json e interest-rates-stats.json de la web.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { webJson } from '../lib/fv';
import { Card, SectionTitle, Note } from './ui';
import { C } from '../lib/theme';
import { num } from '../lib/format';
import { tx } from '../lib/tx';
import type { Lang } from '../lib/types';

type M = { v: number; y: number; m?: string; cur?: string; src?: string; kind?: string };
const EURO = new Set(['AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK']);
const SYM: Record<string, string> = { EUR: '€', USD: '$', CAD: 'C$', AUD: 'A$', GBP: '£' };

export function MacroCard({ cc, lang }: { cc: string; lang: Lang }) {
  const [m, setM] = useState<Record<string, M> | null>(null);
  const [rate, setRate] = useState<{ v: number; p: string; ecb: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    webJson('data/country-macro.json', 12 * 3600e3).then(d => { if (alive) setM(d?.countries?.[cc] ?? null); });
    webJson('data/interest-rates-stats.json', 12 * 3600e3).then(d => {
      const own = (d?.countries?.[cc]?.series ?? []).find((x: any) => /-policy-rate$/.test(x.id));
      // zona euro: el tipo oficial es el del BCE (operaciones principales de financiación)
      const s = own ?? (EURO.has(cc) ? (d?.countries?.EU?.series ?? []).find((x: any) => x.id === 'eu-policy-rate') : null);
      if (alive) setRate(s ? { v: s.latest, p: s.latestPeriod, ecb: !own } : null);
    });
    return () => { alive = false; };
  }, [cc]);
  if (!m) return null;
  const T = (es: string, en: string, fr: string, it: string) => tx(lang, { es, en, fr, it });
  const money = (v: number, cur: string, big: boolean) => {
    const s = SYM[cur] ?? cur + ' ';
    if (!big) return s + num(v, lang, 0);
    return v >= 1e12 ? s + num(v / 1e12, lang, 2) + ' ' + T('bill.', 'tn', 'Bn', 'mila mld') : s + num(v / 1e9, lang, 0) + ' ' + T('mil M', 'bn', 'Md', 'mld');
  };
  const items: { k: string; label: string; val: string; y: string }[] = [];
  const add = (k: string, label: string, val: string, o?: M) => items.push({ k, label, val, y: o ? String(o.m ?? o.y) : '' });
  const G = (m as any).gdpLc ?? m.gdp, GP = (m as any).gdppcLc ?? m.gdppc;
  if (G) add('gdp', T('PIB', 'GDP', 'PIB', 'PIL'), money(G.v, G.cur ?? 'USD', true), G);
  if (GP) add('gdppc', T('PIB por habitante', 'GDP per capita', 'PIB par habitant', 'PIL pro capite'), money(GP.v, GP.cur ?? 'USD', false), GP);
  if (m.pop) add('pop', T('Población', 'Population', 'Population', 'Popolazione'), num(m.pop.v / 1e6, lang, m.pop.v >= 1e8 ? 0 : 1) + ' M', m.pop);
  if (m.unemp) add('unemp', T('Paro', 'Unemployment', 'Chômage', 'Disoccupazione'), num(m.unemp.v, lang, 1) + ' %', m.unemp);
  if (m.agri) add('agri', T('Sector primario (% del PIB)', 'Primary sector (% of GDP)', 'Secteur primaire (% du PIB)', 'Settore primario (% del PIL)'), num(m.agri.v, lang, 1) + ' %', m.agri);
  if (m.cons) add('cons', T('Consumo de los hogares (% del PIB)', 'Household consumption (% of GDP)', 'Consommation des ménages (% du PIB)', 'Consumi delle famiglie (% del PIL)'), num(m.cons.v, lang, 1) + ' %', m.cons);
  if (m.infl) add('infl', T('Inflación (interanual)', 'Inflation (year on year)', 'Inflation (sur un an)', 'Inflazione (su base annua)'), (m.infl.v > 0 ? '+' : '') + num(m.infl.v, lang, 1) + ' %', m.infl);
  if (m.debt) add('debt', T('Deuda pública / PIB', 'Public debt / GDP', 'Dette publique / PIB', 'Debito pubblico / PIL'), num(m.debt.v, lang, 0) + ' %' + (m.debt.src === 'wb-central' ? ' ' + T('(gobierno central)', '(central government)', '(administration centrale)', '(amministrazione centrale)') : ''), m.debt);
  if (rate) items.push({ k: 'rate', label: T('Tipo de interés oficial', 'Policy interest rate', 'Taux directeur', 'Tasso ufficiale') + (rate.ecb ? T(' (BCE)', ' (ECB)', ' (BCE)', ' (BCE)') : ''), val: num(rate.v, lang, 2) + ' %', y: rate.p });
  if (!items.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionTitle>{T('Economía', 'Economy', 'Économie', 'Economia')}</SectionTitle>
      <Card style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 18 }}>
        {items.map(it => (
          <View key={it.k} style={{ minWidth: 130, flexGrow: 1, flexBasis: '42%' }} accessible accessibilityLabel={`${it.label}: ${it.val} (${it.y})`}>
            <Text style={{ fontSize: 12, color: C.textMuted }}>{it.label}</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] }}>{it.val} <Text style={{ fontSize: 12, fontWeight: '400', color: C.textMuted }}>({it.y})</Text></Text>
          </View>
        ))}
      </Card>
      <Note>{T('Banco Mundial (WDI) y fuentes oficiales de cada país; el año o mes del dato va entre paréntesis.', 'World Bank (WDI) and each country’s official sources; the year or month of each figure is in brackets.', 'Banque mondiale (WDI) et sources officielles de chaque pays ; l’année ou le mois de la donnée est entre parenthèses.', 'Banca Mondiale (WDI) e fonti ufficiali di ogni paese; l’anno o il mese del dato è tra parentesi.')}</Note>
    </View>
  );
}

// Edad de los titulares de explotación de Inglaterra (Defra): solo para la ficha del Reino Unido.
const BANDS: [string, Record<Lang, string>][] = [['u35', { es: 'Menos de 35', en: 'Under 35', fr: 'Moins de 35', it: 'Meno di 35' }], ['a35', { es: '35 a 44', en: '35 to 44', fr: '35 à 44', it: '35-44' }], ['a45', { es: '45 a 54', en: '45 to 54', fr: '45 à 54', it: '45-54' }],
  ['a55', { es: '55 a 64', en: '55 to 64', fr: '55 à 64', it: '55-64' }], ['o65', { es: '65 o más', en: '65 or over', fr: '65 ou plus', it: '65 o più' }]];
export function UkFarmersAge({ lang }: { lang: Lang }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { webJson('data/uk-farmers-age.json', 24 * 3600e3).then(setD); }, []);
  if (!d?.years?.length || !d.all?.o65) return null;
  const T = (es: string, en: string, fr: string, it: string) => tx(lang, { es, en, fr, it });
  const n = d.years.length - 1, y = d.years[n], mx = Math.max(...BANDS.map(b => d.all[b[0]][n] ?? 0)) || 1;
  return (
    <View style={{ gap: 10 }}>
      <SectionTitle>{T('Edad de los titulares · Inglaterra', 'Age of farm holders · England', 'Âge des exploitants · Angleterre', 'Età dei titolari · Inghilterra')}</SectionTitle>
      <Card style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 15, color: C.text }}>{T(`En ${y}, el ${num(d.all.o65[n], lang, 1)} % de los titulares tenía 65 años o más (edad mediana: ${d.medianAge?.all?.[n] ?? '—'} años).`,
          `In ${y}, ${num(d.all.o65[n], lang, 1)}% of holders were 65 or over (median age: ${d.medianAge?.all?.[n] ?? '—'}).`,
          `En ${y}, ${num(d.all.o65[n], lang, 1)} % des exploitants avaient 65 ans ou plus (âge médian : ${d.medianAge?.all?.[n] ?? '—'} ans).`,
          `Nel ${y}, il ${num(d.all.o65[n], lang, 1)}% dei titolari aveva 65 anni o più (età mediana: ${d.medianAge?.all?.[n] ?? '—'} anni).`)}</Text>
        {BANDS.map(b => { const v = d.all[b[0]][n]; return (
          <View key={b[0]} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible accessibilityLabel={`${b[1][lang]}: ${num(v, lang, 1)} %`}>
            <Text style={{ width: 92, fontSize: 13, color: C.textMuted }}>{b[1][lang]}</Text>
            <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: C.surfaceAlt, overflow: 'hidden' }}><View style={{ width: `${(v / mx) * 100}%`, height: 10, backgroundColor: C.accent }} /></View>
            <Text style={{ width: 56, textAlign: 'right', fontSize: 13, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>{num(v, lang, 1)} %</Text>
          </View>); })}
      </Card>
      <Note>{T('Solo Inglaterra: el Reino Unido en conjunto no publica este dato. Porcentajes de titulares tal como los publica Defra; 2021 no es del todo comparable. Fuente: Defra (OGL v3.0).', 'England only: the UK as a whole does not publish this figure. Shares of holders as published by Defra; 2021 is not fully comparable. Source: Defra (OGL v3.0).', 'Angleterre uniquement : le Royaume-Uni ne publie pas ce chiffre dans son ensemble. Parts publiées par Defra ; 2021 n’est pas tout à fait comparable. Source : Defra (OGL v3.0).', 'Solo Inghilterra: il Regno Unito nel suo insieme non pubblica questo dato. Quote come pubblicate da Defra; il 2021 non è del tutto confrontabile. Fonte: Defra (OGL v3.0).')}</Note>
    </View>
  );
}
