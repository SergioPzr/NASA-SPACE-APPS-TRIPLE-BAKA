# Plan A — Arquitectura, lógica e implementación del sistema
> **Responsable**: Desarrollador principal / Agente de IA de arquitectura
> **Prerequisito**: Leer `Informacion/00_RESUMEN_PROYECTO.md` y `Informacion/01_ARQUITECTURA_Y_CONTRATOS.md`
> **Stack**: Next.js (App Router) + TypeScript + MapLibre GL v5.x + Supabase

---

## FASE 0 — Preparación del repositorio (1–2 horas)

### 0.1 Limpiar el prototipo existente
El prototipo en `Prototipo 1/wiñapay-map/` tiene la estructura base correcta. No tirarlo: **migrar y limpiar**.

Acciones:
- [ ] Verificar que `npm run dev` funciona
- [ ] Verificar que `npm run build` pasa sin errores
- [ ] Revisar que `src/lib/evidencia.ts` está correctamente implementado (Mann-Kendall + Sen + BH)
- [ ] Revisar que las APIs existentes retornan el contrato JSON correcto (ver `Informacion/01_ARQUITECTURA_Y_CONTRATOS.md`)
- [ ] Eliminar páginas de prueba o demos que no formen parte de la experiencia final

### 0.2 Variables de entorno
Crear `.env.local` a partir de `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...    # solo en servidor, nunca exponer al cliente
```

### 0.3 Dependencias que deben estar instaladas
```bash
npm install gsap @gsap/react         # Animación institucional
npm install maplibre-gl              # Mapa (ya existe, verificar v5.x)
npm install @radix-ui/react-dialog   # Modales accesibles
npm install idb                      # IndexedDB wrapper
```

---

## FASE 1 — Rutas y navegación (2–3 horas)

### 1.1 Estructura de rutas final
```
src/app/
├── page.tsx                 ← Landing
├── mapa/page.tsx            ← Mapa de concientización
├── dashboard/page.tsx       ← Dashboard detallado
├── historias/page.tsx       ← Historias y testimonios
├── metodologia/page.tsx     ← Transparencia de fuentes
├── layout.tsx               ← Navbar + fonts + SW
└── api/ (ver Fase 3)
```

### 1.2 Navbar permanente
Componente: `src/components/NavSitio.tsx` (ya existe, revisar)

Debe contener:
- Logo "wiñapay." (DM Serif Display)
- Links: Inicio / Explorar (mapa) / Historias / Metodología
- Botón destacado: "VER MAPA" → `href="/mapa"`
- Sticky en scroll
- En móvil: hamburger menu

### 1.3 Layout raíz
`src/app/layout.tsx` debe:
- Cargar fuentes `DM Serif Display` y `DM Sans` via `next/font/google`
- Registrar el Service Worker (`src/components/RegistroSW.tsx` ya existe)
- Incluir el NavSitio
- Definir los CSS tokens de la paleta en `:root`

---

## FASE 2 — Landing (Sección A)

### 2.1 Archivo: `src/app/page.tsx`
Es un Server Component que renderiza secciones:

```tsx
// Estructura de page.tsx
export default function LandingPage() {
  return (
    <>
      <HeroSection />           {/* Eslogan + CTAs */}
      <ContextSection />        {/* 3 datos de contexto fijos */}
      <AccesoHistoriasSection /> {/* Acceso directo sin pasar por mapa */}
      <PreviewMapaSection />    {/* Muestra de qué verán en el mapa */}
    </>
  )
}
```

### 2.2 HeroSection
- **Sin datos dinámicos** — todo estático (Server Component puro)
- El fondo visual (topografía andina) lo gestiona el diseñador
- CTA "EXPLORAR EL MAPA" → `href="/mapa"`
- CTA "Ver historias" → `href="/historias"`

### 2.3 ContextSection (3 datos fijos)
Datos hardcoded (no provienen de BD):
```ts
const DATOS_CONTEXTO = [
  { icono: "🌿", cifra: "24 años", texto: "de datos satelitales MODIS registrados desde 2001" },
  { icono: "🔥", cifra: "250 m", texto: "resolución espacial de los datos NDVI de la NASA" },
  { icono: "👥", cifra: "13 distritos", texto: "de Cusco con análisis de tendencia calculado" },
]
```

> Actualizar `13 distritos` con el número real una vez el pipeline procese todos los distritos.

---

## FASE 3 — APIs del backend

### 3.1 `/api/distritos` — GET
**Archivo**: `src/app/api/distritos/route.ts`

Retorna: GeoJSON FeatureCollection con todos los distritos de Cusco.

