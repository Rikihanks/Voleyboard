# Contribuir a VoleyBoard

Gracias por ayudar. Este documento resume cómo montar el proyecto, las reglas
del código y el flujo de trabajo.

## Puesta en marcha

```
npm install
npm run dev          # http://localhost:5173
```

Pruebas y calidad:

```
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run check:size   # presupuesto de JavaScript inicial
npm run test:e2e     # requiere: npx playwright install chromium
```

## Reglas de dependencias

Una dependencia nueva exige licencia **MIT, Apache-2.0 o BSD** y una línea de
justificación en el pull request.

## Arquitectura

Las dependencias van en un solo sentido: la interfaz usa el estado, el estado
usa el dominio, y solo la capa de persistencia habla con IndexedDB.

- `src/domain/` es lógica pura: **no importa** React, Konva, Dexie ni el DOM.
- `src/features/` no accede a Dexie; lee y escribe a través de `state/` y
  `persistence/`.
- Un feature no importa de otro; si comparten algo, ese código sube a
  `domain/` o a `ui/`.
- Toda posición se guarda en metros de pista; la conversión a píxeles ocurre
  solo en `features/board/`.
- Los tipos de `src/domain/types.ts` son la única fuente de verdad del formato.
- No se añaden comentarios de código salvo que aporten contexto no obvio.
- Todos los textos de la interfaz van en `src/i18n/es.json` y `en.json`.

## Flujo de trabajo

1. Trabaja fase a fase y en una rama por fase.
2. No empieces una fase sin cumplir el criterio de aceptación de la anterior.
3. Antes de abrir el pull request, deja en verde `lint`, `format:check`,
   `typecheck`, `test`, `build` y `check:size`.

## Alcance del MVP

Dentro: pista (completa, media y en blanco), piezas arrastrables, dibujo,
equipos, biblioteca, animación por fotogramas, rotaciones 5-1, 4-2, 6-2, 6-3 y
6-6 con validación de solapamientos, exportación a PNG y PDF, PWA offline.

Fuera: cuentas, sincronización, mensajería, 3D, estadísticas, otros deportes,
fotos de jugadores y exportación a vídeo.

## Privacidad

Sin analítica, sin cookies de terceros y sin backend. Los datos viven solo en
el dispositivo.
