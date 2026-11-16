# WIÑAPAY — Especificación de experiencia de usuario (UX)
> Este documento describe el flujo completo de interacción del usuario.
> El diseñador (Claude Code) debe leer este documento para entender QUÉ animar y CUÁNDO.
> El desarrollador debe implementar exactamente estos estados y transiciones.

---

## 1. Visión general del flujo

```
LANDING → MAPA (concientización) → TRANSICIÓN → DASHBOARD → HISTORIAS
                                                               ↑
                                                   Acceso directo desde landing
```

---

## 2. SECCIÓN A — Landing (Concientización inicial)

### Propósito
Captar la atención del usuario en menos de 10 segundos. Transmitir:
1. El proyecto es serio y tiene datos reales.
2. El territorio de Cusco está cambiando de forma preocupante.
3. Hay que descubrirlo juntos.

### Contenido obligatorio del hero
- **Logotipo**: "wiñapay." (DM Serif Display)
- **Eslogan principal**: *"El territorio tiene memoria. Hagámosla visible."*
- **Subtexto** (máx 2 líneas): "Datos satelitales de la NASA revelan décadas de cambios en la vegetación de Cusco. Descúbrelos."
- **CTA principal**: botón → "EXPLORAR EL MAPA"
- **CTA secundario**: enlace → "Ver historias de las comunidades" (salta directo a /historias)
- **Indicador de scroll** (sutil) hacia la sección de contexto

### Sección de contexto (debajo del hero)
Tres bloques breves con dato impactante + explicación de 1 línea:

| Bloque | Dato | Explicación |
|---|---|---|
| 🌿 | "24 años de datos" | NDVI registrado desde 2001 con satélites MODIS |
| 🔥 | "Manchas de área quemada visibles desde el espacio" | Detectadas con MCD64A1 de la NASA |
| 👥 | "Comunidades invisibles" | Sus historias conectadas con la evidencia científica |

> **Nota de implementación**: estos tres datos son FIJOS en la landing. No provienen de la base de datos. Son descriptivos del proyecto, no de un distrito específico.

### Acceso directo a Historias
Un bloque visual diferenciado (antes del mapa o al final de la landing) que permite ir directamente a testimonios/historias sin pasar por el mapa. Texto sugerido:
> *"¿Quieres escuchar primero a las personas? → Ver historias de las comunidades"*

---

## 3. SECCIÓN B — Mapa de concientización

### Lógica central
El mapa es el **motor de concientización**. No es un mapa informativo clásico: es una experiencia diseñada para generar impacto emocional antes de mostrar los datos técnicos.

### Estado inicial del mapa
- Muestra el contorno de la provincia de Cusco
- Aparecen **5 puntos rojos** distribuidos en posiciones reales de manchas de área quemada (o centroides de distritos con cambios significativos si MCD64A1 no está disponible)
- Los puntos pulsan suavemente (animación CSS, NO GSAP aquí)
- Indicador de progreso visible: "Zona 1 de 5" — el usuario sabe siempre cuánto falta
- Texto de instrucción: *"Haz clic en cualquier punto para descubrir qué ocurrió aquí"*

### Número de puntos (N = 5) — Respaldo científico
**El número es 5, no más.** Basado en:
- **Goal Gradient Effect** (Hull/Kivetz): la motivación es frágil al inicio del flujo. Con N > 6, el usuario percibe el final muy lejos y abandona en los primeros 2 pasos.
- **Endowed Progress Effect**: N=5 permite mostrar "Ya llevas el 20%" desde el primer clic, activando el sunk-cost que empuja al usuario a terminar.
- **Regla 3–5 de scrollytelling gamificado** (literatura UX/HCI): el rango donde se maximiza la tasa de completado sin fatiga cognitiva.
- **Miller's Law adaptado a carga emocional**: para interacciones con contenido impactante (no neutro), el umbral óptimo de items baja de 7 a ~5.

Cada punto representa un distrito diferente, cubriendo zonas geográficas distintas (norte, sur, este, oeste, centro de la provincia) para que el recorrido se sienta como un viaje territorial real.

El indicador de progreso debe mostrarse de forma sutil pero siempre visible — no oculto tras un hover.

### Interacción: clic en un punto
1. **Animación de agua** (GSAP): un chorro/onda de agua animada "apaga" el punto rojo → el punto cambia a color dorado/verde
2. **Modal impactante** aparece automáticamente (sin acción adicional del usuario)
3. Duración total de la animación: **1.5–2 segundos máximo**