```ts
// Lógica:
// 1. Intentar desde Supabase (tabla territorios)
// 2. Fallback: leer src/data/distritos.json
// 3. Retornar con Cache-Control: public, max-age=86400
```

### 3.2 `/api/manchas` — GET
**Archivo**: `src/app/api/manchas/route.ts`

Parámetros opcionales: `?distrito_id=...`

Retorna: GeoJSON FeatureCollection de manchas.

**Regla**: Si alguna mancha tiene `es_de_prueba: true`, incluir en el response header:
`X-Datos-Prueba: true`

El cliente debe mostrar el banner de advertencia cuando recibe este header.

### 3.3 `/api/serie/[ubigeo]` — GET
**Archivo**: `src/app/api/serie/[ubigeo]/route.ts`

Parámetros query: `agregacion` (anual|mensual|seca), `desde` (año), `hasta` (año)

Retorna: Contrato JSON completo (ver `Informacion/01_ARQUITECTURA_Y_CONTRATOS.md`)

**Lógica**:
1. Leer la serie de Supabase (tabla `series`)
2. Si no hay conexión o error → leer del JSON estático correspondiente
3. Recalcular tendencia con los parámetros `desde`/`hasta`
4. Generar `frase_ciudadana` en el servidor
5. Retornar el contrato completo

**Generación de frase ciudadana** (en el servidor):
```ts
function generarFraseCiudadana(resultado: ResultadoTendencia, nombreDistrito: string): string {
  if (!resultado.significativo) {
    return `En ${nombreDistrito}, aún no hay evidencia estadística suficiente para confirmar una tendencia clara en la vegetación entre ${resultado.desde} y ${resultado.hasta}.`
  }
  
  const direccion = resultado.direccion === 'baja' ? 'perdiendo verdor' : 'recuperando vegetación'
  const pct = Math.abs(resultado.pendiente_anual * 100).toFixed(1)
  
  return `La vegetación de ${nombreDistrito} viene ${direccion} a un ritmo de ${pct}% por año desde ${resultado.desde}, con evidencia estadística al 95%.`
}
```

**Generación de dato impactante para modal** (también en el servidor):
```ts
function generarDatoModal(resultado: ResultadoTendencia, manchas: Mancha[], nombreDistrito: string): string {
  const areaTotal = manchas.reduce((sum, m) => sum + m.area_ha, 0)
  
  if (areaTotal > 0) {
    const canchas = Math.round(areaTotal / 0.714) // 1 cancha de fútbol ≈ 0.714 ha
    return `Esta zona registró incendios que afectaron una superficie equivalente a ${canchas.toLocaleString('es-PE')} canchas de fútbol. Los satélites de la NASA lo documentaron todo.`
  }
  
  if (resultado.significativo && resultado.direccion === 'baja') {
    const decadas = Math.round((resultado.hasta - resultado.desde) / 10)
    const pct = Math.abs(resultado.pendiente_anual * decadas * 10 * 100).toFixed(0)
    return `${nombreDistrito} perdió un ${pct}% de su cobertura vegetal en ${decadas} décadas. La tendencia es estadísticamente significativa.`
  }
  
  return `Los satélites monitorearon la vegetación de ${nombreDistrito} durante ${resultado.hasta - resultado.desde} años consecutivos. Aquí están los datos.`
}
```

### 3.4 `/api/resumen-provincia` — GET
Agrega los resultados de todos los distritos para el resumen final del dashboard.

Retorna:
```json
{
  "total_distritos": 13,
  "distritos_con_tendencia_baja_significativa": 8,
  "distritos_sin_evidencia": 3,
  "distritos_con_recuperacion": 2,
  "area_quemada_total_ha": 15420.5,
  "periodo": { "desde": 2001, "hasta": 2025 }
}
```

### 3.5 `/api/testimonios` — GET / POST
**GET**: Retorna testimonios con `estado = 'aprobado'`. Parámetro opcional: `territorio_id`.

**POST**: Recibe nuevo testimonio. Flujo:
1. Validar campos requeridos (texto, territorio_id, consentimiento_publicar)
2. Rate limiting: máximo 3 testimonios por IP por hora
3. Captcha: Cloudflare Turnstile (opcional P2)
4. Guardar con `estado = 'pendiente'`
5. Retornar 201 Created

---

## FASE 4 — Lógica del mapa de concientización

### 4.1 Componente principal: `MapaConcientizacion`
**Archivo**: `src/components/MapaConcientizacion.tsx`

Este componente gestiona todo el estado del mapa de concientización.

