# CLAUDE.md — WIÑAPAY: Instrucciones para el agente de diseño
> **Para**: Claude Code (agente de diseño visual)
> **Proyecto**: NASA Space Apps Challenge 2026 · Cusco, Perú
> **Tu rol**: Diseño visual y estética. NO tocar la lógica ni los datos (regla firme, ver "Fase 3" abajo).
> **Stack**: Next.js (App Router) + TypeScript + GSAP + MapLibre GL v5.x

---

## 🔒 Fase 3 (actual): SOLO DISEÑO — no se toca la lógica

Al crear o modificar interfaces, sigue @DESIGN.md **solo para la ubicación de los colores** (qué va sobre qué: lienzo oscuro con tipografía clara, bandas claras que cortan, un único color de acento para la acción). **Sus colores y su tipografía NO se usan** (nada de `#da291c` ni FerrariSans): la paleta y las fuentes de WIÑAPAY son las de este archivo.

**Reglas de la fase 3 (decididas por el equipo):**
1. **No se toca la lógica ni los datos.** Quedan fuera de alcance: `src/lib/**`, `src/app/api/**`, `src/data/**`, `scripts/**`, `supabase/**`, `public/sw.js` y `tests/**`. Tampoco cambian props, estado, nombres de clases/atributos que la lógica usa (`.etiqueta`, `.popup`, `.valor`, `.pista`, `.contador`, `data-primario`, etc.) ni textos que vienen de los datos.
2. **Solo se cambia lo visual**: CSS, estructura presentacional del JSX y tipografía/espaciado. Si un cambio visual exige tocar lógica, se detiene y se documenta en `NOTAS_DISENO.md`.
   - **Excepción autorizada (mapa del juego, `/mapa`)**: en `src/lib/mapa.ts` se puede tocar **solo la capa visual**: estilos de capas MapLibre (colores, halos, patrones, cielo/niebla), animación del chorro de agua y marcas visuales de lo ya apagado. Quedan intactos el flujo del juego, los estados (`fase`, `apagadas`, `popup`…), el progreso en `localStorage`, la interfaz del `Controlador` y los datos.
3. **Paleta base + espectros (actualizado por decisión del equipo, 15 nov)**: se mantienen los tokens base (`--bosque`, `--profundo`, `--salvia`, `--crema`, `--arena`, `--terracota`, `--dorado`, `--tinta`, `--apagado`, `--blanco`, `--terra-texto`) y se **permiten colores fuera de la paleta, degradados y fusiones** para dar más vida, siempre con significado y como tokens en `globals.css`:
   - Fuego: `--rojo-fuego`, `--brasa`, `--llama` · Verdor: `--musgo`, `--brote`, `--ocre` · Profundidad: `--noche` · Agua: `--agua`.
   - El texto sobre degradados debe cumplir contraste AA en **todo** el recorrido del degradado.
4. **Tipografía**: solo DM Serif Display + DM Sans. Sin fuentes nuevas.
5. **Eslogan**: el actual, «El territorio cambia. Hagámoslo visible.» (no usar «tiene memoria»).
6. **Sin animaciones nuevas por ahora**: el movimiento (GSAP, entradas, cortinas) se hace al final de la fase 3, en una pasada aparte. Se conservan las animaciones existentes del mapa; solo se garantiza `prefers-reduced-motion`.
7. **Testimonios**: se mantiene el estado vacío honesto actual. No se muestran testimonios semilla ni datos inventados.
8. **Concepto visual**: «Dos Cusco», el territorio partido en dos estados (con registros de fuego / sin ellos).

---

## ⚡ TL;DR para el diseñador (lee esto primero)

1. El proyecto está en `Prototipo 1/wiñapay-map/`
2. La lógica y los datos ya están parcialmente construidos — **no los romper**
3. Tu trabajo: aplicar paleta, tipografías, animaciones y hacer que sea visualmente impactante
4. Para entender QUÉ animar y CUÁNDO → leer `Informacion/02_ESPECIFICACION_UX.md`
5. Para saber qué puedes y no puedes cambiar → leer `Plan/PLAN_C_integracion.md` sección 2

---

## 📂 Archivos que DEBES leer antes de tocar cualquier cosa

