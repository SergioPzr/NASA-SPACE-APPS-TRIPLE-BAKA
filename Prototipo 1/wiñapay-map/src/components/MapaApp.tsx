'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { crearMapa, type Controlador, type EstadoMapa } from '@/lib/mapa';
import type { Evaluacion } from '@/lib/evidencia';
import type { Datos } from '@/lib/tipos';
import { useDatos } from '@/lib/useDatos';
import { PanelFinal } from './PanelFinal';
import { PopupZona } from './PopupZona';

const CLAVE_LIGERO = 'winapay-ligero';
const CLAVE_INTRO = 'winapay-intro-vista';

declare global {
  interface Window { __winapay?: Controlador }
}

function leerLigero(): boolean {
  try {
    const v = localStorage.getItem(CLAVE_LIGERO);
    if (v !== null) return v === '1';
  } catch { /* sin almacenamiento */ }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MapaApp() {
  const d = useDatos();
  if (d.estado === 'listo') return <MapaListo datos={d.datos} evaluaciones={d.evaluaciones} evalProvincia={d.evalProvincia} />;
  return (
    <main className="pantalla-mapa centrado">
      {d.estado === 'cargando' ? (
        <p role="status">Cargando el territorio…</p>
      ) : (
        <div role="alert" className="aviso-error">
          <p>No pudimos cargar los datos y todavía no hay una copia guardada en este dispositivo.</p>
          <button type="button" className="btn-sec" onClick={d.reintentar}>Reintentar</button>
        </div>
      )}
    </main>
  );
}

function MapaListo({ datos, evaluaciones, evalProvincia }: { datos: Datos; evaluaciones: Record<string, Evaluacion>; evalProvincia: Evaluacion }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const agua = useRef<SVGSVGElement>(null);
  const [ctrl, setCtrl] = useState<Controlador | null>(null);
  const [estado, setEstado] = useState<EstadoMapa | null>(null);

  useEffect(() => {
    if (!contenedor.current || !agua.current) return;
    let rapido = false;
    try {
      rapido = sessionStorage.getItem(CLAVE_INTRO) === '1';
      sessionStorage.setItem(CLAVE_INTRO, '1');
    } catch { /* sin almacenamiento */ }
    const c = crearMapa({ contenedor: contenedor.current, agua: agua.current, datos, rapido, ligero: leerLigero() });
    const off = c.suscribir(() => setEstado(c.getEstado()));
    setCtrl(c);
    setEstado(c.getEstado());
    if (new URLSearchParams(location.search).has('e2e')) window.__winapay = c;
    return () => {
      off();
      c.destruir();
      setCtrl(null);
      delete window.__winapay;
    };
  }, [datos]);

  const manchasDe = useMemo(() => {
    const m = new Map<string, number[]>();
    datos.manchas.features.forEach((f) => m.set(f.properties.distrito, [...(m.get(f.properties.distrito) ?? []), f.id]));
    return m;
  }, [datos]);
  const hayPrueba = datos.manchas.features.some((m) => m.properties.es_de_prueba);
  const total = datos.distritos.features.length;
  const exploradas = estado
    ? datos.distritos.features.filter((f) => (manchasDe.get(f.properties.id) ?? []).every((id) => estado.apagadas.includes(id))).length
    : 0;

  const pendientes = estado?.zona ? (manchasDe.get(estado.zona) ?? []).filter((id) => !estado.apagadas.includes(id)).length : 0;

  const cambiarLigero = (v: boolean) => {
    ctrl?.setLigero(v);
    try { localStorage.setItem(CLAVE_LIGERO, v ? '1' : '0'); } catch { /* sin almacenamiento */ }
  };

  let pista: React.ReactNode = 'Cargando el territorio…';
  if (estado) {
    switch (estado.fase) {
      case 'provincia': pista = 'Toca un distrito para acercarte y apagar sus focos.'; break;
      case 'entrando': pista = 'Acercándonos a la zona…'; break;
      case 'volviendo': pista = 'Volviendo a la provincia…'; break;
      case 'final': pista = 'Recorrido completo.'; break;
      case 'zona':
        pista = pendientes > 0 ? (
          <>
            <span>Toca <b>cualquier punto</b> del mapa: se elige la mancha más cercana. Quedan {pendientes}.</span>
            <button type="button" onClick={() => ctrl?.elegirMasCercana()}>Elegir una mancha</button>
          </>
        ) : (
          <>
            <span>Zona completa. Vuelve a la provincia para elegir otra.</span>
            <button type="button" onClick={() => void ctrl?.volver()}>← Provincia</button>
          </>
        );
        break;
    }
  }

  const enZona = estado?.fase === 'zona' || estado?.fase === 'entrando';

  return (
    <main className="pantalla-mapa">
      <div id="map" ref={contenedor} aria-label="Mapa de la provincia de Cusco" />
      <svg id="agua" ref={agua} aria-hidden="true" />

      <header className="marca">
        <p className="lema">El territorio cambia. Hagámoslo visible.</p>
        <p className="sub">Provincia de Cusco · verdor de la vegetación (NDVI) 2001–2025</p>
        {enZona && <button type="button" className="btn-ghost" onClick={() => void ctrl?.volver()}>← Provincia</button>}
      </header>

      <div className="hud-der">
        <div className="contador" aria-live="polite">Zonas exploradas <strong>{exploradas}</strong>/{total}</div>
        <label className="toggle">
          <input type="checkbox" checked={estado?.ligero ?? false} onChange={(e) => cambiarLigero(e.target.checked)} /> Modo ligero
        </label>
        <button type="button" className="btn-ghost" onClick={() => void ctrl?.reiniciar()}>Reiniciar</button>
      </div>

      <div className="pista" role="status">{pista}</div>
      {hayPrueba && <div className="aviso-prueba">Manchas de prueba · pendiente MCD64A1</div>}

      {ctrl && estado && <PopupZona ctrl={ctrl} estado={estado} datos={datos} evaluaciones={evaluaciones} />}
      {ctrl && estado?.fase === 'final' && <PanelFinal ctrl={ctrl} datos={datos} evaluaciones={evaluaciones} evalProvincia={evalProvincia} ligero={estado.ligero} />}
    </main>
  );
}