```ts
interface EstadoMapa {
  puntos: PuntoMapa[]           // Array de N puntos
  puntosRevelados: Set<string>  // IDs de puntos ya clicados
  puntoActivo: string | null    // ID del punto clicado actualmente
  modalVisible: boolean
  datosModal: DatoModal | null
  cicloCompleto: boolean        // true cuando todos los puntos revelados
}

interface PuntoMapa {
  id: string
  distrito_id: string
  nombre_distrito: string
  lat: number
  lng: number
  dato_modal: string    // Generado por el servidor al cargar
  revelado: boolean
}

interface DatoModal {
  texto: string         // El dato impactante
  distrito: string
}
```

### 4.2 Inicialización del mapa

Al montar el componente:
1. Cargar `/api/distritos` → renderizar contorno provincia
2. Cargar `/api/manchas` → obtener ubicaciones de manchas reales
3. Seleccionar **N=5** manchas representativas (una por zona geográfica: norte, sur, este, oeste, centro)
4. Para cada mancha, cargar `/api/serie/:ubigeo?agregacion=anual` → obtener dato modal
5. Renderizar puntos rojos pulsantes en las posiciones de las manchas
6. Mostrar indicador de progreso: "Zona 0 de 5"

### 4.3 Lógica de selección de N=5 puntos
```ts
function seleccionarPuntos(manchas: Mancha[], distritos: Distrito[]): PuntoMapa[] {
  // Dividir la provincia en 5 zonas geográficas (norte, sur, este, oeste, centro)
  // Para cada zona: seleccionar la mancha de mayor área, o el centroide del
  // distrito con tendencia más significativa si no hay manchas en esa zona
  // Garantizar 5 puntos en distritos distintos
  // N = 5 (respaldo científico: Goal Gradient + Endowed Progress + Miller's Law adaptado)
}
```

**Indicador de progreso** (Endowed Progress Effect):
```tsx
// El progreso se muestra SIEMPRE visible, no solo en hover
<div className="progreso-mapa" aria-label={`Zona ${revelados} de 5 explorada`}>
  {[0,1,2,3,4].map(i => (
    <span
      key={i}
      className={i < revelados ? 'revelado' : 'pendiente'}
      aria-hidden="true"
    />
  ))}
  <span className="progreso-texto">Zona {revelados} de 5</span>
</div>
```

### 4.4 Interacción: clic en punto
```ts
async function manejarClicPunto(puntoId: string) {
  if (estadoMapa.puntosRevelados.has(puntoId)) return // Ya revelado

  // 1. Marcar como activo
  setEstadoMapa(prev => ({ ...prev, puntoActivo: puntoId }))
  
  // 2. Disparar animación de agua (el componente de animación la escucha)
  emitirEventoAgua(puntoId)
  
  // 3. Esperar a que termine la animación (1500ms)
  await delay(1500)
  
  // 4. Mostrar modal con el dato
  const punto = estadoMapa.puntos.find(p => p.id === puntoId)
  setEstadoMapa(prev => ({
    ...prev,
    puntosRevelados: new Set([...prev.puntosRevelados, puntoId]),
    modalVisible: true,
    datosModal: { texto: punto.dato_modal, distrito: punto.nombre_distrito }
  }))
}
```

### 4.5 Cierre del ciclo
```ts
function cerrarModal() {
  const totalPuntos = estadoMapa.puntos.length
  const revelados = estadoMapa.puntosRevelados.size

  if (revelados >= totalPuntos) {
    // Todos revelados: activar transición al dashboard
    setEstadoMapa(prev => ({ ...prev, modalVisible: false, cicloCompleto: true }))
    // La transición la gestiona el componente padre o GSAP
    setTimeout(() => navegarAlDashboard(), 2500)
  } else {
    setEstadoMapa(prev => ({ ...prev, modalVisible: false, puntoActivo: null }))
  }
}
```

### 4.6 Persistencia del progreso
```ts
// Guardar progreso en localStorage (como en el prototipo)
const CLAVE_PROGRESO = 'winapay-progreso-v1'

// Al revelar un punto, guardar en localStorage
// Al cargar el mapa, restaurar el progreso
// IMPORTANTE: resetear el progreso si el usuario navega a /mapa desde la landing
```

---

## FASE 5 — Lógica del dashboard detallado

### 5.1 Componente: `DashboardDistrito`
**Archivo**: `src/components/DashboardDistrito.tsx`

Estado:
```ts
interface EstadoDashboard {
  distritoSeleccionado: string   // ubigeo
  periodoDesde: number           // año, default 2001
  periodoHasta: number           // año, default 2025
  agregacion: 'anual' | 'seca'   // default 'anual'
  datosActuales: ContratoJSON | null
  cargando: boolean
}
```