```
Informacion/00_RESUMEN_PROYECTO.md        ← Contexto del proyecto
Informacion/02_ESPECIFICACION_UX.md       ← Flujo exacto de la experiencia
Plan/PLAN_C_integracion.md               ← Qué puedes/no puedes cambiar
Prototipo 1/wiñapay-map/NOTAS.md         ← Estado actual del prototipo
Prototipo 1/wiñapay-map/README.md        ← Instrucciones técnicas del prototipo
```

---

## 🎨 Identidad visual (ya decidida — úsala)

### Paleta de colores (tokens CSS en `globals.css`)
```css
:root {
  --bosque:   #173e32;  /* Fondo nav, fondo mapa, bandas oscuras */
  --profundo: #244d3c;  /* Distritos base, degradados */
  --salvia:   #a8b59a;  /* NDVI alto, texto suave sobre bosque */
  --crema:    #f4f0e3;  /* Fondo páginas, texto sobre bosque */
  --arena:    #e5d8bd;  /* Franjas, avisos, separadores */
  --terracota:#b9542d;  /* Manchas de fuego, alertas, interacción */
  --dorado:   #d9a441;  /* Acento, botones, foco */
  --tinta:    #252a26;  /* Texto principal */
  --apagado:  #5d645a;  /* Texto secundario */
  --blanco:   #fffdf7;  /* Superficies claras */
  
  /* Para texto sobre terracota (evitar terracota como color de texto directo): */
  --terra-texto: #9c4423;
}
```

**Contraste verificado WCAG AA**:
- crema/bosque: 10.4 ✅
- salvia/bosque: 5.5 ✅
- dorado/bosque: 5.3 ✅
- blanco/terracota: 4.7 ✅
- apagado/crema: 5.4 ✅

**Combinaciones que NO usar**:
- crema sobre terracota (4.2 ❌)
- dorado sobre blanco o arena (❌)
- terracota como color de texto (usar `--terra-texto`)

### Tipografía
```tsx
// Ya configurado en layout.tsx con next/font/google
import { DM_Serif_Display, DM_Sans } from 'next/font/google'

// DM Serif Display → títulos, eslogan, logo "wiñapay."
// DM Sans → texto de UI, datos, botones, navegación
```

### Estética buscada
La mezcla entre:
- Atlas interactivo
- Revista documental ambiental
- Plataforma moderna de datos

**NO** queremos: dashboard corporativo, PowerPoint institucional, página de gobierno antigua.

---

## 🏗️ Estructura de páginas que debes diseñar

```
/              ← Landing (el más importante visualmente)
/mapa          ← Mapa de concientización (el más impactante)
/dashboard     ← Dashboard detallado (gráficas + datos)
/historias     ← Historias y testimonios (editorial)
/metodologia   ← Transparencia (más simple)
```

---

## 🌊 Landing (`/`) — Tu trabajo principal aquí

### Hero section
- Fondo: topografía andina + contorno de Cusco
- Título grande: *"El territorio tiene memoria. Hagámosla visible."* (DM Serif Display)
- Subtexto en DM Sans
- Dos CTAs: "EXPLORAR EL MAPA" (primario, terracota) y "Ver historias" (secundario, link)
- Animación de entrada (GSAP): el contorno de Cusco se dibuja progresivamente con `drawSVG` o path animation

### Sección de 3 datos fijos
Tres bloques. Los textos son **estáticos** (no vienen de la BD), el diseñador puede elegir el layout pero NO cambiar los textos — provienen del backend.

### Acceso directo a Historias
Una sección visual diferenciada que permite ir a `/historias` sin pasar por el mapa. Idea: una cita de un testimonio real + botón.

---

## 🗺️ Mapa de concientización (`/mapa`) — El corazón de la experiencia

### Reglas de animación (OBLIGATORIAS)
1. **GSAP solo en pantallas institucionales** (landing, transiciones entre secciones). El flujo del testimonio usa solo CSS.
2. **Solo animar `transform` y `opacity`** (no width, height, top, left — para evitar reflow)
3. **`prefers-reduced-motion` siempre respetado** (fallback: fade sin movimiento)
4. **Ninguna función crítica depende de una animación** (el modal debe poder abrirse aunque la animación falle)
5. **Movimientos del mapa con MapLibre** (`flyTo`, `easeTo`) — no GSAP para el mapa

