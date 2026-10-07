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
- Notificaciones push de avisos con la app cerrada (fase 2).
- Identificador `com.dehesaindex.app` provisional; iconos y pantalla de inicio definitivos.
- Cuentas de Apple Developer y Google Play; builds con EAS.
