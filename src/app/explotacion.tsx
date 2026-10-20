import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { tx } from '../lib/tx';
import { useApp, type CropLine } from '../lib/store';
import { webJson } from '../lib/fv';
import { Screen, Card, Row, Button, Note, Segmented, s } from '../components/ui';
import { C } from '../lib/theme';
import { cropMargin, herdMargin, ratio, fertScenario, farmTotals, farmSensitivity, type FarmLine } from '../lib/logic';
import { num, eur, date, parseNum } from '../lib/format';
import type { Lang, Price } from '../lib/types';

let NL: Lang = 'es';   // idioma activo: «1.150» son 1150 en es/fr/it
const n = (v: string) => parseNum(v, NL) ?? 0;
type Tab = 'crops' | 'livestock' | 'ratios';

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" accessibilityLabel={label} />
    </View>
  );
}

function Result({ L, t, income, cost, margin, extra }: { L: Lang; t: (k: string, ...v: (string | number)[]) => string; income: number; cost: number; margin: number; extra?: React.ReactNode }) {
  return (
    <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.rowSub}>{t('income')} {eur(income, L)} · {t('costs')} {eur(cost, L)}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: margin >= 0 ? C.positive : C.negative, fontVariant: ['tabular-nums'] }}>{t('margin')} {eur(margin, L)}</Text>
      {extra}
    </View>
  );
}

// Abono del coste por ha, vinculado (si el agricultor quiere) a un precio del monitor de insumos (MAPA, € / 100 kg sin IVA).
// «Por variación»: la referencia se fija al apuntar el importe; el escenario muestra cuánto cambiaría si el abono siguiera a la referencia. Nada cambia solo.
type MonItem = { id: string; name: Record<Lang, string>; value: number; last: string };
function FertLink({ c, items, L, t, onPatch }: { c: CropLine; items: MonItem[]; L: Lang; t: (k: string, ...v: (string | number)[]) => string; onPatch: (p: Partial<CropLine>) => void }) {
  const [open, setOpen] = useState(!!c.lk);
  const cur = c.lk ? items.find(x => x.id === c.lk!.id) : undefined;
  const fertHa = n(c.fert ?? ''), sc = c.lk && cur ? fertScenario(fertHa, c.lk.v, cur.value) : null;
  const fix = (x: MonItem) => ({ id: x.id, v: x.value, period: x.last });
  const euro = (v: number) => num(v, L, 0);
  return (
    <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 8 }}>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ minHeight: 32, justifyContent: 'center' }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.accent }}>{open ? '▾ ' : '▸ '}{t('fxLkTitle')}</Text>
      </Pressable>
      {open ? <>
        <Field label={t('fxLkFert')} value={c.fert ?? ''} onChange={fert => onPatch({ fert, undo: undefined, lk: c.lk && cur ? fix(cur) : c.lk })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[{ id: '', name: { es: t('fxLkNone'), en: t('fxLkNone'), fr: t('fxLkNone'), it: t('fxLkNone') }, value: 0, last: '' } as MonItem].concat(items).map(x => {
            const on = (c.lk?.id ?? '') === x.id;
            return (
              <Pressable key={x.id || 'none'} onPress={() => onPatch(x.id ? { lk: fix(x), undo: undefined } : { lk: undefined, undo: undefined })} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? C.accent : C.surfaceAlt }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: on ? C.accentInk : C.text }}>{x.name[L]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {c.lk && cur ? <Text style={s.rowSub}>{t('fxLkSet', cur.name[L], num(c.lk.v, L, 2), c.lk.period)}</Text> : null}
        {c.lk && cur && !sc && fertHa > 0 ? <Text style={s.rowSub}>{t('fxLkSame')}</Text> : null}
        {sc && c.lk && cur ? <>
          <Text style={{ fontSize: 13.5, color: C.text, lineHeight: 19, backgroundColor: C.surfaceAlt, padding: 10, borderRadius: 8 }}>
            {t(sc.pct > 0 ? 'fxLkUp' : 'fxLkDown', num(Math.abs(sc.pct), L, 1), num(c.lk.v, L, 2), num(cur.value, L, 2), euro(sc.newFert), euro(Math.abs(sc.deltaHa)), euro(Math.abs(sc.deltaHa) * n(c.ha)), num(n(c.ha), L, 0))}
          </Text>
          <Pressable onPress={() => onPatch({ undo: { cost: c.cost, fert: c.fert ?? '', lk: c.lk! }, cost: String(Math.round(n(c.cost) + sc.deltaHa)), fert: String(Math.round(sc.newFert)), lk: fix(cur) })} accessibilityRole="button"
            style={{ alignSelf: 'flex-start', paddingHorizontal: 14, height: 38, borderRadius: 19, justifyContent: 'center', backgroundColor: C.accent }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.accentInk }}>{t('fxLkUse')}</Text>
          </Pressable>
        </> : null}
        {c.undo ? <>
          <Text style={s.rowSub}>{t('fxLkUsed', euro(n(c.undo.cost)), euro(n(c.cost)))}</Text>
          <Pressable onPress={() => onPatch({ cost: c.undo!.cost, fert: c.undo!.fert, lk: c.undo!.lk, undo: undefined })} accessibilityRole="button"
            style={{ alignSelf: 'flex-start', paddingHorizontal: 14, height: 38, borderRadius: 19, justifyContent: 'center', backgroundColor: C.surfaceAlt }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{t('fxLkUndo')}</Text>
          </Pressable>
        </> : null}
        <Text style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 16 }}>{t('fxLkNote')}</Text>
      </> : null}
    </View>
  );
}