### Modal impactante — especificación exacta
El modal debe:
- Aparecer centrado en pantalla (o como bottom-sheet en móvil)
- Tener fondo oscuro translúcido (`--bosque` al 90% de opacidad)
- Mostrar **UN SOLO DATO** en tipografía grande (DM Serif Display, ≥ 48px en desktop)
- El dato debe estar en lenguaje absolutamente simple (ver ejemplos abajo)
- Botón único: "SIGUIENTE" o icono de cierre → permite continuar

**Ejemplos de datos impactantes para los modales** (lenguaje ciudadano):

> 🌱 *"Este distrito perdió el equivalente a **400 canchas de fútbol** de vegetación verde entre 2001 y 2020."*

> 🔥 *"El verdor de esta zona lleva **15 años bajando** sin parar. Los satélites lo vieron todo."*

> 📉 *"En esta parte de Cusco, la vegetación cayó un **12 % en la última década**. Las comunidades lo sienten cada temporada."*

> 🌧️ *"Aquí hubo un incendio que arrasó una superficie visible desde el espacio. Los datos lo confirman."*

> ⚠️ *"La tendencia de pérdida de vegetación en este lugar es **estadísticamente significativa** al 95 %. No es coincidencia."*

**Reglas para los datos de los modales:**
- Cada modal debe mostrar UN dato real del distrito correspondiente al punto clicado
- Si el dato no es estadísticamente significativo → mostrar un dato de contexto (hectáreas afectadas, período analizado) en lugar de tendencia
- NUNCA mostrar el mismo texto dos veces en la misma sesión
- Los textos de los modales son generados por el servidor a partir de `frase_ciudadana` y los campos del resultado
- Se pueden añadir metáforas de escala (canchas de fútbol, etc.) en el servidor, basadas en `area_ha`

### Cierre del ciclo de puntos
Cuando el usuario hace clic en el **último punto**:
1. El modal final tiene un tono diferente — más esperanzador o de llamada a la acción
2. Aparece una animación de transición (el mapa se "abre" o hace zoom out) → navega a la siguiente sección
3. No requiere acción adicional del usuario — la transición ocurre automáticamente tras 2–3 segundos

---

## 4. TRANSICIÓN entre mapa y dashboard

Una animación de scroll automático con GSAP ScrollTrigger que lleva al usuario a la sección de dashboard detallado. Debe sentirse como abrir un libro o revelar algo que estaba oculto. Duración: 1–2 segundos.

---

## 5. SECCIÓN C — Dashboard detallado

### Propósito
Mostrar los datos con más profundidad. El usuario ya está "enganchado" emocionalmente — ahora le damos la evidencia.

### Estructura del dashboard

```
┌─────────────────────────────────────────────────┐
│  Selector de territorio (dropdown o mapa pequeño)│
│  "Estás viendo: [NOMBRE DISTRITO]"              │
├────────────────────┬────────────────────────────┤
│                    │  DATO PRINCIPAL             │
│  GRÁFICA NDVI      │  Pendiente: X por año      │
│  (serie temporal)  │  Significativo: Sí/No      │
│                    │  Período: 2001–2025         │
│                    │  [Frase ciudadana]          │
├────────────────────┴────────────────────────────┤
│  SELECTOR DE PERÍODO (innovador — ver abajo)    │
├─────────────────────────────────────────────────┤
│  MAPA MINIATURA con manchas del distrito        │
├─────────────────────────────────────────────────┤
│  ACCESO A HISTORIAS del distrito                │
└─────────────────────────────────────────────────┘
```

### Selector de período — Constelación orbital (estética NASA)

**Opción elegida: Constelación orbital** — perfecta para un concurso de la NASA.

**Concepto visual**:
Los años (2001–2025) se representan como **estrellas/planetas** en una órbita elíptica o semicircular. El usuario selecciona dos "astros" para definir el rango. El arco entre ellos se ilumina como una nebulosa o trayectoria orbital.

**Comportamiento**:
- Cada año es un punto luminoso (`--dorado` sobre fondo oscuro `--bosque`)
- Los años con manchas de incendio registradas tienen un punto levemente más brillante o de color `--terracota`
- El usuario hace clic en el año de inicio → se activa (pulsa como un pulsar)
- Luego clic en el año de fin → el arco entre ambos se ilumina (gradiente de `--dorado` a `--salvia`)
- Los años fuera del rango se atenúan (opacity 0.3)
- En móvil: la constelación se convierte en una línea vertical con estrellas (scroll vertical)

