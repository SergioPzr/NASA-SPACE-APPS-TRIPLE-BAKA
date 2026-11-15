import { gsap } from 'gsap';
import type { LngLat, Map as MapaGL, MapMouseEvent } from 'maplibre-gl';
import { centro, distPuntoPoligono } from './geo';
import type { Datos, Distrito, Mancha } from './tipos';

export type Fase = 'cargando' | 'intro' | 'provincia' | 'entrando' | 'zona' | 'volviendo' | 'final';
export type PopupModo = 'cerrado' | 'parcial' | 'completa';

export interface EstadoMapa {
  fase: Fase;
  zona: string | null;
  sel: number | null;
  ocupado: boolean;
  apagadas: number[];
  popup: PopupModo;
  ligero: boolean;
}

export interface Controlador {
  getEstado(): EstadoMapa;
  suscribir(f: () => void): () => void;
  alMover(f: () => void): () => void;
  anclajePx(): { x: number; y: number } | null;
  entrarZona(id: string): Promise<void>;
  volver(): Promise<void>;
  elegirMasCercana(lngLat?: [number, number]): void;
  apagar(): Promise<void>;
  cerrarPopup(): void;
  reiniciar(): Promise<void>;
  setLigero(v: boolean): void;
  centroPx(id: string): { x: number; y: number } | null;
  proyectar(lng: number, lat: number): { x: number; y: number } | null;
  destruir(): void;
}

export interface Opciones {
  contenedor: HTMLElement;
  agua: SVGSVGElement;
  datos: Datos;
  rapido: boolean;
  ligero: boolean;
}

export const CLAVE_PROGRESO = 'winapay-progreso-v1';

function leerProgreso(validos: Set<number>): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_PROGRESO) || 'null');
    if (v && Array.isArray(v.apagadas)) return v.apagadas.filter((id: number) => validos.has(id));
  } catch { /* sin almacenamiento */ }
  return [];
}
function guardarProgreso(apagadas: number[]) {
  try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify({ apagadas })); } catch { /* sin almacenamiento */ }
}

