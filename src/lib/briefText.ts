// Textos de «Qué ha cambiado hoy»: los mismos que js/brief.js de la web (4 idiomas). Orden: [es, en, fr, it]
export const BT: Record<string, [string, string, string, string]> = {
 "title": [
  "Qué ha cambiado hoy",
  "What changed today",
  "Ce qui a changé aujourd’hui",
  "Cosa è cambiato oggi"
 ],
 "sub": [
  "No son noticias: son cambios reales en los datos de Dehesa durante las últimas 24 horas (comparando con el estado de hace un día), más los avisos de tu lista.",
  "Not news: real changes in Dehesa data over the last 24 hours (compared with the state a day ago), plus the alerts from your watchlist.",
  "Pas des actualités : de vrais changements dans les données de Dehesa sur les dernières 24 heures (par rapport à l’état d’il y a un jour), plus les alertes de votre liste.",
  "Non notizie: cambiamenti reali nei dati di Dehesa nelle ultime 24 ore (rispetto allo stato di un giorno fa), più gli avvisi della tua lista."
 ],
 "zoneT": [
  "Cambios en tu zona",
  "Changes in your area",
  "Changements dans votre zone",
  "Cambiamenti nella tua zona"
 ],
 "zoneH": [
  "Datos nuevos de tu país ({c}), el guardado en Mi mercado. El resto de Dehesa va más abajo.",
  "New data for your country ({c}), the one saved in My market. The rest of Dehesa follows below.",
  "Nouvelles données de votre pays ({c}), celui enregistré dans Mon marché. Le reste de Dehesa suit plus bas.",
  "Nuovi dati del tuo paese ({c}), quello salvato in Il mio mercato. Il resto di Dehesa segue sotto."
 ],
 "zoneNone": [
  "Este resumen no recoge datos nuevos de tu país en esta ventana.",
  "This summary has no new data for your country in this window.",
  "Ce résumé ne contient pas de nouvelles données de votre pays sur cette période.",
  "Questo riepilogo non contiene nuovi dati del tuo paese in questa finestra."
 ],
 "gapmv": [
  "Datos nuevos con un hueco largo respecto al anterior",
  "New data after a long gap",
  "Nouvelles données après un long intervalle",
  "Nuovi dati dopo un lungo intervallo"
 ],
 "gapmvH": [
  "No son movimientos de las últimas 24 horas: el dato nuevo se compara con una observación mucho más antigua de la misma serie.",
  "These are not moves of the last 24 hours: the new data point is compared with a much older observation of the same series.",
  "Ce ne sont pas des variations des dernières 24 heures : la nouvelle donnée est comparée à une observation beaucoup plus ancienne de la même série.",
  "Non sono variazioni delle ultime 24 ore: il nuovo dato è confrontato con un'osservazione molto più vecchia della stessa serie."
 ],
 "gapmvN": [
  "Variación frente a {p} (unos {n} meses de separación).",
  "Change versus {p} (about {n} months apart).",
  "Variation par rapport à {p} (environ {n} mois d'écart).",
  "Variazione rispetto a {p} (circa {n} mesi di distanza)."
 ],
 "movers": [
  "Mayores movimientos (nuevo dato, ±2 % o más)",
  "Biggest moves (new data, ±2 % or more)",
  "Plus fortes variations (nouvelle donnée, ±2 % ou plus)",
  "Maggiori variazioni (nuovo dato, ±2 % o più)"
 ],
 "newd": [
  "Nuevos datos oficiales",
  "New official data",
  "Nouvelles données officielles",
  "Nuovi dati ufficiali"
 ],
 "ds": [
  "Datasets que han cambiado",
  "Datasets that changed",
  "Jeux de données modifiés",
  "Dataset cambiati"
 ],
 "revs": [
  "Cambios históricos detectados",
  "Historical changes detected",
  "Changements d’historique détectés",
  "Cambi nello storico rilevati"
 ],
 "revH": [
  "Dehesa ha detectado que el valor de un periodo anterior es ahora distinto en el fichero. No son revisiones oficiales confirmadas por la fuente: puede deberse a una corrección, a una nueva base de cálculo o a un reajuste del propio histórico.",
  "Dehesa detected that the value of an earlier period is now different in the file. These are not official revisions confirmed by the source: they may be a correction, a new calculation base or a rebuild of the history itself.",
  "Dehesa a détecté que la valeur d’une période passée est désormais différente dans le fichier. Ce ne sont pas des révisions officielles confirmées par la source : correction, nouvelle base de calcul ou reconstruction de l’historique possibles.",
  "Dehesa ha rilevato che il valore di un periodo passato è ora diverso nel file. Non sono revisioni ufficiali confermate dalla fonte: possono essere una correzione, una nuova base di calcolo o una ricostruzione dello storico."
 ],
 "stale": [
  "Pasaron a retraso o error",
  "Moved to late or error",
  "Passés en retard ou erreur",
  "Passati in ritardo o errore"
 ],
 "up": [
  "Próximas actualizaciones (24 h)",
  "Upcoming updates (24 h)",
  "Prochaines mises à jour (24 h)",
  "Prossimi aggiornamenti (24 h)"
 ],
 "newDs": [
  "Datasets creados en la ventana",
  "Datasets created in the window",
  "Jeux créés dans la fenêtre",
  "Dataset creati nella finestra"
 ],
 "none": [
  "Nada en este apartado.",
  "Nothing in this section.",
  "Rien dans cette section.",
  "Niente in questa sezione."
 ],
 "nobrief": [
  "El resumen diario aún no está disponible.",
  "The daily brief is not available yet.",
  "Le résumé quotidien n’est pas encore disponible.",
  "Il riepilogo giornaliero non è ancora disponibile."
 ],
 "gen": [
  "Generado",
  "Generated",
  "Généré",
  "Generato"
 ],
 "win": [
  "Ventana",
  "Window",
  "Fenêtre",
  "Finestra"
 ],
 "cDs": [
  "datasets con cambios",
  "datasets changed",
  "jeux de données modifiés",
  "dataset con modifiche"
 ],
 "cNew": [
  "series con dato nuevo",
  "series with new data",
  "séries avec nouvelle donnée",
  "serie con nuovo dato"
 ],
 "cRev": [
  "cambios históricos",
  "historical changes",
  "changements d’historique",
  "cambi nello storico"
 ],
 "cStale": [
  "con retraso",
  "late",
  "en retard",
  "in ritardo"
 ],
 "cUp": [
  "actualizaciones en 24 h",
  "updates in 24 h",
  "mises à jour en 24 h",
  "aggiornamenti in 24 h"
 ],
 "cNewDs": [
  "datasets nuevos",
  "new datasets",
  "nouveaux jeux",
  "nuovi dataset"
 ],
 "more": [
  "Ver más",
  "Show more",
  "Voir plus",
  "Mostra altro"
 ],
 "less": [
  "Ver menos",
  "Show less",
  "Voir moins",
  "Mostra meno"
 ],
 "old": [
  "antes",
  "before",
  "avant",
  "prima"
 ],
 "isNew": [
  "nuevo",
  "new",
  "nouveau",
  "nuovo"
 ],
 "changed": [
  "series cambiadas",
  "series changed",
  "séries modifiées",
  "serie cambiate"
 ],
 "changedC": [
  "contenido actualizado",
  "content updated",
  "contenu mis à jour",
  "contenuto aggiornato"
 ]
} as any;
