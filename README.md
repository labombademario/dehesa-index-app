# Dehesa Index — app móvil (iOS y Android)

App de [dehesaindex.com](https://dehesaindex.com) hecha con Expo (React Native + TypeScript). Un solo código para iOS y Android, en español, inglés, francés e italiano.

## Qué hace (v0.1)
- **Hoy**: lo que más se mueve en tu cesta, próximas publicaciones del USDA, noticias, datos nuevos.
- **Precios**: Índice Dehesa UE, buscador, filtro por región, detalle con gráfica, fuente y dato de hace un año.
- **Países**: cobertura de datos de cada país y sus precios.
- **Mi espacio**: cesta (hasta 8), avisos de precio, mi explotación (márgenes de cultivos, leche y porcino; relaciones de precios), mi mercado (web).
- **Más**: secciones de la web con su dato principal.
- Bienvenida en 3 pasos, ajustes (idioma, perfil, mercado, fuentes, borrar datos).

Sin cuenta: todo lo del usuario se guarda solo en el teléfono (AsyncStorage).

## Novedades de la compilación 8 (22 oct, noche)
- **Ficha de país: Economía.** PIB, PIB por habitante, población, paro, sector primario, **consumo de los hogares (% del PIB)**, inflación, deuda y tipo de interés oficial, con el año o mes de cada dato (mismos ficheros que la web: `data/country-macro.json` e `interest-rates-stats.json`).
- **Reino Unido:** edad de los titulares de explotación de Inglaterra (Defra) en la ficha del país y nueva pantalla **Lluvia en el Reino Unido** (Más y ficha del país): lluvia sobre lo normal 1991-2020 del último mes y de 3, 6 y 12 meses por nación y región, y temperatura del mes (Met Office, OGL v3.0).
- Sin probar en iPhone ni en simulador: solo `tsc` y los tests.

## Novedades de la compilación 7 (22 oct)
- **Mayoristas por mercado** (Más): fruta y hortaliza de Canadá (AAFC, 6 mercados, CAD) y de EE. UU. (USDA AMS, 9 terminales, USD), con buscador, filtro fruta/hortaliza y precio por kg o libra solo cuando el envase trae peso conocido.
- **Glosario** (Más): los 43 términos de la web en los 4 idiomas, con buscador.
- **Selector de provincia de Canadá** en la ficha de los precios de StatCan; aparece cuando exista `data/canada-farm-prices-prov.json` (a la espera de que StatCan vuelva a responder) y, mientras tanto, la ficha queda igual.
- Sin probar en iPhone ni en simulador: solo `tsc` y los tests.

## Novedades de la compilación 6 (21 oct)
- **Frutas y hortalizas: Sudamérica.** El selector de país suma Argentina, Chile y Uruguay. Chile sale en el formato estándar de la web (un precio por kilo y producto, mayorista en Lo Valledor y consumidor en la Región Metropolitana, con variación y etapa; ODEPA, CC BY). Argentina y Uruguay explican por qué aún no hay precios (sin fuente con licencia verificada).
- Datos incluidos al día (`npm run sync-data`).

## Novedades de la compilación 3 (19 oct)
- **Qué sembrar**: los 21 países de la web, con selector de país y un mapa para elegir la región; las regiones sin cultivos con datos suficientes salen en gris y no se pueden elegir.
- **Mi explotación**: el abono incluido en el coste por ha se puede vincular, de forma opcional, a un precio del monitor de insumos (MAPA). Se muestra un escenario por variación; el importe solo cambia con «Usar este escenario» y se puede deshacer.
- **Insumos**: monitor de los países de la UE, de la UE y de los fertilizantes en el mercado mundial (Banco Mundial).
- **Uruguay**: mapa de departamentos con ganado, tierra y bosque plantado.

## Avisos con la app cerrada
Sin servidor. `src/lib/notify.ts` define una tarea de segundo plano (expo-background-task) que el sistema lanza cada 4 h como mínimo: descarga los datos, compara con los avisos y lanza una notificación local (expo-notifications) solo cuando un aviso pasa a cumplirse. La tarea se registra solo si hay avisos activos. El permiso se pide al crear el primer aviso. iOS decide cuándo ejecuta la tarea (a menudo por la noche o al cargar), así que el aviso puede llegar con horas de retraso. No funciona en Expo Go: hace falta una build de desarrollo (`npx expo run:android` / EAS).

## Datos
Lee `https://dehesaindex.com/data/app/v1/` (lo genera `scripts/build-app-views.mjs` en el repo de la web, con su contrato `test-app-views.mjs`). Solo descarga los ficheros cuyo hash cambia en `manifest.json`. Lleva una copia en `src/data/bundled.json` para el primer arranque sin conexión (`npm run sync-data`).

## Desarrollo
```
npm install
npm run sync-data   # copia los datos desde ../dehesa-index o la web
npx expo start      # abrir con Expo Go en el móvil
npm run typecheck
npm test
```

## Pendiente
- Identificador `com.dehesaindex.app` provisional.
- Iconos sacados de `assets/logo.png` de la web (761 px): para las tiendas conviene el logo original en vector o a más resolución.
- Cuentas de Apple Developer y Google Play; builds con EAS.
