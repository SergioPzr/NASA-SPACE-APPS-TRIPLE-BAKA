# NOTAS_DISENO — Fase 3 (rediseño visual)

Alcance: **solo diseño**. No se tocó `src/lib/**`, `src/app/api/**`, `src/data/**`, `scripts/**`, `supabase/**`, `public/sw.js` ni `tests/**`.
Paleta, tipografías (DM Serif Display + DM Sans) y eslogan sin cambios. **Animaciones nuevas: ninguna todavía** (pasada final).
Referencia: `DESIGN.md` (Ferrari) usado solo para ubicar los colores: lienzo oscuro con texto claro, bandas claras que cortan, un único acento para la acción. Sus colores y su fuente NO se usan.

## Concepto: «Dos Cusco»
El mismo territorio partido en dos estados: a la izquierda (bosque) con las áreas quemadas registradas, a la derecha (crema) sin ellas. El titular está duplicado en dos capas recortadas por un borde irregular, para que cambie de color al cruzar; la copia es `aria-hidden` y el único `h1` real está en la capa oscura.

## Cambios por archivo
| Archivo | Qué cambió |
|---|---|
| `src/components/MapaPartido.tsx` (nuevo) | Dibuja distritos (INEI) y áreas quemadas (MCD64A1) reales leídos de `src/data/*.json`, como SVG decorativo. Cuenta distritos con fuego desde los datos (5 de 8). |
| `src/components/suavizar.ts` (nuevo) | Redondea los contornos de píxel (escalones) de las áreas quemadas con cortes de esquina (Chaikin). **Solo presentación**: `area_ha` y los datos no cambian. |
| `src/components/MapaApp.tsx` | **Único cambio fuera de CSS/markup**: pasa a `crearMapa` las manchas suavizadas (`useMemo`) para que en el mapa se vean como manchas y no como cuadrados. Los popups siguen usando los datos originales. Si se quiere revertir: usar `datos` en lugar de `datosMapa`. |
| `src/app/page.tsx` | Hero partido, pasos como tres palabras grandes, accesos como tres bandas, banda de honestidad, cifras, «Para quién es», cierre con el nombre a todo el ancho. Se quitaron los textos «01 · MIRA…» (ahora «Mira», «Comprende», «Actúa») y las flechas ↗; la etiqueta superior «CUSCO · PERÚ · NASA SPACE APPS 2026» se eliminó del hero (el dato sigue en el pie). |
| `src/app/landing.css` | Reescrito: bandas planas (bosque, salvia, arena, crema), botones rectos, sin tarjetas con borde ni sombra. |
| `src/app/globals.css` | Nav sólida y recta; HUD del mapa plano (contador grande abajo a la izquierda ≥1101 px); pista inferior como banda crema; popup crema con el NDVI en 52 px (`.datos li:first-child .valor`); hoja inferior a todo el ancho en móvil; panel final; páginas internas en estilo editorial (h1 hasta 7 rem, bloques planos, formularios con borde de 2 px). Token `--margen` global. |

## Decisiones y restricciones descubiertas
- El corte del hero está en `--corte: 56%` (no 50%) para que el borde cruce las dos líneas del titular y el mapa quede equilibrado.
- El hero no tiene el subtexto ni los botones dentro de las capas partidas: en móvil el corte vertical los partiría. Van en una banda oscura propia debajo.
- La retícula de puntos sobre los distritos evoca los píxeles de 250 m de MODIS; es decorativa y no representa datos.
- `Contornos.tsx` quedó sin uso en la portada (no se borró).
- En capturas con Chromium por software aparece un rectángulo crema fantasma sobre el mapa; no ocurre en Firefox ni en el DOM (se verificó con `elementFromPoint`): es un artefacto del renderizador, no del diseño.

## Segunda vuelta: interactividad y movimiento (GSAP)
Feedback del equipo: «parece aburrido, queremos más interactivo». Referencias revisadas en su código real (Euveka: GSAP+ScrollTrigger; Serotoninn: GSAP+Lenis+Barba, cursor con `mix-blend-mode`; Cregg: GSAP+shader WebGL; Union: View Transitions; Revitin: cintas y Swiper). **Sin dependencias nuevas**: GSAP 3.15 ya trae SplitText, DrawSVG y ScrollTrigger (gratis desde 3.13). Lenis no se añadió (requiere coordinación según CLAUDE.md).