### La animación de agua (tu trabajo más creativo)
Cuando el usuario hace clic en un punto rojo:
- Una animación de "chorro de agua" o "onda de agua" "apaga" el punto
- El punto rojo → se transforma en dorado/verde (revelado)
- Duración: **máximo 1.5–2 segundos**
- Implementar con GSAP Timeline
- Fallback con `prefers-reduced-motion`: el punto cambia de color directamente (opacity transition CSS)

Sugerencia de implementación GSAP:
```js
// Escucha el evento 'punto-cliqueado' que emite la lógica
function animarAgua(elementoPunto) {
  const tl = gsap.timeline({
    onComplete: () => {
      // La lógica escucha este evento para saber cuándo mostrar el modal
      elementoPunto.dispatchEvent(new CustomEvent('animacion-completa'))
    }
  })
  
  tl.to('.efecto-agua', { opacity: 1, scale: 1, duration: 0.3 })
    .to('.efecto-agua', { y: -20, opacity: 0, duration: 0.8 })
    .to(elementoPunto, { backgroundColor: 'var(--dorado)', duration: 0.4 }, '-=0.3')
  
  // Respetar prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tl.clear()
    gsap.set(elementoPunto, { backgroundColor: 'var(--dorado)' })
    elementoPunto.dispatchEvent(new CustomEvent('animacion-completa'))
  }
}
```