**Metáfora narrativa**: "El satélite observó el territorio durante estos años" — alineado perfectamente con la narrativa espacial de la NASA.

**Rango mínimo**: 5 años (para que Mann-Kendall tenga sentido estadístico — si el usuario selecciona menos, mostrar un tooltip: "Necesitamos al menos 5 años para calcular una tendencia válida").

> **Restricción**: El selector funciona en **años enteros** únicamente (2001, 2002, ..., 2025). No rangos de meses.

### Comportamiento al cambiar el período
1. Se recalculan Mann-Kendall + pendiente de Sen **en el navegador** (módulo JS de `evidencia.ts`)
2. La gráfica se anima suavemente al nuevo rango
3. La frase ciudadana se actualiza
4. El indicador de significancia cambia si corresponde
5. Todo ocurre sin recarga de página

### Mapa de manchas del distrito
Un mapa pequeño (MapLibre, sin mapa base) mostrando solo el contorno del distrito seleccionado y las manchas de área quemada en terracota. Al hacer hover sobre una mancha → tooltip con año y área en ha.

### Acceso a historias
Una sección al final del dashboard (o panel lateral) que muestra:
- Número de testimonios disponibles para ese distrito
- Preview de 1–2 testimonios (texto truncado)
- Botón: "VER TODAS LAS HISTORIAS DE [DISTRITO]" → navega a /historias?distrito=X

---

## 6. SECCIÓN D — Historias y testimonios

### Propósito
Humanizar los datos. Conectar la evidencia científica con las personas reales.

### Contenido
- Testimonios moderados y aprobados (estado: 'aprobado')
- Categorías: Voces de la comunidad / Investigaciones / Reportajes / Memoria territorial
- Filtro por distrito
- Formulario de envío de nuevos testimonios (con moderación previa)

### Acceso directo desde landing
La landing tiene un CTA que salta directamente a esta sección, sin necesidad de pasar por el mapa. Esto permite al usuario que ya conoce el proyecto ir directo a las historias.

---

## 7. Estados de la UI que deben implementarse

| Estado | Trigger | Acción UI |
|---|---|---|
| Mapa cargando | Inicial | Skeleton + spinner sutil |
| Punto sin datos | Clic en zona sin datos procesados | Toast: "Esta zona aún no tiene datos procesados" |
| Dato no significativo | Resultado p ≥ 0.05 | Frase: "Aún no hay evidencia suficiente" (NUNCA "no hay cambio") |
| Datos de prueba | `es_de_prueba: true` | Banner amarillo visible: "⚠️ Algunos datos son de prueba" |
| Sin conexión | Offline detectado | Banner: "Modo sin conexión — mostrando datos guardados" |
| Sin testimonios | Distrito sin testimonios aprobados | "No hay testimonios publicados para esta zona aún" |
| Todos los puntos revelados | Último modal cerrado | Transición automática al dashboard |

---

## 8. Accesibilidad (obligatorio)

- Todos los modales: cierre con `Esc`, foco atrapado dentro del modal mientras está abierto
- Animación de agua y transiciones: respetan `prefers-reduced-motion` (alternativa: fade simple)
- Mapa: navegable por teclado (Tab entre distritos)
- Contraste: verificado WCAG AA (ver paleta en `00_RESUMEN_PROYECTO.md`)
- Textos alternativos en todos los elementos visuales

---

## 9. Comportamiento offline

| Recurso | Estrategia |
|---|---|
| App shell (HTML/JS/CSS) | Cache-first (Service Worker) |
| GeoJSON distritos | Cache-first (IndexedDB) |
| Series NDVI | Cache-first (IndexedDB) |
| Resultados tendencia | Cache-first (IndexedDB) |
| Nuevos testimonios sin red | Cola local → sync al reconectar |
| Mapa base | No hay mapa base — solo GeoJSON propio (funciona offline) |
| GSAP | Cacheado por Service Worker |

---

## 10. Comportamiento en móvil

- Mapa: ocupa el 100% del viewport
- Modales → bottom-sheets (slide up desde abajo)
- Dashboard: layout vertical (gráfica arriba, datos abajo)
- Selector de período: rueda giratoria O nodos en línea vertical
- Mapa de manchas: colapsable/expandible
