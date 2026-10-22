// Costes y renta de las granjas de Inglaterra (22-oct-2026), como la pestaña «Reino Unido» de costes.html: producción, costes y renta media
// por tipo de granja y en qué se va el dinero. Lee data/uk-farm-accounts.json (Defra, Farm Business Survey, OGL v3.0). Libras por explotación.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note, SectionTitle } from '../components/ui';
import { C, changeColor } from '../lib/theme';
import { num, pct } from '../lib/format';
import { tx } from '../lib/tx';
import { webJson } from '../lib/fv';
import type { Lang } from '../lib/types';

type L4 = [string, string, string, string];
const LI: Record<Lang, number> = { es: 0, en: 1, fr: 2, it: 3 };
const TYPES: Record<string, L4> = { 'All Types': ['Todas las granjas', 'All farms', 'Toutes', 'Tutte'], Cereals: ['🌾 Cereales', '🌾 Cereals', '🌾 Céréales', '🌾 Cereali'], 'General cropping': ['🥔 Cultivos generales', '🥔 General cropping', '🥔 Grandes cultures', '🥔 Seminativi'],
  Horticulture: ['🥬 Horticultura', '🥬 Horticulture', '🥬 Horticulture', '🥬 Orticoltura'], Dairy: ['🥛 Leche', '🥛 Dairy', '🥛 Lait', '🥛 Latte'], 'LFA grazing livestock': ['🐑 Pasto (zonas desfavorecidas)', '🐑 Grazing (LFA)', '🐑 Herbivores (ZD)', '🐑 Pascolo (ZS)'],
  'Lowland grazing livestock': ['🐄 Pasto (llanura)', '🐄 Grazing (lowland)', '🐄 Herbivores (plaine)', '🐄 Pascolo (pianura)'], 'Specialist pigs': ['🐖 Porcino', '🐖 Pigs', '🐖 Porcins', '🐖 Suini'], 'Specialist poultry': ['🐔 Avícola', '🐔 Poultry', '🐔 Volailles', '🐔 Avicoltura'], Mixed: ['🚜 Mixtas', '🚜 Mixed', '🚜 Mixtes', '🚜 Miste'] };
const COST: Record<string, L4> = { 'Purchased feed & fodder': ['Pienso y forraje comprados', 'Purchased feed & fodder', 'Aliments achetés', 'Mangimi acquistati'], 'Regular labour': ['Mano de obra fija', 'Regular labour', 'Main-d’œuvre permanente', 'Manodopera fissa'],
  'Contract costs': ['Trabajos contratados', 'Contract costs', 'Travaux à façon', 'Contoterzismo'], 'Rent paid': ['Arrendamientos', 'Rent paid', 'Fermages', 'Affitti'], Fertilisers: ['Fertilizantes', 'Fertilisers', 'Engrais', 'Fertilizzanti'], Seed: ['Semilla', 'Seed', 'Semences', 'Sementi'],
  'Crop protection': ['Fitosanitarios', 'Crop protection', 'Phytosanitaires', 'Fitosanitari'], 'Machinery fuels and oils': ['Gasóleo y lubricantes', 'Fuels and oils', 'Carburants', 'Carburanti'], Electricity: ['Electricidad', 'Electricity', 'Électricité', 'Elettricità'],
  'Machinery depreciation': ['Amortización de maquinaria', 'Machinery depreciation', 'Amortissement du matériel', 'Ammortamento macchine'], 'Veterinary fees & medicines': ['Veterinario', 'Vet & medicines', 'Vétérinaire', 'Veterinario'], 'Other livestock costs': ['Otros costes ganaderos', 'Other livestock costs', 'Autres coûts d’élevage', 'Altri costi zootecnici'],
  'Other machinery running costs': ['Otros gastos de maquinaria', 'Other machinery costs', 'Autres frais de matériel', 'Altri costi macchine'], 'Share of net interest payments': ['Intereses', 'Interest', 'Intérêts', 'Interessi'], 'Water and other general costs': ['Agua y otros generales', 'Water & other general', 'Eau et frais généraux', 'Acqua e spese generali'] };
const gbp = (v: number | null | undefined, L: Lang) => (v == null ? '—' : (v < 0 ? '−' : '') + '£' + num(Math.abs(v), L, 0));

