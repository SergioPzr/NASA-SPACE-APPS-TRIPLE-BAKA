# GEMINI.md — WIÑAPAY: Instrucciones para retomar con Antigravity/Gemini
> **Para**: Cualquier instancia de Antigravity/Gemini que continúe este proyecto
> **Función**: Punto de entrada para retomar el trabajo sin perder contexto

---

## Contexto rápido

**WIÑAPAY** es una plataforma web interactiva para visualizar tendencias ambientales (NDVI) en Cusco, Perú, usando datos satelitales de la NASA. El objetivo es generar concientización en comunidades locales y organizaciones.

**Reto NASA**: "Be an Earth Systems Trend Detective!"
**Variable**: NDVI (MOD13Q1 v061, 250m) — una sola variable
**Período**: 2001–2025
**Stack**: Next.js + TypeScript + MapLibre GL + Supabase + Python pipeline

---

## Archivos maestros — leer siempre al retomar

```
CLAUDE.md                                   ← Para el diseñador (Claude Code)
GEMINI.md                                   ← Este archivo
Plan/ORDEN_IMPLEMENTACION.md                ← ⭐ LEER PRIMERO: orden y estado del proyecto
Informacion/00_RESUMEN_PROYECTO.md          ← Visión completa del proyecto
Informacion/01_ARQUITECTURA_Y_CONTRATOS.md  ← Contrato JSON + modelo de datos
Informacion/02_ESPECIFICACION_UX.md         ← Flujo UX detallado
Plan/PLAN_A_arquitectura_logica.md          ← Plan de implementación técnica
Plan/PLAN_B_datos_pipeline.md               ← Plan del pipeline Python + testimonios
Plan/PLAN_C_integracion.md                  ← Plan de integración
Prototipo 1/wiñapay-map/CLAUDE.md           ← Estado del prototipo (desactualizado)
Prototipo 1/wiñapay-map/NOTAS.md            ← Notas técnicas del prototipo
```

---

## Estado del proyecto al crear esta documentación

**Fecha**: 2026-11-15

### Lo que ya existe (prototipo):
- `Prototipo 1/wiñapay-map/`: Next.js app parcialmente funcional
  - Mann-Kendall + Sen + BH en `src/lib/evidencia.ts` ✅
  - APIs básicas: `/api/distritos`, `/api/manchas`, `/api/serie/:id`, `/api/testimonios` ✅
  - Manchas de PRUEBA (`es_de_prueba: true`) — falta MCD64A1 real
  - NDVI 2001–2025 procesado ✅
  - Sin diseño final (pendiente Claude Code)

### Lo que falta construir:
1. **Datos**: Pipeline Python completo (`Plan/PLAN_B_datos_pipeline.md`)
2. **Lógica**: Landing + mapa de concientización + dashboard con selector innovador (`Plan/PLAN_A_arquitectura_logica.md`)
3. **Diseño**: Todo el diseño visual (`CLAUDE.md` → Claude Code)
4. **Integración**: Verificar que los tres anteriores funcionan juntos (`Plan/PLAN_C_integracion.md`)

---

## Dependencias entre planes

```
Plan B (datos) ──→ Plan A (lógica) ──→ Diseño (Claude) ──→ Plan C (integración)
     ↑                   ↑                                         ↑
 Independiente      Necesita JSONs                          Verifica todo junto
                    de Plan B
```

Plan B puede ejecutarse en paralelo con Plan A, pero A necesita los JSONs de B para funcionar completamente.

---

## Comandos de inicio rápido

```bash
# Verificar estado del prototipo
cd "Prototipo 1/wiñapay-map"
npm install
npm run dev

# Ver qué datos ya existen
ls Data/                     # Archivos NASA
ls src/data/                 # JSONs generados
ls src/data/series/ 2>/dev/null  # Series por distrito

# Verificar que el build funciona
npm run build

# Pruebas
npm run test:unit
```

---

## Reglas irrenunciables del proyecto

1. **UNA sola variable**: NDVI. No añadir segunda variable.
2. **Lenguaje honesto**: p ≥ 0.05 → "aún no hay evidencia suficiente", NUNCA "no hay cambio".
3. **Datos de prueba siempre marcados**: `es_de_prueba: true` + banner visible en UI.
4. **Sin testimonios generados por IA**: solo testimonios reales con consentimiento.
5. **`prefers-reduced-motion` respetado** en todas las animaciones.
6. **Ninguna función crítica depende de una animación** (accesibilidad).
7. **El contrato JSON es el contrato**: cualquier cambio se comunica a todos los consumidores.

---

## Supabase — cuándo conectarlo

Supabase **NO es necesario** todavía para:
- Correr el pipeline Python (genera JSONs locales en `src/data/`)
- Correr el frontend en modo desarrollo (usa los JSONs como fallback automático)
- Todo el trabajo de diseño (Claude Code)

Supabase **SÍ es necesario** al llegar a:
1. **Insertar datos del pipeline en la BD** — al terminar el Plan B y querer persistir en PostgreSQL
2. **Activar testimonios con moderación** — el flujo pendiente → aprobado → visible requiere la tabla `testimonios` y Auth
3. **Despliegue a producción** — Vercel necesita las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Para conectar el MCP de Supabase en Antigravity**:
- Buscar "Supabase" en el Marketplace de plugins de Antigravity
- O configurar manualmente el MCP server en las settings
- Las variables de entorno van en `.env.local` (ver `.env.example` en el prototipo)

**El sistema funciona SIN Supabase**: todas las APIs tienen fallback a los JSONs de `src/data/`. El modo offline completo tampoco depende de Supabase.

---

## Contacto entre planes

Si un agente necesita comunicar algo al equipo de diseño:
→ Dejar nota en `Plan/NOTAS_COORDINACION.md` (crear si no existe)

Si un agente encuentra un error en los datos:
→ Documentar en `Plan/PLAN_B_datos_pipeline.md` al final, en sección "Errores conocidos"

Si un agente necesita cambiar el contrato JSON:
→ Actualizar `Informacion/01_ARQUITECTURA_Y_CONTRATOS.md` y notificar en `Plan/NOTAS_COORDINACION.md`
