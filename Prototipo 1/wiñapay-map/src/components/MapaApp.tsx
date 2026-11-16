'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { crearMapa, type Controlador, type EstadoMapa } from '@/lib/mapa';
import type { Evaluacion } from '@/lib/evidencia';
import type { Datos } from '@/lib/tipos';
import { useDatos } from '@/lib/useDatos';
import { CieloEstrellas } from './CieloEstrellas';
import { limitarFuegos } from './lenguajeSimple';
import { PanelFinal } from './PanelFinal';
import { manchasDentroDeDistritos } from './recorte';
import { PopupZona } from './PopupZona';
import { suavizarManchas } from './suavizar';

const CLAVE_INTRO = 'winapay-intro-vista';

declare global {
  interface Window { __winapay?: Controlador }
}

/** Sin «Modo ligero»: el mapa usa siempre la animación completa (cámara 3D, agua, estrellas). */
const MODO_LIGERO = false;

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

function MapaListo({ datos: datosReales, evaluaciones, evalProvincia }: { datos: Datos; evaluaciones: Record<string, Evaluacion>; evalProvincia: Evaluacion }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const agua = useRef<SVGSVGElement>(null);
  const [ctrl, setCtrl] = useState<Controlador | null>(null);
  const [estado, setEstado] = useState<EstadoMapa | null>(null);

  // Hectáreas quemadas por distrito con TODAS las áreas registradas (dato real)
  const areaQuemada = useMemo(() => {
    const a: Record<string, number> = {};
    datosReales.manchas.features.forEach((m) => { a[m.properties.distrito] = (a[m.properties.distrito] ?? 0) + m.properties.area_ha; });
    return a;
  }, [datosReales]);

  // En el juego: como máximo 2 incendios por distrito (los más grandes). Los datos no cambian.
  const datos = useMemo(() => ({ ...datosReales, manchas: limitarFuegos(datosReales.manchas, 2) }), [datosReales]);
  // Solo presentación: contornos de las manchas redondeados para dibujarlas
  // y cada mancha recortada a su distrito para que no se salga del mapa
  const datosMapa = useMemo(() => ({ ...datos, manchas: suavizarManchas(manchasDentroDeDistritos(datos.manchas, datos.distritos)) }), [datos]);

  useEffect(() => {
    if (!contenedor.current || !agua.current) return;
    let rapido = false;
    try {
      rapido = sessionStorage.getItem(CLAVE_INTRO) === '1';
      sessionStorage.setItem(CLAVE_INTRO, '1');
    } catch { /* sin almacenamiento */ }
    const c = crearMapa({ contenedor: contenedor.current, agua: agua.current, datos: datosMapa, rapido, ligero: MODO_LIGERO });
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
  }, [datosMapa]);

  const manchasDe = useMemo(() => {
    const m = new Map<string, number[]>();
    datos.manchas.features.forEach((f) => m.set(f.properties.distrito, [...(m.get(f.properties.distrito) ?? []), f.id]));
    return m;
  }, [datos]);
  const hayPrueba = datos.manchas.features.some((m) => m.properties.es_de_prueba);

  /* Agua automática: al entrar en un distrito se elige el fuego y se apaga solo, uno tras otro. */
  useEffect(() => {
    if (!ctrl || !estado || estado.fase !== 'zona' || estado.ocupado || !estado.zona) return;
    const pendientes = (manchasDe.get(estado.zona) ?? []).filter((id) => !estado.apagadas.includes(id));
    if (!pendientes.length) return;
    const t = window.setTimeout(() => {
      if (estado.sel == null) ctrl.elegirMasCercana();
      else void ctrl.apagar();
    }, estado.sel == null ? 350 : 900);
    return () => window.clearTimeout(t);
  }, [ctrl, estado, manchasDe]);

  let aviso = 'Cargando el territorio…';
  if (estado) {
    switch (estado.fase) {
      case 'provincia': aviso = 'Toca un distrito para acercarte.'; break;
      case 'entrando': aviso = 'Acercándonos a la zona…'; break;
      case 'zona': aviso = 'Mostrando la zona.'; break;
      case 'volviendo': aviso = 'Volviendo a la provincia…'; break;
      case 'final': aviso = 'Recorrido completo.'; break;
    }
  }
  const enZona = estado?.fase === 'zona' || estado?.fase === 'entrando';

  return (
    <main className="pantalla-mapa">
      <CieloEstrellas ctrl={ctrl} quieto={estado?.ligero ?? false} />
      <div id="map" ref={contenedor} aria-label="Mapa de la provincia de Cusco" />
      <svg id="agua" ref={agua} aria-hidden="true" />

      <header className="marca">
        <p className="lema">El territorio cambia. Hagámoslo visible.</p>
        {enZona && <button type="button" className="btn-ghost" onClick={() => void ctrl?.volver()}>← Provincia</button>}
      </header>

      {estado?.fase === 'provincia' && (
        <aside className="leyenda-mapa" aria-label="Cómo leer el mapa">
          <p><i className="ley-fuego" aria-hidden="true" />Zona donde el satélite vio un incendio</p>
          <p><i className="ley-revelada" aria-hidden="true" />Fuego ya apagado</p>
          <p className="ley-ndvi"><span>Vegetación del distrito explorado</span><i className="ley-barra" aria-hidden="true" /><small><span>poca</span><span>mucha</span></small></p>
        </aside>
      )}

      {/* Solo para lectores de pantalla: qué está pasando en el mapa */}
      <p className="solo-lector" role="status">{aviso}</p>
      {hayPrueba && <div className="aviso-prueba">⚠️ Algunos datos son de prueba</div>}

      {ctrl && estado && <PopupZona ctrl={ctrl} estado={estado} datos={datos} evaluaciones={evaluaciones} areaQuemada={areaQuemada} />}
      {ctrl && estado?.fase === 'final' && <PanelFinal ctrl={ctrl} datos={datos} evaluaciones={evaluaciones} evalProvincia={evalProvincia} ligero={estado.ligero} />}
    </main>
  );
}
