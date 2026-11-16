# CLAUDE.md — WIÑAPAY: Restricciones para el agente de diseño
> **Para**: Claude Code (agente de diseño visual)
> **Proyecto**: NASA Space Apps Challenge 2026 · Cusco, Perú
> **Tu rol**: Rediseño visual. Tienes libertad total en el diseño EXCEPTO por las reglas de esta lista.
> **Stack**: Next.js (App Router) + TypeScript + GSAP + MapLibre GL v5.x

---

## 🔒 Regla única y absoluta: NO tocar la lógica ni los datos

Tu trabajo es el diseño visual. La lógica y los datos ya están construidos y funcionando. No los romper.

---

## ❌ Archivos y carpetas fuera de tu alcance (no modificar)

```
src/lib/**                  ← Lógica estadística y de datos (Mann-Kendall, repo, mapa)
src/app/api/**              ← Rutas API del backend
src/data/**                 ← JSONs generados por el pipeline Python (datos reales NASA)
scripts/**                  ← Scripts Python del pipeline
supabase/**                 ← Configuración de base de datos
public/sw.js                ← Service Worker (modo offline)
tests/**                    ← Pruebas unitarias y E2E
```

---

## ❌ Comportamientos que NO puedes cambiar

1. **El flujo de páginas es fijo**: Landing → Mapa → Dashboard → Historias (no reordenar ni eliminar pasos)
2. **El trigger del modal es fijo**: clic en punto → animación → modal (no cambiar este orden)
3. **Los textos de datos vienen del servidor** — no hardcodear datos reales ni inventarlos
4. **Si hay datos de prueba**: el banner `⚠️ Algunos datos son de prueba` debe permanecer visible
5. **El `onChange` del SelectorPeriodo** siempre recibe dos enteros (años) — no cambiar su interfaz
6. **La escala del eje Y de la gráfica NDVI** es siempre -0.2 a 1.0 (no cambiar)
7. **La línea de tendencia e IC 95%** de la gráfica son obligatorias (no eliminar)

---

## ❌ Accesibilidad — reglas irrompibles

- `prefers-reduced-motion` respetado en TODAS las animaciones
- Los modales deben tener foco atrapado mientras están abiertos y cerrarse con `Esc`
- Contraste WCAG AA en todos los textos
- El mapa debe ser navegable por teclado

---

## ⚙️ Reglas técnicas

- `npm run build` debe pasar sin errores TypeScript después de tus cambios
- GSAP ya está instalado — coordinar antes de agregar otra librería de animación
- Las fuentes deben seguir funcionando offline (`next/font/google` ya configurado)

---

## ✅ Lo que SÍ puedes hacer libremente

- Cualquier decisión visual: colores, tipografías, layouts, animaciones, componentes UI
- Restructurar el JSX de las páginas siempre que no toques la lógica
- Crear nuevos componentes visuales
- Cambiar o reemplazar cualquier estilo CSS/Tailwind existente
- Referenciar las imágenes en `Ideas diseno/` para inspirarte
- Leer `Informacion/02_ESPECIFICACION_UX.md` para entender el flujo de experiencia

---

## 🛠️ Comandos

```bash
cd "Prototipo 1/wiñapay-map"
npm install        # Solo la primera vez
npm run dev        # http://localhost:3000
npm run build      # Verificar antes de entregar
npm run test:unit  # Pruebas del motor estadístico
```

---

## 📋 Protocolo si se acaban los tokens

1. Leer este archivo (CLAUDE.md)
2. Leer `Informacion/02_ESPECIFICACION_UX.md` para entender el flujo
3. Ejecutar `npm run build` para ver qué errores quedan
4. Continuar desde donde quedó el diseño