| Pieza | Archivo | Qué hace |
|---|---|---|
| Corte «Dos Cusco» interactivo | `portada/AnimacionesPortada.tsx`, `landing.css` | El borde rasgado sigue al cursor o al dedo; al bajar, el lado con fuego cubre la pantalla. Se mueve **solo con transform** (la capa avanza y su interior retrocede). Control con teclado (`input range`) que aparece al recibir foco. |
| Entrada del hero | ídem | El corte se abre, Cusco se dibuja (DrawSVG), aparecen las manchas y el titular sube letra a letra (SplitText; las dos copias se animan igual). |
| Brasas | ídem | Partículas doradas que suben desde las áreas quemadas reales; se pausan fuera de pantalla. |
| Historia «Lo que vio el satélite» | `portada/HistoriaSatelite.tsx`, `portada/datosPortada.ts` | Visual fijo + 4 escenas con **datos reales**: 8 distritos y 25 años · 16 áreas quemadas y su superficie · línea NDVI provincial 2001–2025 con recta de Sen · veredicto por distrito con la misma regla `evaluar()`. El fondo cambia: bosque → ceniza → crema → salvia. Cifras que cuentan. |
| Cinta de principios | `page.tsx`, `AnimacionesPortada.tsx` | Banda terracota infinita; acelera y cambia de sentido con el scroll. |
| Colores con el scroll | `AnimacionesPortada.tsx` | Pasos, honestidad y «Para quién» toman su color al entrar en pantalla (también si se llega saltando). |
| Seguidor del cursor | ídem | Círculo dorado con la acción («Abrir el mapa», «Ver la tabla», «Contar lo que ves») sobre los accesos; solo con ratón. |
| Entradas por sección | ídem | Títulos por líneas (SplitText) y partes escalonadas; el nombre del cierre sube letra a letra. |
| Transición entre páginas | `components/Transicion.tsx`, `layout.tsx` | Mancha terracota que crece desde el clic; navega siempre (respaldo a los 900 ms) y no intercepta nada con movimiento reducido. |

**Accesibilidad y respaldo**: con `prefers-reduced-motion` o «Modo ligero» (misma clave que el mapa) no hay animaciones automáticas: el hero queda quieto, la historia muestra mapa, manchas, gráfica y veredictos a la vez, y la cinta se vuelve una lista. El corte sigue respondiendo al usuario sin suavizado. Verificado con capturas en 1440 px, 390 px y movimiento reducido; 0 errores de consola; navegación y «Atrás» comprobados.

**Decisiones a revisar**:
- Se quitó la sección de cifras (8 distritos, 25 años, 250 m, 3 medidas): la historia ya cuenta esos números en movimiento.
- La gráfica de la historia usa **escala ampliada y rotulada** (0.40–0.48) para que se vea la variación; la regla de eje −0.2 a 1.0 del CLAUDE.md se mantiene para `Grafica.tsx` del dashboard.
- El pie ahora cita MCD64A1 entre las fuentes, porque las manchas ya son reales.

## Mapa del juego (`/mapa`): capa visual
Excepción autorizada en `CLAUDE.md`: se tocó **solo la parte visual** de `src/lib/mapa.ts`; el flujo del juego, los estados, el progreso y la interfaz del `Controlador` quedan igual.
- **Retícula de píxeles** sobre los distritos (`fill-pattern` generado en código, sin archivos nuevos: funciona sin conexión).
- **Halo de brasa** dorado bajo las manchas, además del brillo existente.
- **Lo apagado queda marcado**: al apagar una mancha aparece un parche salvia con borde dorado («mancha ya explorada»), en vez de desaparecer; se restaura con el progreso guardado y se limpia con «Reiniciar». Es una marca de exploración, no representa recuperación real.
- **Ondas de agua** al impacto del chorro (solo fuera de «Modo ligero»).
- **Horizonte con niebla** al inclinar la cámara (`setSky`, se omite si la versión no lo admite) y viñeta alrededor del mapa.
- **Etiquetas de distrito** en DM Serif Display; **leyenda** (área quemada, mancha explorada, escala NDVI dorado→salvia) visible solo en la vista de la provincia.
- Verificado en Chromium (móvil y escritorio) y Firefox, sin errores de consola; 15/15 pruebas unitarias.
- **El mapa se dibuja al entrar**: los bordes se trazan como una pluma (`line-gradient` con `line-progress` sobre una copia de los bordes con `lineMetrics`), luego se rellenan los distritos uno a uno, aparecen curvas y etiquetas y por último se encienden las manchas. Al volver en la misma sesión se dibuja en versión algo más corta y sin vuelo de cámara. Con «Modo ligero» no hay trazo.
  - Ojo (desarrollo): en `npm run dev`, React StrictMode ejecuta dos veces el efecto de `MapaApp`, que marca la intro como «ya vista» en `sessionStorage`; por eso en desarrollo casi siempre se ve la versión corta. En producción no pasa. No se tocó (es lógica).
