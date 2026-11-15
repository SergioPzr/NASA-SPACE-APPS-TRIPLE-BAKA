# Plan C — Integración de lógica, datos y diseño
> **Responsable**: Coordinador de integración / Agente de integración
> **Prerequisito**: Leer Plan A, Plan B y los archivos de Informacion/
> **Este plan activa**: cuando el Plan A (lógica) y el Plan B (datos) tienen sus entregables listos

---

## Objetivo de este plan

Garantizar que la lógica del sistema (Plan A) + los datos procesados (Plan B) + el diseño visual (Claude Code) se integren sin romper ninguno de los tres.

La integración falla cuando:
- El diseño cambia el nombre de un elemento que la lógica necesita para saber en qué estado está
- Los datos retornan en un formato que el frontend no espera
- Una animación bloquea una función crítica
- El diseño añade o quita secciones que rompen el flujo de datos esperado

Este plan evita exactamente eso.

---

## 1. Contrato de integración frontend ↔ diseño

El diseñador (Claude Code) **puede modificar libremente**:
- Colores (dentro de la paleta definida)
- Tipografías (dentro de las fuentes definidas)
- Espaciados, márgenes, paddings
- Animaciones (dentro de las reglas de GSAP/CSS)
- Iconografía y elementos gráficos
- Fotografías y texturas
- El aspecto visual de los modales, tarjetas, botones
- Microinteracciones decorativas

El diseñador **NO puede modificar sin coordinación**:
- El número de puntos N en el mapa de concientización (actualmente 6–8)
- La lógica de qué trigger muestra el modal (siempre es: clic en punto → animación → modal)
- El orden del flujo: Landing → Mapa → Dashboard → Historias
- Los textos de datos que provienen de la base de datos (solo puede cambiar el contenedor)
- El estado `cicloCompleto` que dispara la transición al dashboard
- Los atributos `data-*` que usa la lógica para identificar elementos del DOM
- Los IDs de elementos que el Service Worker necesita
- La estructura del formulario de testimonios (campos obligatorios)

---

## 2. Interfaz HTML/CSS que la lógica espera

### 2.1 El mapa de concientización
El componente `MapaConcientizacion` necesita que el contenedor del mapa tenga:

```html
<!-- El diseñador da el estilo, la lógica necesita estos atributos -->
<div
  id="mapa-concientizacion"
  data-estado="activo"       <!-- activo | completado -->
  class="..."                <!-- El diseñador controla la clase -->
>
  <!-- El mapa MapLibre se monta aquí -->
</div>
```

Cada punto del mapa se renderiza como un marcador MapLibre con:
```js
// La lógica crea los marcadores así:
const marcador = new maplibregl.Marker({
  element: crearElementoPunto(punto),  // El diseñador diseña este elemento
  anchor: 'center'
})
// El elemento del punto DEBE tener:
// data-punto-id="{{id}}"  ← La lógica lo necesita para saber cuál se clicó
// data-revelado="false"   ← Cambia a "true" al revelar
// clase "punto-mapa"      ← Para el CSS del diseñador
```

### 2.2 El modal impactante
El modal usa Radix UI Dialog. El diseñador da el estilo al contenido:

