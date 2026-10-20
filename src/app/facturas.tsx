// Comparador de facturas con el mercado (como comparador-facturas.html): pega tus compras o ventas y mira si pagaste o cobraste más o menos que el mercado
// en esas mismas fechas y con las mismas cantidades. Todo se calcula en el teléfono: no se envía ni se guarda nada. Reglas en src/lib/invoice.ts.
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Row, Note, SectionTitle, Segmented, Button } from '../components/ui';
import { C } from '../lib/theme';
import { webJson } from '../lib/fv';
import { norm } from '../lib/logic';
import { tx, fill, type T4 } from '../lib/tx';
import { parse, compute, amb, type Pt } from '../lib/invoice';

type Idx = { series: { id: string; product: string; region: string; name: T4; unit: string; currency: string }[] };
type Ser = { id: string; product: string; region: string; name: T4; place?: T4; unit: string; currency: string; frequency: string; sourceName: string; license: string; attribution: string; note?: T4; points: Pt[] };
const UNITS: Record<string, [string, string, string, string]> = { tonelada: ['t', 't', 't', 't'], ton_corta: ['ton corta', 'short ton', 'tonne courte', 'tonnellata corta'], barril: ['barril', 'barrel', 'baril', 'barile'], gal: ['galón', 'gallon', 'gallon', 'gallone'], docena: ['docena', 'dozen', 'douzaine', 'dozzina'], litro: ['litro', 'litre', 'litre', 'litro'], index_2020_100: ['índice 2020=100', 'index 2020=100', 'indice 2020=100', 'indice 2020=100'], cwt: ['cwt', 'cwt', 'cwt', 'cwt'], '100kg': ['100 kg', '100 kg', '100 kg', '100 kg'], bushel: ['bushel', 'bushel', 'boisseau (bushel)', 'bushel'], kg: ['kg', 'kg', 'kg', 'kg'], mmbtu: ['MMBtu', 'MMBtu', 'MMBtu', 'MMBtu'], lb: ['lb', 'lb', 'lb', 'lb'] };
const LI = { es: 0, en: 1, fr: 2, it: 3 } as const;
const REG: Record<string, T4> = { us: { es: 'EE. UU.', en: 'US', fr: 'É.-U.', it: 'USA' }, eu: { es: 'UE', en: 'EU', fr: 'UE', it: 'UE' }, uk: { es: 'Reino Unido', en: 'UK', fr: 'Royaume-Uni', it: 'Regno Unito' }, ca: { es: 'Canadá', en: 'Canada', fr: 'Canada', it: 'Canada' } };
const field = { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: C.text } as const;

