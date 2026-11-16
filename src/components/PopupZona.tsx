'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { gsap } from 'gsap';
import type { Evaluacion } from '@/lib/evidencia';
import type { Controlador, EstadoMapa } from '@/lib/mapa';
import type { Datos } from '@/lib/tipos';
import { GraficaSimple } from './GraficaSimple';
import { canchas, fraseCambio, hectareas, nivelVerde } from './lenguajeSimple';

interface Props {
  ctrl: Controlador;
  estado: EstadoMapa;
  datos: Datos;
  evaluaciones: Record<string, Evaluacion>;
  /** Hectáreas quemadas registradas por distrito (todas las del dato real, no solo las del juego). */
  areaQuemada: Record<string, number>;
}

/**
 * Panel lateral de la zona: entra desde la derecha al acercarse a un distrito y se queda ahí.
 * Mientras se apaga el fuego (automático) cuenta qué pasó; al terminar, explica la vegetación
 * en lenguaje sencillo, con una gráfica fácil de leer. Todo sale de los datos reales.
 */
export function PopupZona({ ctrl, estado, datos, evaluaciones, areaQuemada }: Props) {
  const abierto = estado.popup !== 'cerrado' && estado.zona !== null;
  const ref = useRef<HTMLDivElement | null>(null);
  const [, setMontado] = useState<HTMLDivElement | null>(null);
  const completa = estado.popup === 'completa';
  const ligeroRef = useRef(estado.ligero);
  ligeroRef.current = estado.ligero;
  // La entrada se anima justo cuando el panel aparece en la página (antes aún no existía)
  const fijarRef = useCallback((n: HTMLDivElement | null) => {
    ref.current = n;
    setMontado(n);
    if (n) animarEntrada(n, ligeroRef.current);
  }, []);

  // Al completar la zona, el contenido nuevo aparece escalonado y el foco va al botón principal
  useEffect(() => {
    const el = ref.current;
    if (!abierto || !completa || !el) return;
    if (!estado.ligero) {
      gsap.fromTo(el.querySelectorAll('.bloque'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' });
    }
    el.querySelector<HTMLElement>('[data-primario]')?.focus();
  }, [abierto, completa, estado.ligero]);

  if (!abierto) return <Dialog.Root open={false} />;

  const id = estado.zona!;
  const f = datos.distritos.features.find((d) => d.properties.id === id)!;
  const nombre = f.properties.nombre;
  const manchas = datos.manchas.features.filter((m) => m.properties.distrito === id);
  const n = manchas.length;
  const c = manchas.filter((m) => estado.apagadas.includes(m.id)).length;
  const res = datos.resultados.distritos[id];
  const prin = res.agregaciones.media_anual;
  const anios = datos.resultados.anios;
  const a0 = anios[0], a1 = anios[anios.length - 1];
  const ha = areaQuemada[id] ?? 0;
  const verde = nivelVerde(prin.media);
  const cambio = fraseCambio(evaluaciones[id], a0, a1);
  const dePrueba = datos.manchas.features.some((m) => m.properties.es_de_prueba);
  const marcador = Math.max(0, Math.min(1, prin.media)) * 100;

  return (
    <Dialog.Root open modal={false} onOpenChange={(o) => { if (!o) void ctrl.volver(); }}>
      <Dialog.Portal>
        <Dialog.Content
          ref={fijarRef}
          className={`popup panel-lateral${completa ? ' sin-tallo' : ''}`}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Close className="x" aria-label="Volver a la provincia">×</Dialog.Close>
          <span className={`etiqueta-tipo${completa ? ' ok' : ''}`}>
            {completa ? 'Lo que vio el satélite' : n > 0 ? 'Apagando el fuego…' : 'Cargando la zona…'}
          </span>
          <Dialog.Title asChild><h3>{nombre}</h3></Dialog.Title>
          <Dialog.Description className="meta">
            {ha > 0
              ? `Aquí se quemaron unas ${hectareas(ha)} hectáreas entre ${a0} y ${a1}: es como ${canchas(ha)} canchas de fútbol.`
              : `El satélite no registró incendios aquí entre ${a0} y ${a1}.`}
          </Dialog.Description>

          {!completa ? (
            <div className="bloque apagando" role="status">
              <p>
                Estamos apagando {n === 1 ? 'el fuego' : 'los fuegos'} para mostrarte cómo está la vegetación de {nombre}.
              </p>
              <div className="apagando-barra" aria-hidden="true"><i style={{ width: `${n ? (c / n) * 100 : 100}%` }} /></div>
              <span className="prog">{c} de {n} {n === 1 ? 'fuego apagado' : 'fuegos apagados'}</span>
            </div>
          ) : (
            <>
              <div className="bloque">
                <span className="pregunta">¿Cuánta vegetación hay?</span>
                <strong className="respuesta">{verde.titulo}</strong>
                <p className="explica">{verde.detalle}</p>
                <div className="medidor" aria-hidden="true">
                  <i style={{ left: `${marcador}%` }} />
                </div>
                <div className="medidor-rotulos" aria-hidden="true"><span>Poca</span><span>Mucha</span></div>
              </div>
              <div className="bloque">
                <span className="pregunta">¿Cambió desde {a0}?</span>
                <strong className="respuesta">{cambio.titulo}</strong>
                <p className="explica">{cambio.detalle}</p>
              </div>
            </>
          )}

          <div className="bloque">
            <GraficaSimple
              serie={prin.serie} pendienteAnual={prin.pendiente_anual} anios={anios}
              progreso={n ? Math.min(c / n, 1) : 1} rapido={estado.ligero}
              etiqueta={`Vegetación de ${nombre} cada año`}
            />
          </div>

          {completa && res.pixeles < 100 && (
            <p className="bloque nota-aviso">
              Ojo: {nombre} es muy pequeño para el satélite (lo ve con pocos puntos), así que este resultado es menos seguro.
            </p>
          )}

          {completa && (
            <div className="bloque acciones">
              <button type="button" className="btn-ok" data-primario onClick={() => void ctrl.volver()}>Volver a la provincia</button>
            </div>
          )}
          {dePrueba && <p className="nota">Los incendios del mapa son de prueba.</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Entrada: el panel llega desde fuera de la pantalla (derecha; en móvil desde abajo) y se
 * posiciona centrado. El centrado vertical lo hace GSAP (yPercent) para no pelear con el slide.
 */
function animarEntrada(el: HTMLDivElement, rapido: boolean) {
  const movil = window.matchMedia('(max-width: 640px)').matches;
  if (movil) {
    gsap.fromTo(el, { y: '110%' }, { y: 0, duration: rapido ? 0.3 : 0.9, ease: 'power3.out' });
    return;
  }
  gsap.set(el, { yPercent: -50 });
  const fuera = window.innerWidth - el.getBoundingClientRect().left + 60;
  gsap.fromTo(el, { x: fuera }, { x: 0, duration: rapido ? 0.4 : 1.1, ease: 'expo.out' });
  if (!rapido) {
    gsap.fromTo(el.children, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.8, stagger: 0.05, delay: 0.35, ease: 'power3.out', clearProps: 'transform' });
  }
}