```tsx
// La lógica controla open/onOpenChange
// El diseñador controla el aspecto visual del contenido
<Dialog.Root open={modalVisible} onOpenChange={setModalVisible}>
  <Dialog.Portal>
    <Dialog.Overlay className="modal-overlay" /> {/* Diseñador da estilo */}
    <Dialog.Content
      className="modal-contenido"               {/* Diseñador da estilo */}
      aria-describedby="modal-dato"
    >
      {/* El diseñador diseña esto, pero NO puede cambiar la estructura */}
      <p id="modal-dato" className="...">
        {datosModal.texto}  {/* Este texto viene del servidor */}
      </p>
      <Dialog.Close asChild>
        <button className="...">  {/* El diseñador da estilo */}
          {esUltimoModal ? "VER DATOS COMPLETOS" : "SIGUIENTE"}
        </button>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### 2.3 El selector de período
El selector de período expone estas props que la lógica consume:

```tsx
// Interfaz pública del SelectorPeriodo — NO cambiar sin coordinar
interface PropsSelectorPeriodo {
  anioMin: number          // 2001 (fijo)
  anioMax: number          // 2025 (fijo)
  desdeActual: number      // Estado actual
  hastaActual: number      // Estado actual
  manchas: Mancha[]        // Para los marcadores de eventos sobre la línea
  onChange: (desde: number, hasta: number) => void  // Callback obligatorio
  disabled?: boolean       // Para cuando hay cálculo en curso
}
```

El diseñador puede cambiar completamente el aspecto visual del selector, pero debe mantener:
1. Que el `onChange` se llame con exactamente dos enteros (año inicio, año fin)
2. Que el rango mínimo sea 5 años
3. Que los valores sean años enteros (2001, 2002, etc.), no meses ni fechas

### 2.4 La gráfica de NDVI
La gráfica es un SVG propio (ya existe en el prototipo como `Grafica.tsx`).

El diseñador puede:
- Cambiar colores de las líneas (usar los tokens)
- Cambiar el estilo del eje
- Ajustar el padding/spacing

El diseñador NO puede:
- Cambiar la escala del eje Y (siempre -0.2 a 1.0 para NDVI)
- Eliminar la línea de tendencia (es una información crítica)
- Eliminar el intervalo de confianza (IC 95%)
- Cambiar el formato del tooltip (debe mostrar fecha + valor + calidad)

---

## 3. Checklist de integración por etapa

### Etapa 1: Datos listos (Plan B entregado)
- [ ] `src/data/resultados.json` generado con datos reales o de prueba marcados
- [ ] `src/data/series/` con archivos `{ubigeo}_anual.json` para todos los distritos
- [ ] `src/data/manchas.json` generado (real o prueba, con `es_de_prueba` correcto)
- [ ] `src/data/distritos.json` con GeoJSON de todos los distritos de Cusco
- [ ] Validación scipy pasada (`scripts/07_validar_resultados.py` sin errores)

### Etapa 2: Lógica lista (Plan A entregado)
- [ ] API `/api/distritos` retorna GeoJSON con 200
- [ ] API `/api/manchas` retorna manchas con flag de prueba correcto
- [ ] API `/api/serie/:ubigeo` retorna contrato JSON completo con `frase_ciudadana`
- [ ] API `/api/resumen-provincia` retorna resumen agregado
- [ ] Mapa de concientización carga y muestra N=6 puntos
- [ ] Clic en punto → animación → modal con dato correcto
- [ ] Cierre del último modal → navega al dashboard
- [ ] Dashboard recalcula Mann-Kendall al cambiar período
- [ ] `npm run build` pasa sin errores TypeScript

### Etapa 3: Diseño integrado (Claude Code entregado)
- [ ] Paleta de tokens CSS aplicada en todo el sitio
- [ ] Tipografías DM Serif Display + DM Sans cargando correctamente offline
- [ ] Animación de entrada de la landing funciona (GSAP)
- [ ] Animación de agua en puntos funciona (GSAP)
- [ ] Selector de período con diseño innovador implementado
- [ ] `prefers-reduced-motion` respetado (verificar en DevTools)
- [ ] Modales: Esc cierra, foco atrapado, aria-describedby presente
- [ ] Mapa funciona en móvil (bottom-sheet en lugar de modal centrado)
- [ ] Banner de "datos de prueba" visible cuando corresponde
- [ ] `npm run build` pasa sin errores TypeScript (después del diseño)

### Etapa 4: Prueba de integración completa
- [ ] Flujo completo desktop: Landing → Mapa → 6 clics → Dashboard → Historias
- [ ] Flujo completo móvil: mismo flujo en viewport 390px
- [ ] Acceso directo desde landing a /historias funciona
- [ ] Modo avión: cargar datos, desconectar, navegar (usar DevTools → Network → Offline)
- [ ] Testimonio sin conexión: enviar, desconectar, reconectar, verificar que se envía
- [ ] Cambiar período en dashboard: gráfica se actualiza, frase ciudadana cambia
- [ ] Selector de territorio en dashboard: cambia los datos de todos los componentes
- [ ] Verificar en Chrome, Firefox, Safari (escritorio)
- [ ] Verificar en Chrome móvil

---

## 4. Proceso de handoff con el diseñador (Claude Code)

### 4.1 Qué entregar al diseñador antes de que empiece
1. Este archivo (`PLAN_C_integracion.md`)
2. `Informacion/02_ESPECIFICACION_UX.md` — el flujo exacto de la experiencia
3. `CLAUDE.md` en la raíz del proyecto (creado en el paso siguiente)
4. `Informacion/00_RESUMEN_PROYECTO.md` — contexto general
5. El prototipo funcionando en `/Prototipo 1/wiñapay-map/` como referencia

### 4.2 Qué debe entregar el diseñador al terminar
1. El proyecto con el diseño aplicado debe seguir pasando `npm run build`
2. Un archivo `NOTAS_DISENO.md` con:
   - Decisiones de diseño tomadas
   - Componentes nuevos creados
   - Dependencias añadidas (si alguna)
   - Cualquier restricción de lógica que descubrió

### 4.3 Cómo resolver conflictos diseño ↔ lógica
Si el diseñador necesita cambiar algo que afecta la lógica:
1. Documentar el cambio propuesto en `NOTAS_DISENO.md`
2. El coordinador evalúa si el cambio rompe algo
3. Si es seguro → se aprueba
4. Si no → el coordinador propone una alternativa

---

## 5. Protocolo de tokens de contexto agotado

Si cualquier agente de IA se queda sin tokens en medio del trabajo:

### Para retomar el trabajo de arquitectura (Plan A):
```
1. Leer: Informacion/00_RESUMEN_PROYECTO.md
2. Leer: Informacion/01_ARQUITECTURA_Y_CONTRATOS.md
3. Leer: Plan/PLAN_A_arquitectura_logica.md
4. Revisar: Prototipo 1/wiñapay-map/CLAUDE.md
5. Verificar: npm run build en el prototipo
6. Continuar desde la última fase completada del Plan A
```

### Para retomar el trabajo de datos (Plan B):
```
1. Leer: Informacion/00_RESUMEN_PROYECTO.md
2. Leer: Plan/PLAN_B_datos_pipeline.md
3. Revisar: ls Data/ para ver qué archivos existen
4. Revisar: src/data/ para ver qué JSONs ya están generados
5. Continuar desde el último paso completado del Plan B
```

### Para retomar el trabajo de diseño (Claude Code):
```
1. Leer: CLAUDE.md (en la raíz del proyecto)
2. Leer: Informacion/02_ESPECIFICACION_UX.md
3. Leer: Plan/PLAN_C_integracion.md (sección 2: "Interfaz que la lógica espera")
4. Revisar: src/app/globals.css para ver tokens CSS
5. Continuar desde donde quedó el diseño
```

### Para retomar la integración:
```
1. Leer: Plan/PLAN_C_integracion.md (sección 3: "Checklist de integración")
2. Ejecutar: npm run build — ver qué errores quedan
3. Ejecutar: npm test — ver qué pruebas fallan
4. Resolver errores en orden: datos → lógica → diseño
```

---

## 6. Configuración de GitHub Actions para CI

### Archivo: `.github/workflows/ci.yml`

```yaml
name: CI — Verificación de integración
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Instalar dependencias
        run: cd "Prototipo 1/wiñapay-map" && npm ci
      
      - name: Verificar TypeScript
        run: cd "Prototipo 1/wiñapay-map" && npm run build
      
      - name: Verificar contrato JSON
        run: |
          # Validar que src/data/resultados.json tiene la estructura esperada
          node -e "
            const r = require('./src/data/resultados.json');
            console.assert(r.variable === 'ndvi', 'Variable debe ser ndvi');
            console.assert(typeof r.resultados === 'object', 'Resultados debe ser objeto');
            console.log('✅ Contrato JSON válido');
          "
        working-directory: "Prototipo 1/wiñapay-map"
      
      - name: Pruebas unitarias (motor estadístico)
        run: cd "Prototipo 1/wiñapay-map" && npm run test:unit

  pipeline-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Instalar dependencias Python
        run: pip install pandas numpy xarray netCDF4 scipy pymannkendall statsmodels
      
      - name: Validar resultados del pipeline
        run: python scripts/07_validar_resultados.py
        working-directory: "Prototipo 1/wiñapay-map"