### 5.2 Recálculo al cambiar período
El cálculo Mann-Kendall se hace **en el navegador** usando `src/lib/evidencia.ts`:

```ts
// Al cambiar periodoDesde o periodoHasta:
async function recalcularTendencia() {
  setCargando(true)
  
  // La serie completa ya está en memoria (cargada al seleccionar el distrito)
  const serieFiltrada = datosCargados.serie.filter(
    p => parseInt(p.t.split('-')[0]) >= periodoDesde &&
         parseInt(p.t.split('-')[0]) <= periodoHasta
  )
  
  // Recalcular Mann-Kendall con la serie filtrada
  const resultado = calcularMannKendall(serieFiltrada)
  
  // Actualizar la UI
  setDatosActuales(prev => ({ ...prev, resultado }))
  setCargando(false)
}
```

### 5.3 Selector de período — Constelación orbital (estética NASA)
**Componente**: `src/components/SelectorConstelacion.tsx`

Los años (2001–2025) se muestran como estrellas en un arco semicircular. El usuario selecciona dos "astros" para definir el rango temporal.

```ts
interface PropsSelectorConstelacion {
  anioMin: number          // 2001
  anioMax: number          // 2025
  desdeActual: number      // Estado actual
  hastaActual: number      // Estado actual
  manchas: Mancha[]        // Años con manchas se muestran más brillantes (--terracota)
  onChange: (desde: number, hasta: number) => void  // Callback obligatorio
  disabled?: boolean
}
```

Comportamiento:
- Clic en estrella de inicio → pulsa como pulsar; clic en estrella de fin → arco iluminado
- El arco entre los dos años seleccionados se ilumina (`--dorado` → `--salvia`)
- Los años con manchas de incendio: punto `--terracota` más brillante
- Años fuera del rango: `opacity: 0.3`
- Rango mínimo: 5 años (tooltip si intenta seleccionar menos: "Necesitamos al menos 5 años para calcular una tendencia válida")
- En móvil: constelación → línea vertical de estrellas (scroll vertical)

---

## FASE 6 — Offline y Service Worker

### 6.1 Estrategia de caché
**Archivo**: `public/sw.js` (generado por Serwist o next-pwa)

Rutas y estrategias:
```
/ → Cache-first (HTML)
/mapa → Cache-first
/dashboard → Cache-first
/_next/static/** → Cache-first (JS/CSS)
/api/distritos → Stale-while-revalidate (actualizar en background)
/api/manchas → Stale-while-revalidate
/api/serie/* → Network-first con fallback a IndexedDB
```

### 6.2 IndexedDB (idb)
**Archivo**: `src/lib/idb.ts` (ya existe, verificar)

Stores:
```
series-cache: { key: ubigeo, value: ContratoJSON, timestamp: number }
testimonios-cola: { key: uuid, value: TestimonioPendiente }
```

---

## FASE 7 — Checklist de funcionalidad mínima

Antes de considerar el sistema listo para diseño:

- [ ] `/api/distritos` retorna GeoJSON válido
- [ ] `/api/manchas` retorna manchas con `es_de_prueba` correcto
- [ ] `/api/serie/:ubigeo` retorna contrato JSON completo con `frase_ciudadana`
- [ ] Cambiar período en el dashboard recalcula Mann-Kendall y actualiza la UI
- [ ] Los resultados coinciden con los de `scipy` (verificar con `tests/`)
- [ ] Los N=6 puntos del mapa cargan con sus datos
- [ ] Clic en punto → animación → modal con dato correcto
- [ ] Cierre del último modal → transición al dashboard
- [ ] App funciona en modo avión (con datos previamente cargados)
- [ ] Testimonio enviado → queda en `pendiente` → banner confirmación
- [ ] Banner "datos de prueba" visible cuando corresponde
- [ ] `prefers-reduced-motion` respetado (fallback sin animación)

---

## Notas para el agente que implemente este plan

1. **No tocar el diseño visual**: tokens CSS, tipografías, colores y animaciones son responsabilidad del diseñador. Tu trabajo es que la **lógica funcione** y los **datos lleguen correctos**.
2. **El contrato JSON es sagrado**: cualquier cambio en la estructura del contrato JSON debe comunicarse al equipo.
3. **Prueba de datos**: mantener `es_de_prueba: true` hasta tener MCD64A1 real. El banner de advertencia en la UI es obligatorio mientras esto sea así.
4. **Mann-Kendall en cliente y servidor deben dar los mismos resultados**: hay tests en `tests/` para verificar esto.
5. Si te quedas sin tokens, el estado del proyecto se puede resumir leyendo: `Informacion/00_RESUMEN_PROYECTO.md` + este archivo + el CLAUDE.md del prototipo.