### Los puntos en el mapa
- **Son exactamente 5** (N=5) — respaldo científico en `Informacion/02_ESPECIFICACION_UX.md`
- Siempre en distritos distintos, cubriendo 5 zonas geográficas (norte, sur, este, oeste, centro)
- Color inicial: `--terracota` (#b9542d) — representan zonas con eventos
- Animación pulsante: CSS `animation: pulso 2s infinite` (NO GSAP)
- Tamaño: suficientemente grande para ser clickeable en móvil (mínimo 44×44px táctil)
- Color revelado: `--dorado` (#d9a441) con una marca de "✓" o icono
- El elemento DEBE tener `data-punto-id` y clase `punto-mapa` (la lógica los necesita)
- **Indicador de progreso siempre visible** (no oculto en hover): "Zona X de 5"

### Modal impactante
- Fondo overlay: `--bosque` al 90% de opacidad
- El dato impactante: DM Serif Display, ≥ 48px en desktop
- Botón "SIGUIENTE" / "VER DATOS COMPLETOS" (el texto lo controla la lógica)
- Animación de entrada del modal: slide up + fade (CSS transition, no GSAP)
- En móvil: bottom-sheet (slide desde abajo)
- Cierre con `Esc` y `X` — implementado por Radix UI Dialog (no reimplementar)

---

## 📊 Dashboard detallado (`/dashboard`)

### Selector de período — Constelación orbital (estética NASA ⭐)

Los años (2001–2025) como estrellas en un arco semicircular. El usuario selecciona dos "astros" para definir el rango.

**Metáfora narrativa**: *"El satélite observó el territorio durante estos años"* — alineado con la estética espacial del concurso NASA.

La interfaz pública que DEBES mantener:
```tsx
// Componente: src/components/SelectorConstelacion.tsx
interface PropsSelectorConstelacion {
  anioMin: number          // Siempre 2001
  anioMax: number          // Siempre 2025
  desdeActual: number      // Estado actual
  hastaActual: number      // Estado actual
  manchas: Mancha[]        // Años con manchas → estrella de color --terracota
  onChange: (desde: number, hasta: number) => void  // OBLIGATORIO
  disabled?: boolean
}
```

Comportamiento que debes implementar:
- Cada año = estrella/punto luminoso (`--dorado` sobre fondo `--bosque`)
- Años con manchas de incendio = estrella en `--terracota`, levemente más brillante
- Clic en año de inicio → pulsa como pulsar (CSS animation)
- Clic en año de fin → el arco entre ambos se ilumina (`--dorado` → `--salvia` en gradiente)
- Años fuera del rango seleccionado: `opacity: 0.3`
- Rango mínimo 5 años → si intenta seleccionar menos, mostrar tooltip: *"Necesitamos al menos 5 años para calcular una tendencia válida"*
- En móvil: constelación se adapta a línea vertical de estrellas (scroll vertical)

### Gráfica de NDVI
La lógica ya tiene `Grafica.tsx` implementada. El diseñador puede:
- ✅ Cambiar colores de líneas (usar tokens)
- ✅ Cambiar estilo del eje y grid
- ✅ Ajustar padding y tamaño de fuentes
- ❌ NO cambiar la escala del eje Y (siempre -0.2 a 1.0)
- ❌ NO eliminar la línea de tendencia (obligatoria)
- ❌ NO eliminar el intervalo de confianza IC 95%

---

## 📖 Historias y testimonios (`/historias`)

Estética editorial. Similar a:
- Una revista de largo aliento
- Un reportaje documental
- NO un foro de comentarios ni red social

Categorías a mostrar (con tabs o filtros):
- Voces de la comunidad
- Investigaciones
- Reportajes
- Memoria del territorio

---

## ⚠️ Reglas que NO puedes romper

### Datos
1. **NUNCA** mostrar datos inventados o hardcoded que parezcan datos reales
2. Si hay datos de prueba: el banner `⚠️ Algunos datos son de prueba` debe ser VISIBLE
3. Los textos de los modales vienen del servidor — no hardcodear textos de datos

### Lógica
4. El flujo Landing → Mapa → Dashboard → Historias es FIJO (no reordenar)
5. Los N puntos del mapa son 6–8 (no cambiar sin coordinación)
6. El trigger del modal es SIEMPRE: clic en punto → animación → modal (no cambiar este orden)
7. El `onChange` del SelectorPeriodo SIEMPRE debe llamarse con dos enteros (años)

### Accesibilidad
8. `prefers-reduced-motion` respetado en TODAS las animaciones
9. Los modales deben tener foco atrapado mientras están abiertos
10. Los modales deben cerrarse con `Esc`
11. El mapa debe ser navegable por teclado (Tab entre distritos)
12. Contraste WCAG AA en TODOS los textos (ver paleta arriba)

### Técnico
13. `npm run build` debe pasar sin errores TypeScript después de tus cambios
14. Las fuentes deben seguir funcionando offline (ya configurado con `next/font/google`)
15. GSAP ya está instalado — no instalar otra biblioteca de animación sin coordinación

---

## 🛠️ Comandos para trabajar

```bash
# Instalar dependencias (hacerlo una sola vez)
cd "Prototipo 1/wiñapay-map"
npm install

# Desarrollo
npm run dev        # Inicia en http://localhost:3000

# Verificar que el build no está roto (hacer SIEMPRE antes de entregar)
npm run build

# Pruebas
npm run test:unit  # Pruebas del motor estadístico
npm test           # Pruebas Playwright (E2E)
```

---

## 🎯 Inspiración de diseño

Buscar referencias en la carpeta `Ideas diseno/` del proyecto. Estética: **minimalista, con peso visual, que respete la gravedad del tema ambiental**.

Referencia de mood:
- Sobrio pero no aburrido
- Colores naturales (ya definidos: verdes, terracota, dorado)
- Tipografía con personalidad en títulos, muy legible en datos
- Las fotografías (cuando se usen) deben ser documentales y reales, no stock genérico

---

## 🔄 Protocolo si se acaban los tokens

Si te quedas sin tokens en medio del trabajo:
1. Leer este archivo (CLAUDE.md)
2. Leer `Informacion/02_ESPECIFICACION_UX.md`
3. Leer `Plan/PLAN_C_integracion.md` sección 2 (lo que puedes/no puedes cambiar)
4. Revisar `src/app/globals.css` para ver el estado actual del CSS
5. Ejecutar `npm run build` para ver qué errores quedan
6. Continuar desde donde quedó el diseño

---

## 📋 Checklist de entrega del diseño

Cuando termines, verificar:
- [ ] `npm run build` pasa sin errores
- [ ] Paleta aplicada correctamente en todas las páginas
- [ ] DM Serif Display visible en títulos y logo
- [ ] DM Sans en texto de UI y datos
- [ ] Animación de entrada de la landing (GSAP) funciona
- [ ] Animación de agua en el mapa funciona
- [ ] `prefers-reduced-motion` desactiva las animaciones (verificar en DevTools)
- [ ] Modal accesible: Tab/Shift+Tab dentro del modal, Esc cierra
- [ ] Bottom-sheet en móvil (viewport 390px)
- [ ] Banner "datos de prueba" visible cuando hay datos de prueba
- [ ] Selector de período implementado con la interfaz correcta
- [ ] Gráfica de NDVI con tendencia e IC 95% visibles
- [ ] Ningún texto en color inválido (revisar lista de combinaciones NO usar)
- [ ] Crear `NOTAS_DISENO.md` con decisiones tomadas y dependencias añadidas