const CROP: Record<string, { es: string; en: string; fr: string; it: string }> = { trigo: { es: 'Trigo', en: 'Wheat', fr: 'Blé', it: 'Frumento' }, maiz: { es: 'Maíz', en: 'Maize', fr: 'Maïs', it: 'Mais' }, cebada: { es: 'Cebada', en: 'Barley', fr: 'Orge', it: 'Orzo' } };

export default function Explotacion() {
  const { data, user, setUser, t } = useApp();
  const L = user.lang; NL = L;
  const [tab, setTab] = useState<Tab>(user.profile === 'dairy' || user.profile === 'pig' ? 'livestock' : 'crops');
  // Primero el precio del país del usuario (media nacional de la Comisión); si no lo publica, la referencia de España con su lugar a la vista
  const mine = (product: string): Price | undefined => (user.market !== 'ES' ? data.prices.find(p => p.cc === user.market && p.product === product) : undefined);
  // EE. UU. y Canadá: la calculadora trabaja en euros por tonelada; no se les pone el precio de Zaragoza como si fuera el suyo
  const euMarket = user.market !== 'US' && user.market !== 'CA';
  const es = (product: string): Price | undefined => (euMarket ? data.prices.find(p => p.region === 'eu' && !p.cc && p.product === product) : undefined);
  const eu = (product: string): Price | undefined => mine(product) ?? es(product);
  // Una relación de precios no mezcla países: o los dos del país del usuario o los dos de la referencia de España
  const pair = (a: string, b: string): [Price | undefined, Price | undefined] => (mine(a) && mine(b) ? [mine(a), mine(b)] : [es(a), es(b)]);
  const priceRef = (p: Price | undefined) => p ? t('priceRef', `${num(p.value, L)} ${p.unit[L]}`, `${p.place[L]}, ${p.stale ? t('staleData', date(p.date, L)) : date(p.date, L)}`) : t('noPrice');

  // precios de abonos del monitor de insumos (MAPA); se bajan una vez y se guardan 12 h
  const [mon, setMon] = useState<MonItem[]>([]);
  useEffect(() => { let alive = true; webJson('data/views/input-monitor.json', 12 * 3600e3).then((d: any) => { if (alive && d?.groups) setMon(d.groups.filter((g: any) => ['nitrogen', 'pk', 'compound'].includes(g.id)).flatMap((g: any) => g.items).filter((x: any) => x && x.id && x.value > 0 && x.name)); }).catch(() => {}); return () => { alive = false; }; }, []);
  const setCrop = (id: string, patch: Partial<CropLine>) => setUser(u => ({ crops: u.crops.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const [vary, setVary] = useState<'price' | 'yield' | 'cost'>('price');
  const [step, setStep] = useState('10');
  const products: CropLine['product'][] = ['trigo', 'maiz', 'cebada'];

  const milk = eu('leche'), pig = eu('cerdo');
  const ratios = [
    { key: 'ratioWheatDiesel', r: ratio(...pair('trigo', 'diesel')), dec: 0, unit: 'l' },
    { key: 'ratioPigMaize', r: ratio(...pair('cerdo', 'maiz'), 10), dec: 2, unit: 'kg' },
    { key: 'ratioMilkSoy', r: ratio(...pair('leche', 'harina_soja'), 10), dec: 2, unit: 'kg' },
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: t('farm') }} />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'crops', label: t('crops') }, { value: 'livestock', label: t('livestock') }, { value: 'ratios', label: t('ratios') }]} />
      {tab !== 'ratios' ? <Note>{t('example')} {euMarket ? t('farmEu') : tx(L, { es: 'Por ahora esta calculadora solo tiene precios de referencia de la Unión Europea, en euros. Para EE. UU. y Canadá no se usa un precio de otro país: los ingresos quedan sin calcular.', en: 'For now this calculator only has European Union reference prices, in euros. For the US and Canada no other country’s price is used, so income is left uncalculated.', fr: 'Pour l’instant, ce calculateur n’a que des prix de référence de l’Union européenne, en euros. Pour les États-Unis et le Canada, aucun prix d’un autre pays n’est utilisé : les recettes ne sont pas calculées.', it: 'Per ora questo calcolatore ha solo prezzi di riferimento dell’Unione europea, in euro. Per Stati Uniti e Canada non si usa il prezzo di un altro paese: i ricavi restano non calcolati.' })}</Note> : <Note>{t('ratiosHint')}</Note>}

      {tab === 'crops' ? <>
        {user.crops.map(c => {
          const p = eu(c.product);
          const m = cropMargin(n(c.ha), n(c.yld), n(c.cost), p?.value ?? 0);
          return (
            <Card key={c.id} style={{ padding: 14, gap: 10 }}>
              <Segmented value={c.product} onChange={product => setCrop(c.id, { product })} options={products.map(x => ({ value: x, label: eu(x)?.name[L] ?? tx(L, CROP[x]) }))} />
              <Text style={s.rowSub}>{priceRef(p)}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Field label={t('area')} value={c.ha} onChange={ha => setCrop(c.id, { ha })} />
                <Field label={t('yield')} value={c.yld} onChange={yld => setCrop(c.id, { yld })} />
                <Field label={t('costHa')} value={c.cost} onChange={cost => setCrop(c.id, { cost })} />
              </View>
              {euMarket && mon.length ? <FertLink c={c} items={mon} L={L} t={t} onPatch={patch => setCrop(c.id, patch)} /> : null}
              {p ? <Result L={L} t={t} income={m.income} cost={m.cost} margin={m.margin} extra={<>
                {m.perHa != null ? <Text style={s.rowSub}>{t('perHa', eur(m.perHa, L))}</Text> : null}
                {m.breakEven != null ? <Text style={s.rowSub}>{t('breakEven')}: {num(m.breakEven, L, 0)} {p.unit[L]}</Text> : null}
                {m.cushionPct != null ? <Text style={s.rowSub}>{t('cushion')}: {num(m.cushionPct, L, 1)} %</Text> : null}
              </>} /> : null}
              {user.crops.length > 1 ? <Pressable onPress={() => setUser(u => ({ crops: u.crops.filter(x => x.id !== c.id) }))} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
                <Text style={{ color: C.negative, fontWeight: '600' }}>{t('delete')}</Text></Pressable> : null}
            </Card>
          );
        })}
        <Button kind="secondary" label={t('addCrop')} onPress={() => setUser(u => ({ crops: [...u.crops, { id: 'c' + Date.now().toString(36), product: 'cebada', ha: '10', yld: '5', cost: '900' }] }))} />
        {(() => {
          const lines: FarmLine[] = user.crops.map(c => ({ ha: n(c.ha), yld: n(c.yld), cost: n(c.cost), price: eu(c.product)?.value ?? 0 }));
          const tot = farmTotals(lines);
          const Tt = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
          if (!tot.n) return <Note>{Tt('Rellena superficie, rendimiento y costes de al menos un cultivo con precio de referencia para ver el resumen.', 'Fill in area, yield and costs for at least one crop with a reference price to see the summary.', 'Renseignez surface, rendement et coûts d’au moins une culture avec prix de référence pour voir le résumé.', 'Inserisci superficie, resa e costi di almeno una coltura con prezzo di riferimento per vedere il riepilogo.')}</Note>;
          const sn = farmSensitivity(lines, vary, +step);
          return <>
            <Text style={[s.rowTitle, { fontSize: 17 }]}>{Tt('Resumen de la explotación', 'Farm summary', 'Résumé de l’exploitation', 'Riepilogo dell’azienda')}</Text>
            <Card style={{ padding: 14, gap: 4 }}>
              <Text style={s.rowSub}>{Tt('Ingresos', 'Revenue', 'Recettes', 'Ricavi')} {eur(tot.income, L)} · {t('costs')} {eur(tot.cost, L)}</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: tot.margin >= 0 ? C.positive : C.negative }}>{t('margin')} {eur(tot.margin, L)}</Text>
              <Text style={s.rowSub}>{Tt(`Suma de ${tot.n} cultivo(s) con precio de referencia; los que no lo tienen no entran.`, `Sum of ${tot.n} crop(s) with a reference price; those without one are left out.`, `Somme de ${tot.n} culture(s) avec prix de référence ; celles sans prix sont exclues.`, `Somma di ${tot.n} coltura/e con prezzo di riferimento; quelle senza non entrano.`)}</Text>
            </Card>
            <Text style={[s.rowTitle, { fontSize: 17 }]}>{Tt('Sensibilidad', 'Sensitivity', 'Sensibilité', 'Sensibilità')}</Text>
            <Segmented value={vary} onChange={setVary} options={[{ value: 'price', label: Tt('Precio', 'Price', 'Prix', 'Prezzo') }, { value: 'yield', label: Tt('Rendimiento', 'Yield', 'Rendement', 'Resa') }, { value: 'cost', label: Tt('Costes', 'Costs', 'Coûts', 'Costi') }]} />
            <Segmented value={step} onChange={setStep} options={[{ value: '5', label: '±5 %' }, { value: '10', label: '±10 %' }, { value: '20', label: '±20 %' }]} />
            <Card>
              <Row first title={'−' + step + ' %'} right={eur(sn.down, L)} rightColor={sn.down >= 0 ? C.positive : C.negative} />
              <Row title={Tt('Actual', 'Current', 'Actuel', 'Attuale')} right={eur(sn.now, L)} rightColor={sn.now >= 0 ? C.positive : C.negative} />
              <Row title={'+' + step + ' %'} right={eur(sn.up, L)} rightColor={sn.up >= 0 ? C.positive : C.negative} />
            </Card>
            <Text style={s.rowSub}>{Tt('Se aplica a todos los cultivos a la vez y solo a las líneas con margen calculable. No es una previsión.', 'Applied to all crops at once and only to lines with a computable margin. It is not a forecast.', 'Appliquée à toutes les cultures à la fois et seulement aux lignes avec marge calculable. Ce n’est pas une prévision.', 'Applicata a tutte le colture insieme e solo alle righe con margine calcolabile. Non è una previsione.')}</Text>
          </>;
        })()}
        <Note>{t('notForecast')}</Note>
      </> : null}

      {tab === 'livestock' ? <>
        <Card style={{ padding: 14, gap: 10 }}>
          <Text style={[s.rowTitle, { fontSize: 17 }]}>{t('dairy')}</Text>
          <Text style={s.rowSub}>{priceRef(milk)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Field label={t('cows')} value={user.milk.cows} onChange={cows => setUser(u => ({ milk: { ...u.milk, cows } }))} />
            <Field label={t('kgCow')} value={user.milk.kg} onChange={kg => setUser(u => ({ milk: { ...u.milk, kg } }))} />
            <Field label={t('costMilk')} value={user.milk.cost} onChange={cost => setUser(u => ({ milk: { ...u.milk, cost } }))} />
          </View>
          {milk ? (() => { const m = herdMargin(n(user.milk.cows) * n(user.milk.kg), milk.value / 100, n(user.milk.cost) / 100);
            return <Result L={L} t={t} income={m.income} cost={m.cost} margin={m.margin} extra={m.cushionPct != null ? <Text style={s.rowSub}>{t('cushion')}: {num(m.cushionPct, L, 1)} %</Text> : null} />; })() : null}
        </Card>
        <Card style={{ padding: 14, gap: 10 }}>
          <Text style={[s.rowTitle, { fontSize: 17 }]}>{t('pork')}</Text>
          <Text style={s.rowSub}>{priceRef(pig)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Field label={t('pigs')} value={user.pig.n} onChange={v => setUser(u => ({ pig: { ...u.pig, n: v } }))} />
            <Field label={t('kgCarcass')} value={user.pig.kg} onChange={kg => setUser(u => ({ pig: { ...u.pig, kg } }))} />
            <Field label={t('costKg')} value={user.pig.cost} onChange={cost => setUser(u => ({ pig: { ...u.pig, cost } }))} />
          </View>
          {pig ? (() => { const m = herdMargin(n(user.pig.n) * n(user.pig.kg), pig.value / 100, n(user.pig.cost));
            return <Result L={L} t={t} income={m.income} cost={m.cost} margin={m.margin} extra={m.cushionPct != null ? <Text style={s.rowSub}>{t('cushion')}: {num(m.cushionPct, L, 1)} %</Text> : null} />; })() : null}
        </Card>
        <Note>{t('notForecast')}</Note>
      </> : null}

      {tab === 'ratios' ? (
        <Card>
          {ratios.map((x, i) => {
            const r = x.r;
            const sub = !r ? t('noPrice') : r.ago == null ? t('noYearAgo') : `${t('yearAgo')}: ${num(r.ago, L, x.dec)} ${x.unit} · ${r.now >= r.ago ? t('better') : t('worse')}`;
            return <Row key={x.key} first={i === 0} title={t(x.key)} sub={sub} right={r ? `${num(r.now, L, x.dec)} ${x.unit}` : '—'}
              rightColor={r && r.ago != null ? (r.now >= r.ago ? C.positive : C.negative) : undefined} />;
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