```

---

## 7. Verificación final antes del video de presentación

Checklist de 15 minutos antes de grabar:

**Funcionalidad (5 min)**:
- [ ] La landing carga en < 3 segundos
- [ ] El mapa de concientización carga y muestra los puntos
- [ ] Clic en un punto → animación → modal con dato
- [ ] Después de N clics → transición al dashboard
- [ ] El dashboard muestra gráfica de NDVI y frase ciudadana
- [ ] El selector de período funciona y recalcula
- [ ] La sección de historias muestra testimonios (aunque sean de prueba)

**Visual (3 min)**:
- [ ] La paleta de colores está aplicada correctamente
- [ ] DM Serif Display visible en títulos
- [ ] No hay textos en blanco sobre fondo blanco o verde sobre verde
- [ ] Las animaciones no están rotas

**Datos (3 min)**:
- [ ] Si hay datos de prueba: el banner está visible
- [ ] Los números mostrados son razonables (NDVI entre -1 y 1)
- [ ] Las frases ciudadanas tienen coherencia con el dato

**Accesibilidad básica (2 min)**:
- [ ] Tab por el mapa funciona
- [ ] Esc cierra el modal
- [ ] En modo avión: la app carga (si se probó antes con conexión)

**URL (2 min)**:
- [ ] La app está desplegada en URL pública (Vercel/Netlify/Cloudflare)
- [ ] La URL es accesible sin VPN