export default function GranjasUK() {
  const { user, t } = useApp();
  const L = user.lang;
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  const [D, setD] = useState<any>(null);
  const [done, setDone] = useState(false);
  const [ft, setFt] = useState('All Types');
  useEffect(() => { webJson('data/uk-farm-accounts.json', 24 * 3600e3).then(d => { setD(d); setDone(true); }); }, []);
  const title = T('Granjas de Inglaterra', 'England farm accounts', 'Exploitations d’Angleterre', 'Aziende dell’Inghilterra');
  if (!D?.costs) return <Screen><Stack.Screen options={{ title }} /><Note>{done ? t('noDataNow') : t('loading')}</Note></Screen>;
  const cy: string[] = D.costYears, k1 = cy.length - 1, k0 = k1 - 1, c = D.costs[ft];
  const s = (k: string): (number | null)[] | null => c?.summary?.['Farm Business|' + k] ?? null;
  const o = s('A: Total output'), co = s('E: Total costs (B + D)'), f = s('G: Farm Business Income (A - E + F)');
  const ch = (a: (number | null)[] | null) => (a && a[k0] && a[k0]! > 0 && a[k1] != null ? ((a[k1]! - a[k0]!) / a[k0]!) * 100 : null);
  const det = c?.detail ?? {}, tot = det['Agricultural costs']?.[k1] ?? null;
  const items = Object.keys(COST).filter(k => det[k]?.[k1]).map(k => ({ k, v: det[k][k1] as number })).sort((a, b) => b.v - a.v).slice(0, 10);
  const mx = items[0]?.v || 1;
  const kp = (lab: string, a: (number | null)[] | null) => (
    <View style={{ minWidth: 120, flexGrow: 1, flexBasis: '30%' }}>
      <Text style={{ fontSize: 12, color: C.textMuted }}>{lab}</Text>
      <Text style={{ fontSize: 19, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] }}>{gbp(a?.[k1], L)}</Text>
      <Text style={{ fontSize: 12, color: changeColor(ch(a)) }}>{ch(a) == null ? '' : pct(ch(a), L) + ' ' + T('vs', 'vs', 'vs', 'vs') + ' ' + cy[k0]}</Text>
    </View>
  );
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Note>{T('Cuentas medias de una explotación por tipo de granja (encuesta oficial de Defra). Solo Inglaterra; libras por explotación, ejercicio de marzo a febrero.', 'Average accounts of one farm by farm type (Defra’s official survey). England only; pounds per farm, March–February year.', 'Comptes moyens d’une exploitation par type (enquête officielle de Defra). Angleterre uniquement ; livres par exploitation, exercice mars-février.', 'Conti medi di un’azienda per tipo (indagine ufficiale di Defra). Solo Inghilterra; sterline per azienda, esercizio marzo-febbraio.')}</Note>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Object.keys(TYPES).filter(k => D.costs[k]).map(k => (
          <Pressable key={k} onPress={() => setFt(k)} accessibilityRole="button" accessibilityState={{ selected: k === ft }} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: k === ft ? C.accent : C.surfaceAlt }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: k === ft ? C.accentInk : C.text }}>{TYPES[k][LI[L]]}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle>{cy[k1]}</SectionTitle>
      <Card style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 16 }}>
        {kp(T('Producción', 'Output', 'Production', 'Produzione'), o)}
        {kp(T('Costes', 'Costs', 'Coûts', 'Costi'), co)}
        {kp(T('Renta (FBI)', 'Income (FBI)', 'Revenu (FBI)', 'Reddito (FBI)'), f)}
      </Card>
      <SectionTitle>{T('En qué se va el dinero', 'Where the money goes', 'Où va l’argent', 'Dove vanno i soldi')}</SectionTitle>
      <Card style={{ padding: 14, gap: 8 }}>
        {items.map(it => (
          <View key={it.k} style={{ gap: 3 }} accessible accessibilityLabel={`${COST[it.k][LI[L]]}: ${gbp(it.v, L)}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13.5, color: C.text }}>{COST[it.k][LI[L]]}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>{gbp(it.v, L)}{tot ? ' · ' + num((it.v / tot) * 100, L, 1) + ' %' : ''}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.surfaceAlt, overflow: 'hidden' }}><View style={{ width: `${(it.v / mx) * 100}%`, height: 8, backgroundColor: C.accent }} /></View>
          </View>
        ))}
      </Card>
      <Note>{T('Medias de la muestra de la encuesta, con margen de error: no son el coste de una granja concreta ni un coste por tonelada. La renta (FBI) es lo que queda para pagar el trabajo, el capital y la tierra propios. Fuente: Defra, Farm Accounts in England (OGL v3.0).', 'Survey sample means, with a margin of error: not the cost of a particular farm nor a cost per tonne. FBI is what is left to reward the farmer’s own labour, capital and land. Source: Defra, Farm Accounts in England (OGL v3.0).', 'Moyennes de l’échantillon, avec marge d’erreur. Source : Defra, Farm Accounts in England (OGL v3.0).', 'Medie del campione, con margine di errore. Fonte: Defra, Farm Accounts in England (OGL v3.0).')}</Note>
    </Screen>
  );
}