- **Apagado del fuego**: tres hilos de agua en arco con corriente que fluye, salpicadura, tres ondas y vapor; el fuego parpadea antes de extinguirse y deja la mancha revelada. Dura ≈1,6–2 s (dentro del máximo del CLAUDE.md).
- **Popup más suave**: entrada sin rebote (sube y aparece), partes escalonadas, los números cuentan al revelarse (el texto final es siempre el dato real) y la gráfica se dibuja más despacio. En «Modo ligero» solo fundidos cortos.
- No se resolvió: Wanchaq, Poroy y San Sebastián no tienen manchas y aparecen «exploradas» desde el inicio (dato, no diseño).

## Color con vida (decisión del equipo: «los colores son muy planos, juega más»)
Se amplió la paleta con **espectros con significado** (tokens en `globals.css`): fuego `--rojo-fuego` `--brasa` `--llama`, verdor `--musgo` `--brote` `--ocre`, profundidad `--noche`, agua `--agua`; y dos degradados reutilizables `--grad-fuego` y `--grad-verdor`. Contraste medido: musgo/crema 4.37 y ocre/crema 3.95 (solo en títulos grandes), blanco sobre brasa 3.38 (texto grande de la cinta), crema/noche 13.4.
- **Portada**: el lado del fuego del hero arde alrededor del mapa (resplandor rojo → bosque → noche) y el lado vivo tiene luz de día; manchas con degradado de llama; brasas en dos tonos; distritos vivos de salvia a brote; los verbos de los pasos en degradado (verdor, dato, fuego); accesos con profundidad; cinta con el calor de punta a punta; luces de esquina en «Honestidad» y «Para quién»; cierre de noche con un brote de verde y el punto final en llama; botón dorado → llama; transición con mancha de fuego.
- **Historia**: resplandor de brasa en «Dónde ardió», de verdor en «Lo que podemos afirmar»; la línea NDVI cambia de color con su valor (musgo arriba, ocre abajo).
- **Mapa del juego**: lienzo transparente sobre un fondo con profundidad; **calor** real de cada incendio con una capa de mapa de calor (llama → rojo) que se apaga cuando apagas la mancha; escala de verdor de tres tonos (dorado → salvia → brote) también en la leyenda.
- **Popup y páginas**: franja de estado arriba (fuego mientras hay focos, verdor al completar), NDVI grande en degradado, botón «Apagar» en rojo fuego; títulos de páginas internas en degradado bosque → musgo y fondo con luz cálida.

## Pendiente (fuera de la fase de diseño visual)
- **Datos**: `acerca/page.tsx` aún dice que las manchas de fuego son de prueba, pero `manchas.json` ya trae MCD64A1 real (`es_de_prueba: false`). Texto dependiente de datos: no se tocó.
- **Pruebas e2e** (`tests/e2e`): `landing.spec.ts` espera el aviso de «manchas de prueba» y `mapa.spec.ts` asume manchas en Wanchaq (que tiene 0). Estaban desactualizados antes de la fase 3. No se tocaron por la regla de no editar tests.
- **Gráfica del popup/resumen**: sigue con eje autoescalado y sin IC 95 % (lógica/datos).
- **Popup**: Radix `Dialog` con `modal={false}` no atrapa el foco (lógica).
- **Animaciones** (al final): cortina del hero, entradas escalonadas, brasas; todas con `prefers-reduced-motion`.
- **`npm run build`** no se corrió durante el trabajo para no pisar el servidor de desarrollo en marcha; correr antes de entregar. `tsc --noEmit` y las 15 pruebas unitarias pasan.
- Verificar con Safari real y teléfono real.