export default function Facturas() {
  const { user } = useApp();
  const L = user.lang;
  const T = (es: string, en: string, fr: string, it: string) => tx(L, { es, en, fr, it });
  const nf = (n: number, d = 2) => { try { return n.toLocaleString(L, { maximumFractionDigits: d }); } catch { return String(n); } };
  const sg = (n: number, d = 2) => (n > 0 ? '+' : n < 0 ? '−' : '') + nf(Math.abs(n), d);
  const [idx, setIdx] = useState<Idx | null>(null);
  const [failed, setFailed] = useState(false);
  const [sid, setSid] = useState('eu/trigo');
  const [ser, setSer] = useState<Ser | null>(null);
  const [serFail, setSerFail] = useState(false);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const [ad, setAd] = useState(''); const [aq, setAq] = useState(''); const [ap, setAp] = useState(''); const [addMsg, setAddMsg] = useState('');
  const [go, setGo] = useState(false);

  useEffect(() => { webJson('data/api/v1/index.json', 6 * 3600e3).then(d => { if (d?.series) setIdx(d); else setFailed(true); }); }, []);
  useEffect(() => {
    let alive = true; setSer(null); setSerFail(false);
    webJson('data/api/v1/series/' + sid + '.json', 6 * 3600e3).then(d => { if (!alive) return; if (d?.points) setSer(d); else setSerFail(true); });
    return () => { alive = false; };
  }, [sid]);

  const list = useMemo(() => {
    if (!idx) return [];
    const k = norm(q.trim());
    return idx.series.slice().sort((a, b) => (tx(L, a.name) + a.region).localeCompare(tx(L, b.name) + b.region, L))
      .filter(x => !k || norm(tx(L, x.name) + ' ' + tx(L, REG[x.region] ?? { es: x.region })).includes(k));
  }, [idx, q, L]);
  const shown = list.slice(0, 8);
  const cur = idx?.series.find(x => x.id === sid);
  const unit = (u: string) => (UNITS[u] ? UNITS[u][LI[L]] : u);
  const parsed = useMemo(() => parse(text), [text]);
  const res = ser && go ? compute(ser.frequency, ser.points, parsed) : null;
  const buy = mode === 'buy';

  const example = () => {
    if (!ser) return;
    const pts = ser.points.slice(-60).filter((_, k) => k % 12 === 0).slice(-4), out: string[] = [];
    pts.forEach((p, i) => {
      let d = p[0]; if (/^\d{4}-\d{2}$/.test(d)) d += '-10'; else if (/^\d{4}-Q/.test(d)) return;
      out.push(d + ';' + (10 + i * 7) + ';' + String(Math.round(p[1] * (1 + (i % 2 ? 0.03 : -0.02)) * 100) / 100).replace('.', L === 'en' ? '.' : ','));
    });
    setText(out.join('\n')); setGo(true);
  };
  const addLine = () => {
    const d = ad.trim(), qq = aq.replace(',', '.').trim(), pp = ap.replace(',', '.').trim();
    if (!d || !isFinite(parseFloat(pp)) || (qq && !isFinite(parseFloat(qq)))) { setAddMsg(T('Pon una fecha y un precio para añadir la línea.', 'Enter a date and a price to add the line.', 'Indiquez une date et un prix pour ajouter la ligne.', 'Inserisci una data e un prezzo per aggiungere la riga.')); return; }
    const dec = (v: string) => (L === 'en' ? v : v.replace('.', ','));
    setText((text.replace(/\s+$/, '') ? text.replace(/\s+$/, '') + '\n' : '') + d + ';' + dec(qq || '1') + ';' + dec(pp)); setAd(''); setAq(''); setAp(''); setAddMsg(''); setGo(true);
  };

  const u = ser ? unit(ser.unit) + ' ' + ser.currency : '';
  let summary = '';
  if (res && res.lines.length && ser) {
    const diff = res.paid - res.mkt, pct = res.mkt ? (diff / res.mkt) * 100 : 0, up = diff > 0, flat = Math.abs(diff) < 0.005;
    const dir = flat ? T('igual que el mercado', 'the same as the market', 'identique au marché', 'uguale al mercato') : up ? T('por encima', 'above', 'au-dessus', 'sopra') : T('por debajo', 'below', 'en dessous', 'sotto');
    const tdir = flat ? dir : buy ? (up ? T('pagaste de más', 'you overpaid', 'vous avez payé de trop', 'hai pagato di più') : T('pagaste de menos', 'you paid less', 'vous avez payé de moins', 'hai pagato di meno'))
      : (up ? T('cobraste de más', 'you received more', 'vous avez reçu de plus', 'hai incassato di più') : T('cobraste de menos', 'you received less', 'vous avez reçu de moins', 'hai incassato di meno'));
    const base = buy
      ? T('Con {0} {1} comparadas, pagaste de media {2} {3}, frente a {4} {3} del mercado en las mismas fechas: {5} {6} ({7} %). En total, {8} {9}.', 'Over {0} {1} compared, you paid {2} {3} on average, against {4} {3} for the market on the same dates: {5} {6} ({7}%). In total, {8} {9}.', 'Sur {0} {1} comparées, vous avez payé {2} {3} en moyenne, contre {4} {3} pour le marché aux mêmes dates : {5} {6} ({7} %). Au total, {8} {9}.', 'Su {0} {1} confrontate, hai pagato in media {2} {3}, contro {4} {3} del mercato nelle stesse date: {5} {6} ({7}%). In totale, {8} {9}.')
      : T('Con {0} {1} comparadas, cobraste de media {2} {3}, frente a {4} {3} del mercado en las mismas fechas: {5} {6} ({7} %). En total, {8} {9}.', 'Over {0} {1} compared, you received {2} {3} on average, against {4} {3} for the market on the same dates: {5} {6} ({7}%). In total, {8} {9}.', 'Sur {0} {1} comparées, vous avez reçu {2} {3} en moyenne, contre {4} {3} pour le marché aux mêmes dates : {5} {6} ({7} %). Au total, {8} {9}.', 'Su {0} {1} confrontate, hai incassato in media {2} {3}, contro {4} {3} del mercato nelle stesse date: {5} {6} ({7}%). In totale, {8} {9}.');
    summary = fill(base, nf(res.q), unit(ser.unit), nf(res.paid), u, nf(res.mkt), nf(Math.abs(diff)) + ' ' + ser.currency, dir, nf(Math.abs(pct), 1), tdir, nf(Math.abs(res.tot)) + ' ' + ser.currency);
  }
  const diff = res ? res.paid - res.mkt : 0, good = buy ? diff <= 0 : diff >= 0;
  const small = { fontSize: 12.5, color: C.textMuted } as const;
  const title = T('Comparador de facturas', 'Invoice comparison', 'Comparateur de factures', 'Confronto fatture');
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, fontFamily: 'serif' }} accessibilityRole="header">🧾 {title}</Text>
      <Note>{T('Pega tus compras o ventas y mira si pagaste o cobraste más o menos que el mercado en esas mismas fechas, con las mismas cantidades. Tus facturas no salen del teléfono: no se envían ni se guardan.', 'Paste your purchases or sales and see whether you paid or received more or less than the market on those same dates, with the same quantities. Your invoices never leave the phone: nothing is sent or saved.', 'Collez vos achats ou ventes et voyez si vous avez payé ou reçu plus ou moins que le marché aux mêmes dates, avec les mêmes quantités. Vos factures ne quittent pas le téléphone : rien n’est envoyé ni enregistré.', 'Incolla i tuoi acquisti o vendite e guarda se hai pagato o incassato più o meno del mercato nelle stesse date, con le stesse quantità. Le tue fatture non lasciano il telefono: nulla viene inviato né salvato.')}</Note>
      {failed ? <Note>{T('No se pudo cargar la lista de series. Vuelve a intentarlo en unos minutos.', 'Could not load the series list. Please try again in a few minutes.', 'Impossible de charger la liste des séries. Réessayez dans quelques minutes.', 'Impossibile caricare l’elenco delle serie. Riprova tra qualche minuto.')}</Note> : null}
      {!idx && !failed ? <Note>{T('Cargando…', 'Loading…', 'Chargement…', 'Caricamento…')}</Note> : null}
      {idx ? <>
        <SectionTitle>{T('1. Elige con qué comparar', '1. Choose what to compare with', '1. Choisissez avec quoi comparer', '1. Scegli con cosa confrontare')}</SectionTitle>
        <TextInput value={q} onChangeText={setQ} placeholder={T('Buscar en la lista…', 'Search the list…', 'Rechercher dans la liste…', 'Cerca nell’elenco…')} placeholderTextColor={C.textMuted} autoCorrect={false} clearButtonMode="while-editing" style={field} />
        <Card>
          {shown.length ? shown.map((x, i) => <Row key={x.id} first={i === 0} title={(x.id === sid ? '✓ ' : '') + tx(L, x.name)} sub={tx(L, REG[x.region] ?? { es: x.region }) + ' · ' + unit(x.unit) + ' ' + x.currency} onPress={() => setSid(x.id)} />)
            : <Row first title="—" sub={T('Nada coincide con tu búsqueda.', 'Nothing matches your search.', 'Aucun résultat.', 'Nessun risultato.')} />}
        </Card>
        {list.length > shown.length ? <Text style={small}>{fill(T('Hay {0} más: escribe arriba para acotar.', '{0} more: type above to narrow down.', 'Encore {0} : saisissez ci-dessus pour affiner.', 'Altre {0}: scrivi sopra per restringere.'), list.length - shown.length)}</Text> : null}
        <Segmented options={[{ value: 'buy', label: T('Compras', 'Purchases', 'Achats', 'Acquisti') }, { value: 'sell', label: T('Ventas', 'Sales', 'Ventes', 'Vendite') }]} value={mode} onChange={setMode} />
        {cur ? <Text style={{ fontSize: 12.5, color: '#8f5f12' }}>{fill(T('Escribe tus precios en {0}. Si tu factura está en otra unidad o moneda, conviértela antes: aquí no se convierte nada por ti.', 'Enter your prices in {0}. If your invoice uses another unit or currency, convert it first: nothing is converted for you here.', 'Saisissez vos prix en {0}. Si votre facture est dans une autre unité ou devise, convertissez-la avant : rien n’est converti ici.', 'Scrivi i tuoi prezzi in {0}. Se la fattura è in un’altra unità o valuta, convertila prima: qui non si converte nulla.'), unit(cur.unit) + ' ' + cur.currency)}</Text> : null}

        <SectionTitle>{T('2. Tus facturas', '2. Your invoices', '2. Vos factures', '2. Le tue fatture')}</SectionTitle>
        <Text style={small}>{T('Una línea por factura: fecha, cantidad y precio unitario, separados por punto y coma o tabulador. Fechas: AAAA-MM-DD o DD/MM/AAAA. La cantidad es opcional (si falta, cuenta 1).', 'One line per invoice: date, quantity and unit price, separated by semicolon or tab. Dates: YYYY-MM-DD or DD/MM/YYYY. Quantity is optional (if missing, counts as 1).', 'Une ligne par facture : date, quantité et prix unitaire, séparés par point-virgule ou tabulation. Dates : AAAA-MM-JJ ou JJ/MM/AAAA. La quantité est facultative (si absente, compte 1).', 'Una riga per fattura: data, quantità e prezzo unitario, separati da punto e virgola o tabulazione. Date: AAAA-MM-GG o GG/MM/AAAA. La quantità è facoltativa (se manca, vale 1).')}</Text>
        <TextInput value={text} onChangeText={t => { setText(t); setGo(false); }} multiline placeholder={'2026-03-12;24;268,5\n2026-04-02;30;271\n15/05/2026;18;262'} placeholderTextColor={C.textMuted} autoCorrect={false} autoCapitalize="none" style={[field, { minHeight: 130, textAlignVertical: 'top', fontFamily: 'Courier' }]} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('O añade una línea a mano', 'Or add a line by hand', 'Ou ajoutez une ligne à la main', 'Oppure aggiungi una riga a mano')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={ad} onChangeText={setAd} placeholder={T('Fecha', 'Date', 'Date', 'Data')} placeholderTextColor={C.textMuted} autoCorrect={false} style={[field, { flex: 1.4 }]} />
          <TextInput value={aq} onChangeText={setAq} placeholder={T('Cantidad', 'Quantity', 'Quantité', 'Quantità')} placeholderTextColor={C.textMuted} keyboardType="decimal-pad" style={[field, { flex: 1 }]} />
          <TextInput value={ap} onChangeText={setAp} placeholder={T('Precio', 'Price', 'Prix', 'Prezzo')} placeholderTextColor={C.textMuted} keyboardType="decimal-pad" style={[field, { flex: 1 }]} />
        </View>
        {addMsg ? <Text style={{ fontSize: 12.5, color: '#8f5f12' }}>{addMsg}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button label={T('Comparar', 'Compare', 'Comparer', 'Confronta')} onPress={() => setGo(true)} />
          <Button kind="secondary" label={T('Añadir línea', 'Add line', 'Ajouter la ligne', 'Aggiungi riga')} onPress={addLine} />
          <Button kind="secondary" label={T('Cargar un ejemplo', 'Load an example', 'Charger un exemple', 'Carica un esempio')} onPress={example} />
          <Button kind="secondary" label={T('Vaciar', 'Clear', 'Vider', 'Svuota')} onPress={() => { setText(''); setGo(false); }} />
        </View>

        <SectionTitle>{T('3. Resultado', '3. Result', '3. Résultat', '3. Risultato')}</SectionTitle>
        {serFail ? <Note>{T('No se pudo cargar la serie de mercado. Vuelve a intentarlo en unos minutos.', 'Could not load the market series. Please try again in a few minutes.', 'Impossible de charger la série de marché. Réessayez dans quelques minutes.', 'Impossibile caricare la serie di mercato. Riprova tra qualche minuto.')}</Note>
          : !ser ? <Note>{T('Cargando la serie…', 'Loading the series…', 'Chargement de la série…', 'Caricamento della serie…')}</Note>
          : !go || (!parsed.rows.length && !parsed.bad.length) ? <Note>{T('Pega al menos una factura con fecha y precio, o carga un ejemplo con cifras inventadas para ver cómo funciona.', 'Paste at least one invoice with a date and a price, or load an example with made-up figures to see how it works.', 'Collez au moins une facture avec date et prix, ou chargez un exemple avec des chiffres inventés pour voir comment ça marche.', 'Incolla almeno una fattura con data e prezzo, o carica un esempio con cifre inventate per vedere come funziona.')}</Note>
          : res ? <>
            {res.bad.slice(0, 5).map(b => <Text key={b[0]} style={{ fontSize: 12.5, color: '#8f5f12' }}>{fill(T('Línea {0} no reconocida: «{1}»', 'Line {0} not recognised: “{1}”', 'Ligne {0} non reconnue : « {1} »', 'Riga {0} non riconosciuta: «{1}»'), b[0], b[1]) + (b[2] && amb(b[2]) ? ' ' + fill(T('Número ambiguo: «{0}» puede ser {1} o {2}. Escríbelo sin separador de miles o con coma decimal.', 'Ambiguous number: “{0}” could be {1} or {2}. Write it without a thousands separator or with a decimal point.', 'Nombre ambigu : « {0} » peut être {1} ou {2}. Écrivez-le sans séparateur de milliers ou avec une virgule décimale.', 'Numero ambiguo: «{0}» può essere {1} o {2}. Scrivilo senza separatore delle migliaia o con la virgola decimale.'), amb(b[2])!.raw, amb(b[2])!.dec, amb(b[2])!.thou) : '')}</Text>)}
            {res.comma ? <Text style={{ fontSize: 12.5, color: '#8f5f12' }}>{T('Se han leído líneas separadas por comas. Si tus decimales llevan coma (240,5), separa las columnas con punto y coma o tabulador.', 'Comma-separated lines were read. If your decimals use a comma (240,5), separate the columns with a semicolon or tab.', 'Des lignes séparées par des virgules ont été lues. Si vos décimales utilisent la virgule (240,5), séparez les colonnes par point-virgule ou tabulation.', 'Sono state lette righe separate da virgole. Se i tuoi decimali usano la virgola (240,5), separa le colonne con punto e virgola o tabulazione.')}</Text> : null}
            {!res.lines.length ? <Note>{fill(T('{0} línea(s) sin dato de mercado en esa fecha: no entran en la comparación.', '{0} line(s) without market data on that date: left out of the comparison.', '{0} ligne(s) sans donnée de marché à cette date : exclues de la comparaison.', '{0} riga/righe senza dato di mercato in quella data: escluse dal confronto.'), res.skipped)}</Note> : <>
              <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{tx(L, ser.name)} · {tx(L, REG[ser.region] ?? { es: ser.region })}</Text>
              <Card>
                <Row first title={T('Cantidad total', 'Total quantity', 'Quantité totale', 'Quantità totale')} right={nf(res.q) + ' ' + unit(ser.unit)} />
                <Row title={T('Tu precio medio', 'Your average price', 'Votre prix moyen', 'Il tuo prezzo medio')} sub={T('ponderado por cantidad', 'weighted by quantity', 'pondéré par la quantité', 'ponderato per quantità')} right={nf(res.paid) + ' ' + ser.currency} />
                <Row title={T('Mercado en las mismas fechas', 'Market on the same dates', 'Marché aux mêmes dates', 'Mercato nelle stesse date')} sub={T('ponderado por cantidad', 'weighted by quantity', 'pondéré par la quantité', 'ponderato per quantità')} right={nf(res.mkt) + ' ' + ser.currency} />
                <Row title={T('Diferencia', 'Difference', 'Écart', 'Differenza')} sub={T('En total: ', 'In total: ', 'Au total : ', 'In totale: ') + sg(res.tot) + ' ' + ser.currency} right={sg(diff) + ' ' + ser.currency} rightSub={res.mkt ? sg((diff / res.mkt) * 100, 1) + ' %' : undefined} rightColor={good ? C.positive : C.negative} />
              </Card>
              <Text style={{ fontSize: 14.5, color: C.text, lineHeight: 21 }}>{summary}</Text>
              <Card>
                {res.lines.map((l, i) => { const dd = l.price - l.mkt; return <Row key={i} first={i === 0} title={l.date + ' · ' + nf(l.qty) + ' ' + unit(ser.unit)} sub={T('Mercado ', 'Market ', 'Marché ', 'Mercato ') + nf(l.mkt) + ' (' + l.md + ')'} right={nf(l.price) + ' ' + ser.currency} rightSub={sg(dd) + ' (' + sg(l.mkt ? (dd / l.mkt) * 100 : 0, 1) + ' %)'} />; })}
              </Card>
              {res.skipped ? <Text style={small}>{fill(T('{0} línea(s) sin dato de mercado en esa fecha: no entran en la comparación.', '{0} line(s) without market data on that date: left out of the comparison.', '{0} ligne(s) sans donnée de marché à cette date : exclues de la comparaison.', '{0} riga/righe senza dato di mercato in quella data: escluse dal confronto.'), res.skipped)}</Text> : null}
              <Text style={small}>{T('Para cada factura se toma el precio de mercado de su mismo mes (series mensuales), trimestre (trimestrales) o la última cotización de los 14 días anteriores (semanales; 7 días en las diarias). Sin dato, la línea no entra. Esto no es asesoramiento financiero: la serie es un precio de referencia de una fuente oficial, no tu mercado exacto.', 'For each invoice we take the market price of the same month (monthly series), quarter (quarterly) or the latest quote from the previous 14 days (weekly; 7 days for daily). With no data, the line is left out. This is not financial advice: the series is a reference price from an official source, not your exact market.', 'Pour chaque facture on prend le prix de marché du même mois (séries mensuelles), trimestre (trimestrielles) ou la dernière cotation des 14 jours précédents (hebdomadaires ; 7 jours pour les quotidiennes). Sans donnée, la ligne est exclue. Ce n’est pas un conseil financier : la série est un prix de référence d’une source officielle, pas votre marché exact.', 'Per ogni fattura si prende il prezzo di mercato dello stesso mese (serie mensili), trimestre (trimestrali) o l’ultima quotazione dei 14 giorni precedenti (settimanali; 7 giorni per le giornaliere). Senza dato, la riga è esclusa. Non è consulenza finanziaria: la serie è un prezzo di riferimento di una fonte ufficiale, non il tuo mercato esatto.')}</Text>
              <Text style={small}>{T('Fuente: ', 'Source: ', 'Source : ', 'Fonte: ') + ser.sourceName + ' · ' + T('Licencia: ', 'Licence: ', 'Licence : ', 'Licenza: ') + ser.license}</Text>
              {ser.note ? <Text style={small}>{T('Qué mide la serie: ', 'What the series measures: ', 'Ce que mesure la série : ', 'Cosa misura la serie: ') + tx(L, ser.note)}</Text> : null}
              <Pressable onPress={() => Linking.openURL('https://dehesaindex.com/comparador-facturas.html?s=' + encodeURIComponent(ser.id))} accessibilityRole="link"><Text style={{ fontSize: 12.5, color: C.accent }}>{T('Abrir en la web para imprimir o descargar el CSV', 'Open on the web to print or download the CSV', 'Ouvrir sur le web pour imprimer ou télécharger le CSV', 'Apri sul web per stampare o scaricare il CSV')}</Text></Pressable>
            </>}
          </> : null}
      </> : null}
    </Screen>
  );
}
