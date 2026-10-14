# VoleyBoard

Pizarra táctica de voleibol: una aplicación web instalable (PWA) para dibujar,
animar y guardar tácticas, que funciona sin conexión y sin cuenta.

- **Local-first**: todo se guarda en el dispositivo. El MVP no tiene backend.
- **Táctil primero**: pointer events, objetivos táctiles de 44 px y gestos de
  dos dedos para zoom sin mover piezas.
- **Rápido**: arrastre por debajo de 100 ms y 60 fps con hasta 30 piezas.
- **Los datos son del usuario**: copia de seguridad completa en JSON, sin
  analítica ni servicios de terceros.
- **Lógica pura aparte**: reglas, geometría y animación viven en TypeScript sin
  React ni DOM, para poder probarlas.

## Estado de las fases

- Fase 0 (andamiaje): completa.
- Fase 1 (pizarra básica): completa.
- Fase 2 (persistencia, equipos y biblioteca): completa. Dexie con migraciones
  y autoguardado, equipos con sustitución por arrastre, biblioteca con carpetas,
  búsqueda, miniaturas y copia de seguridad JSON validada con Zod.
- Fase 3 (herramientas de dibujo): completa. 16 estilos de línea
  (4 patrones × 2 formas × 2 extremos), ajuste del punto de control de las
  curvas y notas de texto.
- Fase 4 (animación): completa. Fotogramas, interpolación, velocidad, bucle y
  fotograma anterior en transparencia.
- Fase 5 (rotaciones y recepción): completa. Sistemas 5-1, 4-2, 6-2, 6-3 y 6-6,
  formaciones de recepción de 5, 4 y 3 receptores y validación de solapamientos.
- Fase 6 (pulido y publicación): completa. PDF, Web Share, ajustes, accesibilidad,
  e2e de Playwright, presupuesto de tamaño en CI y despliegue en GitHub Pages.
- Fase 7 (opcional): parcial. Enlace compartible por URL con la táctica
  comprimida en el fragmento `#`; la sincronización con backend y la mensajería
  quedan fuera del MVP.

## Stack

| Capa         | Elección                          |
| ------------ | --------------------------------- |
| Lenguaje     | TypeScript en modo strict         |
| Build y dev  | Vite                              |
| UI           | React                             |
| Pizarra      | Konva con react-konva             |
| Estado       | Zustand con Immer                 |
| Persistencia | IndexedDB con Dexie (fase 2)      |
| PWA          | vite-plugin-pwa (Workbox)         |
| PDF          | jsPDF (fase 6)                    |
| Validación   | Zod (fase 2)                      |
| Pruebas      | Vitest y Playwright (e2e, fase 6) |
| Calidad      | ESLint, Prettier, GitHub Actions  |
| i18n         | i18next                           |

Regla para dependencias: una dependencia nueva exige licencia MIT, Apache-2.0 o
BSD y una línea de justificación en el pull request.

## Estructura

```
src/
  app/             shell, pantalla principal y proveedores
  domain/          lógica pura, sin React ni DOM
    types.ts       tipos del modelo de datos (única fuente de verdad)
    court.ts       geometría y conversión de coordenadas
    history.ts     deshacer y rehacer
  state/           stores de Zustand y factorías
  features/
    board/         lienzo, capas y herramientas
    export/        PNG (PDF y compartir en fase 6)
  ui/              componentes comunes
  i18n/            es.json y en.json
  pwa/             manifiesto y aviso de actualización
tests/             unitarias con Vitest
scripts/           generación de iconos PWA
```

Reglas de dependencia: `domain/` no importa React, Konva ni el DOM;
`features/` no accede a la persistencia; un feature no importa de otro; toda
posición se guarda en metros de pista y la conversión a píxeles ocurre solo en
`features/board/`.

## Scripts

| Comando                | Descripción                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                                         |
| `npm run build`        | Tipos + build de producción (y PWA)                            |
| `npm run preview`      | Sirve el build de producción                                   |
| `npm run lint`         | ESLint                                                         |
| `npm run format`       | Prettier (escribe)                                             |
| `npm run format:check` | Prettier (comprueba)                                           |
| `npm run typecheck`    | TypeScript                                                     |
| `npm test`             | Pruebas unitarias con Vitest                                   |
| `npm run test:e2e`     | Pruebas e2e con Playwright (requiere `npx playwright install`) |
| `npm run check:size`   | Comprueba el presupuesto de JavaScript inicial                 |
| `npm run icons`        | Regenera los iconos PNG de la PWA                              |

## Despliegue

El flujo `.github/workflows/deploy.yml` publica en GitHub Pages en cada push a
`main`. Ajusta `VITE_BASE` a `/<nombre-del-repositorio>/`; el `base` de Vite y el
service worker se generan ya con esa ruta. La guía de contribución está en
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Privacidad

Sin analítica, sin cookies de terceros y sin servidor. Los nombres de los
jugadores se guardan solo en el dispositivo, sin fotos. Conviene exportar una
copia de seguridad en JSON de forma periódica (fase 2): borrar los datos del
sitio elimina la biblioteca.

## Navegadores objetivo

Últimas dos versiones principales de Chrome, Edge, Firefox y Safari (macOS e
iOS). Las funciones sin soporte universal (Wake Lock, Web Share) se detectan y
degradan sin romper la app.

## Licencia

**Propuesta provisional: PolyForm Noncommercial 1.0.0.** Impide el uso comercial
y no cuenta como «open source» según la OSI. Si el proyecto debe seguir siendo
software libre en sentido estricto, la alternativa es AGPL-3.0. Las
dependencias MIT, Apache-2.0 y BSD son compatibles con ambas. El texto completo
está en [LICENSE](./LICENSE). No es asesoramiento legal: revisa la licencia
elegida antes de publicar.