export function crearMapa(op: Opciones): Controlador {
  const { datos, agua } = op;
  const DIST = datos.distritos.features;
  const MANCHAS = datos.manchas.features;
  const dPorId = new Map(DIST.map((f) => [f.properties.id, f]));
  const mPorId = new Map(MANCHAS.map((m) => [m.id, m]));
  const manchasDe = (id: string) => MANCHAS.filter((m) => m.properties.distrito === id);

  let estado: EstadoMapa = {
    fase: 'cargando', zona: null, sel: null, ocupado: true,
    apagadas: leerProgreso(new Set(MANCHAS.map((m) => m.id))), popup: 'cerrado', ligero: op.ligero,
  };
  const subs = new Set<() => void>();
  const movs = new Set<() => void>();
  const set = (p: Partial<EstadoMapa>) => { estado = { ...estado, ...p }; subs.forEach((f) => f()); };

  const apagada = (id: number) => estado.apagadas.includes(id);
  const cuentaZona = (id: string) => manchasDe(id).filter((m) => apagada(m.id)).length;
  const zonaExplorada = (id: string) => cuentaZona(id) === manchasDe(id).length;
  const totalExploradas = () => DIST.filter((f) => zonaExplorada(f.properties.id)).length;

  let muerto = false;
  let map: MapaGL | null = null;
  let anclaje: [number, number] | null = null;
  let ultimoClic: { x: number; y: number } | null = null;
  let hoverId: string | null = null;
  const aVals = new Map<number, number>();
  const vivos = new Set<gsap.core.Animation>();
  const T = <A extends gsap.core.Animation>(a: A): A => { vivos.add(a); return a; };
  const D = (s: number) => (estado.ligero ? s * 0.35 : s);
  const esperar = (tw: gsap.core.Animation) => new Promise<void>((ok) => { tw.eventCallback('onComplete', ok); });

  const css = getComputedStyle(document.documentElement);
  const tok = (n: string) => css.getPropertyValue(n).trim();
  const C = {
    bosque: tok('--bosque'), profundo: tok('--profundo'), salvia: tok('--salvia'), arena: tok('--arena'), dorado: tok('--dorado'), terracota: tok('--terracota'),
    texto: tok('--texto'), base: tok('--base-distrito'), hover: tok('--hover-distrito'),
  };

  const bboxProv = DIST.reduce(
    (b, f) => {
      const [x0, y0, x1, y1] = f.properties.bbox;
      return [Math.min(b[0], x0), Math.min(b[1], y0), Math.max(b[2], x1), Math.max(b[3], y1)];
    },
    [Infinity, Infinity, -Infinity, -Infinity],
  );

  const colorExplorada = (id: string) => {
    const v = datos.resultados.distritos[id].agregaciones.media_anual.media;
    const t = Math.max(0, Math.min(1, (v - 0.2) / (0.5 - 0.2)));
    return gsap.utils.interpolate(C.dorado, C.salvia, t) as string;
  };

  /* ───────────── Cámara ───────────── */
  const movil = () => innerWidth <= 640;
  const camProvincia = () => {
    const c = map!.cameraForBounds([[bboxProv[0], bboxProv[1]], [bboxProv[2], bboxProv[3]]], { padding: { top: 120, bottom: 110, left: 70, right: 70 }, bearing: 0, pitch: 0 })!;
    return { lng: (c.center as LngLat).lng, lat: (c.center as LngLat).lat, zoom: c.zoom!, pitch: 0, bearing: 0 };
  };
  const camZona = (id: string) => {
    const [x0, y0, x1, y1] = dPorId.get(id)!.properties.bbox;
    const c = map!.cameraForBounds([[x0, y0], [x1, y1]], { padding: { top: 140, bottom: 130, left: 100, right: 100 }, bearing: 0, pitch: 0 })!;
    return { lng: (c.center as LngLat).lng, lat: (c.center as LngLat).lat, zoom: c.zoom! + 0.3, pitch: estado.ligero ? 0 : 58, bearing: estado.ligero ? 0 : -18 };
  };
  const volarA = (dest: { lng: number; lat: number; zoom: number; pitch: number; bearing: number }, dur = 2.2, ease = 'power3.inOut') => {
    const c = map!.getCenter();
    const o = { lng: c.lng, lat: c.lat, zoom: map!.getZoom(), pitch: map!.getPitch(), bearing: map!.getBearing() };
    return T(gsap.to(o, {
      ...dest, duration: D(dur), ease,
      onUpdate: () => map!.jumpTo({ center: [o.lng, o.lat], zoom: o.zoom, pitch: o.pitch, bearing: o.bearing }),
    }));
  };
  const quitarPadding = () => map!.jumpTo({ padding: { top: 0, right: 0, bottom: 0, left: 0 } });
  const enfocarMovil = () => {
    if (!movil() || !anclaje) return;
    map!.easeTo({ center: anclaje, padding: { top: 120, left: 0, right: 0, bottom: Math.round(innerHeight * 0.52) }, duration: D(600) });
  };
  const liberarMovil = () => {
    if (movil()) map!.easeTo({ padding: { top: 0, left: 0, right: 0, bottom: 0 }, duration: D(400) });
  };

  /* ───────────── Estado de dibujo ───────────── */
  const pintarDistrito = (id: string, hover = false) => {
    const f = dPorId.get(id)!;
    map!.setFeatureState({ source: 'dist', id: f.id }, { color: zonaExplorada(id) ? colorExplorada(id) : hover ? C.hover : C.base });
  };
  const setA = (id: number, v: number) => {
    aVals.set(id, v);
    map!.setFeatureState({ source: 'manchas', id }, { a: v });
  };
  const curvasOp = { v: 0 };
  const setCurvasOp = (v: number) => { curvasOp.v = v; map!.setPaintProperty('curvas', 'line-opacity', v); };
  const animar = (o: Record<string, number>, to: Record<string, number>, dur: number, onUpdate: () => void) =>
    T(gsap.to(o, { ...to, duration: D(dur), ease: 'power2.out', onUpdate }));

  /* ───────────── Etiquetas (botones accesibles sobre el mapa) ───────────── */
  const etiquetas = new Map<string, HTMLButtonElement>();
  const refrescarEtiquetas = () => {
    DIST.forEach((f) => {
      const id = f.properties.id;
      const pend = manchasDe(id).length - cuentaZona(id);
      const b = etiquetas.get(id);
      if (!b) return;
      const txt = pend > 0 ? `${pend} ${pend === 1 ? 'foco' : 'focos'}` : 'explorada';
      b.querySelector('small')!.textContent = txt;
      b.classList.toggle('explorada', pend === 0);
      b.setAttribute('aria-label', `${f.properties.nombre}: ${txt}. Entrar al distrito`);
    });
  };
  const mostrarEtiquetas = (v: boolean, dur = 0.5) => {
    const bs = [...etiquetas.values()];
    bs.forEach((b) => { b.disabled = !v; b.tabIndex = v ? 0 : -1; });
    T(gsap.to(bs, { opacity: v ? 1 : 0, duration: D(dur), stagger: v ? 0.06 : 0 }));
  };

  /* ───────────── Capas ───────────── */
  function crearCapas() {
    const m = map!;
    m.addSource('dist', { type: 'geojson', data: datos.distritos as never });
    m.addSource('curvas', { type: 'geojson', data: datos.curvas as never });
    m.addSource('manchas', { type: 'geojson', data: datos.manchas as never });
    m.addLayer({ id: 'dist-fill', type: 'fill', source: 'dist', paint: {
      'fill-color': ['coalesce', ['feature-state', 'color'], C.base],
      'fill-opacity': ['*', 0.85, ['coalesce', ['feature-state', 'v'], 0]] } });
    m.addLayer({ id: 'curvas', type: 'line', source: 'curvas', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
      'line-color': ['interpolate', ['linear'], ['get', 'elev'], 3100, C.salvia, 3900, C.arena, 4650, C.texto],
      'line-width': 0.8, 'line-opacity': 0 } });
    m.addLayer({ id: 'dist-line', type: 'line', source: 'dist', paint: {
      'line-color': C.dorado, 'line-width': 1.4,
      'line-opacity': ['*', 0.95, ['coalesce', ['feature-state', 'v'], 0]] } });
    m.addLayer({ id: 'manchas-glow', type: 'line', source: 'manchas', layout: { 'line-join': 'round' }, paint: {
      'line-color': C.terracota, 'line-width': 12, 'line-blur': 10,
      'line-opacity': ['*', 0.6, ['coalesce', ['feature-state', 'a'], 0]] } });
    m.addLayer({ id: 'manchas-fill', type: 'fill', source: 'manchas', paint: {
      'fill-color': C.terracota, 'fill-opacity': ['*', 0.82, ['coalesce', ['feature-state', 'a'], 0]] } });
    m.addLayer({ id: 'manchas-line', type: 'line', source: 'manchas', paint: {
      'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], C.texto, C.dorado],
      'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 3, 1],
      'line-opacity': ['coalesce', ['feature-state', 'a'], 0] } });
  }

  /* ───────────── Popup: estado, no DOM ───────────── */
  function abrirPopup(modo: PopupModo) {
    set({ popup: modo });
    enfocarMovil();
  }
  function cerrarPopup() {
    if (estado.popup === 'cerrado') return;
    if (estado.sel != null) map!.setFeatureState({ source: 'manchas', id: estado.sel }, { sel: false });
    set({ popup: 'cerrado', sel: null });
    liberarMovil();
  }

  /* ───────────── Selección y juego ───────────── */
  function elegirMasCercana(lngLat?: [number, number]) {
    if (estado.ocupado || estado.fase !== 'zona') return;
    const p = lngLat ?? (map!.getCenter().toArray() as [number, number]);
    const id = estado.zona!;
    const pend = manchasDe(id).filter((m) => !apagada(m.id));
    if (!pend.length) { mostrarCompleta(); return; }
    let mejor: Mancha | null = null, dmin = Infinity;
    pend.forEach((m) => {
      const d = distPuntoPoligono(p, m.geometry.coordinates[0]);
      if (d < dmin) { dmin = d; mejor = m; }
    });
    const elegida = mejor as unknown as Mancha;
    if (estado.sel != null) map!.setFeatureState({ source: 'manchas', id: estado.sel }, { sel: false });
    map!.setFeatureState({ source: 'manchas', id: elegida.id }, { sel: true });
    anclaje = centro(elegida.geometry);
    set({ sel: elegida.id });
    if (estado.popup === 'parcial') enfocarMovil(); else abrirPopup('parcial');
  }

  const pathSvg = (d: string, w: number, color: string) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', String(w)); p.setAttribute('stroke-linecap', 'round');
    return p;
  };
  const circulo = (x: number, y: number, r: number, fill: string) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); c.setAttribute('r', String(r)); c.setAttribute('fill', fill);
    agua.append(c);
    return c;
  };
  function chorro(desde: { x: number; y: number }, hasta: { x: number; y: number }) {
    const mx = (desde.x + hasta.x) / 2, my = Math.min(desde.y, hasta.y) - 110;
    const d = `M${desde.x} ${desde.y} Q${mx} ${my} ${hasta.x} ${hasta.y}`;
    const a = pathSvg(d, 9, 'rgba(191,230,255,0.35)'), b = pathSvg(d, 3.2, '#eaf7ff');
    agua.append(a, b);
    const len = a.getTotalLength();
    [a, b].forEach((p) => { p.style.strokeDasharray = String(len); p.style.strokeDashoffset = String(len); });
    const tl = T(gsap.timeline({ onComplete: () => { a.remove(); b.remove(); } }));
    tl.to([a, b], { strokeDashoffset: 0, duration: D(0.5), ease: 'power1.in' });
    if (!estado.ligero) {
      for (let i = 0; i < 14; i++) {
        const c = circulo(hasta.x, hasta.y, 2 + Math.random() * 3, '#9fe0ff');
        const ang = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 38;
        tl.to(c, { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist - 14, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => c.remove() }, 0.45);
      }
      for (let i = 0; i < 5; i++) {
        const c = circulo(hasta.x + (Math.random() - 0.5) * 24, hasta.y, 6 + Math.random() * 6, 'rgba(220,230,235,0.55)');
        tl.to(c, { y: -46 - Math.random() * 30, opacity: 0, scale: 1.8, transformOrigin: '50% 50%', duration: 1.1, ease: 'power1.out', onComplete: () => c.remove() }, 0.6 + i * 0.05);
      }
    }
    tl.to([a, b], { opacity: 0, duration: D(0.3) }, '>-0.4');
    return tl;
  }

  async function apagar() {
    if (estado.ocupado || estado.sel == null) return;
    set({ ocupado: true });
    const m = mPorId.get(estado.sel)!;
    const id = estado.zona!;
    const pt = map!.project(centro(m.geometry));
    const origen = ultimoClic || { x: innerWidth / 2, y: innerHeight - 30 };
    const tl = T(gsap.timeline());
    tl.add(chorro(origen, { x: pt.x, y: pt.y }), 0);
    const o = { a: aVals.get(m.id) ?? 1 };
    tl.to(o, { a: 0, duration: D(1.1), ease: 'power2.in', onUpdate: () => setA(m.id, o.a) }, D(0.4));
    await esperar(tl);
    if (muerto) return;
    const apagadas = [...estado.apagadas, m.id];
    guardarProgreso(apagadas);
    map!.setFeatureState({ source: 'manchas', id: m.id }, { sel: false });
    set({ apagadas, sel: null, ocupado: false });
    refrescarEtiquetas();
    if (cuentaZona(id) === manchasDe(id).length) completarZona(id);
  }

  function completarZona(id: string) {
    pintarDistrito(id);
    T(gsap.delayedCall(D(0.9), () => { if (!muerto) mostrarCompleta(); }));
  }

  function mostrarCompleta() {
    anclaje = centro(dPorId.get(estado.zona!)!.geometry);
    if (estado.popup === 'completa') return;
    if (estado.sel != null) map!.setFeatureState({ source: 'manchas', id: estado.sel }, { sel: false });
    set({ sel: null });
    abrirPopup('completa');
  }

  /* ───────────── Navegación ───────────── */
  async function entrarZona(id: string) {
    if (estado.ocupado || estado.fase !== 'provincia') return;
    quitarPadding();
    set({ fase: 'entrando', zona: id, ocupado: true });
    mostrarEtiquetas(false, 0.3);
    MANCHAS.filter((m) => m.properties.distrito !== id && !apagada(m.id)).forEach((m) => {
      const o = { a: aVals.get(m.id) ?? 1 };
      animar(o, { a: 0.2 }, 0.8, () => setA(m.id, o.a));
    });
    DIST.filter((f) => f.properties.id !== id).forEach((f) => {
      const o = { v: 1 };
      animar(o, { v: 0.3 }, 1.2, () => map!.setFeatureState({ source: 'dist', id: f.id }, { v: o.v }));
    });
    const oc = { v: curvasOp.v };
    animar(oc, { v: 0.7 }, 1.6, () => setCurvasOp(oc.v));
    await esperar(volarA(camZona(id)));
    if (muerto) return;
    set({ fase: 'zona', ocupado: false });
    if (zonaExplorada(id)) mostrarCompleta();
  }

  async function volver() {
    if (estado.ocupado || (estado.fase !== 'zona' && estado.fase !== 'entrando')) return;
    set({ ocupado: true, fase: 'volviendo' });
    cerrarPopup();
    quitarPadding();
    MANCHAS.filter((m) => !apagada(m.id)).forEach((m) => {
      const o = { a: aVals.get(m.id) ?? 0.2 };
      animar(o, { a: 1 }, 0.8, () => setA(m.id, o.a));
    });
    DIST.forEach((f) => {
      const o = { v: 0.3 };
      animar(o, { v: 1 }, 1.2, () => map!.setFeatureState({ source: 'dist', id: f.id }, { v: o.v }));
    });
    const oc = { v: curvasOp.v };
    animar(oc, { v: 0.38 }, 1.6, () => setCurvasOp(oc.v));
    await esperar(volarA(camProvincia()));
    if (muerto) return;
    set({ zona: null, ocupado: false, fase: 'provincia' });
    refrescarEtiquetas();
    mostrarEtiquetas(true);
    if (totalExploradas() === DIST.length) mostrarFinal();
  }

  function mostrarFinal() {
    set({ fase: 'final' });
    if (innerWidth > 900) map!.easeTo({ padding: { right: 420, left: 0, top: 0, bottom: 0 }, duration: D(800) });
  }

  async function reiniciar() {
    if (estado.ocupado) return;
    quitarPadding();
    cerrarPopup();
    guardarProgreso([]);
    aVals.clear();
    set({ apagadas: [] });
    DIST.forEach((f) => pintarDistrito(f.properties.id));
    MANCHAS.forEach((m) => setA(m.id, 1));
    refrescarEtiquetas();
    if (estado.fase === 'zona') await volver();
    else set({ fase: 'provincia' });
  }

  /* ───────────── Introducción ───────────── */
  function intro() {
    const prov = camProvincia();
    DIST.forEach((f) => map!.setFeatureState({ source: 'dist', id: f.id }, { v: 0 }));
    const terminar = () => {
      if (muerto) return;
      set({ ocupado: false, fase: 'provincia' });
      if (totalExploradas() === DIST.length) mostrarFinal();
    };
    if (!estado.ligero) {
      const w = { v: 10 };
      T(gsap.to(w, { v: 16, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut', onUpdate: () => map!.setPaintProperty('manchas-glow', 'line-width', w.v) }));
    }
    if (op.rapido) {
      map!.jumpTo({ center: [prov.lng, prov.lat], zoom: prov.zoom, pitch: 0, bearing: 0 });
      DIST.forEach((f) => map!.setFeatureState({ source: 'dist', id: f.id }, { v: 1 }));
      setCurvasOp(0.38);
      MANCHAS.forEach((m) => { if (!apagada(m.id)) setA(m.id, 1); });
      mostrarEtiquetas(true, 0.2);
      terminar();
      return;
    }
    const ini = estado.ligero ? prov : { ...prov, zoom: prov.zoom + 0.9, pitch: 48, bearing: -14 };
    map!.jumpTo({ center: [ini.lng, ini.lat], zoom: ini.zoom, pitch: ini.pitch, bearing: ini.bearing });
    const tl = T(gsap.timeline());
    tl.add(volarA(prov, 3.4, 'power2.inOut'), 0);
    DIST.forEach((f, i) => {
      const o = { v: 0 };
      tl.to(o, { v: 1, duration: D(0.8), ease: 'power2.out', onUpdate: () => map!.setFeatureState({ source: 'dist', id: f.id }, { v: o.v }) }, D(0.25 + i * 0.22));
    });
    const oc = { v: 0 };
    tl.to(oc, { v: 0.38, duration: D(1.6), onUpdate: () => setCurvasOp(oc.v) }, D(0.9));
    tl.add(() => mostrarEtiquetas(true), D(1.8));
    const oa = { a: 0 };
    tl.to(oa, { a: 1, duration: D(1), ease: 'power1.out', onUpdate: () => MANCHAS.forEach((m) => { if (!apagada(m.id)) setA(m.id, oa.a); }) }, D(2.3));
    tl.add(terminar, D(3.4));
  }

  /* ───────────── Arranque asíncrono (MapLibre solo en el cliente) ───────────── */
  (async () => {
    const maplibregl = (await import('maplibre-gl')).default;
    if (muerto) return;
    const m = new maplibregl.Map({
      container: op.contenedor,
      style: { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': C.bosque } }] },
      center: [-71.99, -13.54], zoom: 10, maxPitch: 70, attributionControl: false, fadeDuration: 0,
    });
    map = m;
    (['scrollZoom', 'dragRotate', 'dragPan', 'touchZoomRotate', 'doubleClickZoom', 'keyboard', 'boxZoom'] as const).forEach((h) => m[h].disable());
    m.on('move', () => movs.forEach((f) => f()));
    m.on('error', (e) => console.warn('mapa:', e.error && e.error.message));
    m.on('mousemove', (e: MapMouseEvent) => {
      if (estado.fase !== 'provincia' || estado.ocupado) return;
      const f = m.queryRenderedFeatures(e.point, { layers: ['dist-fill'] })[0];
      const id = f ? (f.properties.id as string) : null;
      m.getCanvas().style.cursor = id ? 'pointer' : '';
      if (id === hoverId) return;
      if (hoverId) pintarDistrito(hoverId, false);
      hoverId = id;
      if (id) pintarDistrito(id, true);
    });
    m.on('click', (e: MapMouseEvent) => {
      if (estado.ocupado) return;
      if (estado.fase === 'provincia') {
        const f = m.queryRenderedFeatures(e.point, { layers: ['dist-fill'] })[0];
        if (f) { if (hoverId) pintarDistrito(hoverId, false); hoverId = null; void entrarZona(f.properties.id as string); }
      } else if (estado.fase === 'zona') {
        ultimoClic = { x: e.point.x, y: e.point.y };
        elegirMasCercana([e.lngLat.lng, e.lngLat.lat]);
      }
    });
    m.once('load', () => {
      if (muerto) return;
      crearCapas();
      const area = (f: Distrito) => (f.properties.bbox[2] - f.properties.bbox[0]) * (f.properties.bbox[3] - f.properties.bbox[1]);
      const porTamano = [...DIST].sort((x, y) => area(y) - area(x));
      DIST.forEach((f) => {
        const el = document.createElement('div');
        el.className = 'etiqueta-marca';
        el.style.zIndex = String(porTamano.indexOf(f) + 1);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'etiqueta';
        b.style.opacity = '0';
        b.disabled = true;
        const punto = document.createElement('i');
        const nombre = document.createElement('span');
        nombre.textContent = f.properties.nombre;
        b.append(punto, nombre, document.createElement('small'));
        b.addEventListener('click', () => { void entrarZona(f.properties.id); });
        el.append(b);
        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(f.properties.centroide).addTo(m);
        etiquetas.set(f.properties.id, b);
      });
      refrescarEtiquetas();
      DIST.forEach((f) => pintarDistrito(f.properties.id));
      MANCHAS.forEach((mm) => { if (!apagada(mm.id)) aVals.set(mm.id, 1); });
      set({ fase: 'intro', ocupado: true });
      intro();
    });
  })();

  return {
    getEstado: () => estado,
    suscribir: (f) => { subs.add(f); return () => subs.delete(f); },
    alMover: (f) => { movs.add(f); return () => movs.delete(f); },
    anclajePx: () => (map && anclaje ? (({ x, y }) => ({ x, y }))(map.project(anclaje)) : null),
    centroPx: (id) => { const f = dPorId.get(id); return map && f ? (({ x, y }) => ({ x, y }))(map.project(centro(f.geometry))) : null; },
    proyectar: (lng, lat) => (map ? (({ x, y }) => ({ x, y }))(map.project([lng, lat])) : null),
    entrarZona, volver, elegirMasCercana, apagar, cerrarPopup, reiniciar,
    setLigero: (v) => set({ ligero: v }),
    destruir: () => {
      muerto = true;
      vivos.forEach((a) => a.kill());
      subs.clear();
      movs.clear();
      agua.replaceChildren();
      map?.remove();
      map = null;
    },
  };
}
