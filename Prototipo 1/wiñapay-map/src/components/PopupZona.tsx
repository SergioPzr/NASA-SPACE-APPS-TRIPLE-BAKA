'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { gsap } from 'gsap';
import { AGREGACIONES, etiquetaVeredicto, fraseEvidencia, type Evaluacion } from '@/lib/evidencia';
import { fmtP, porDecada, signo } from '@/lib/formato';
import type { Controlador, EstadoMapa } from '@/lib/mapa';
import type { Datos } from '@/lib/tipos';
import { Grafica } from './Grafica';

interface Props {
  ctrl: Controlador;
  estado: EstadoMapa;
  datos: Datos;
  evaluaciones: Record<string, Evaluacion>;
}

const limitar = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const NUMERO = /^([+−-]?)(\d+)(?:\.(\d+))?$/;

function Valor({ visible, children, rapido }: { visible: boolean; children: ReactNode; rapido: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const antes = useRef(visible);
  useEffect(() => {
    const el = ref.current;
    if (visible && !antes.current && el) {
      gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: rapido ? 0.2 : 0.8, ease: 'power3.out', clearProps: 'transform' });
      // Si el dato es un número, cuenta desde cero hasta su valor (el texto final es siempre el real).
      const m = typeof children === 'string' ? NUMERO.exec(children) : null;
      const nodo = el.firstChild;
      if (m && !rapido && nodo?.nodeType === Node.TEXT_NODE) {
        const fin = Number(`${m[2]}.${m[3] ?? '0'}`), dec = m[3]?.length ?? 0;
        const o = { v: 0 };
        gsap.to(o, {
          v: fin, duration: 1.1, ease: 'power2.out',
          onUpdate: () => { nodo.nodeValue = m[1] + o.v.toFixed(dec); },
          onComplete: () => { nodo.nodeValue = children as string; },
        });
      }
    }
    antes.current = visible;
  }, [visible, children, rapido]);
  return <span ref={ref} className={`valor${visible ? '' : ' oculto'}`} aria-label={visible ? undefined : 'dato oculto'}>{visible ? children : '???'}</span>;
}

export function PopupZona({ ctrl, estado, datos, evaluaciones }: Props) {
  const abierto = estado.popup !== 'cerrado' && estado.zona !== null;
  const ref = useRef<HTMLDivElement | null>(null);
  const [montado, setMontado] = useState<HTMLDivElement | null>(null);
  const completa = estado.popup === 'completa';
  const fijarRef = useCallback((n: HTMLDivElement | null) => { ref.current = n; setMontado(n); }, []);

  const posicionar = () => {
    const el = ref.current;
    if (!el) return;
    if (innerWidth <= 640) { el.style.left = ''; el.style.top = ''; return; }
    const w = el.offsetWidth, h = el.offsetHeight, top = 100, bot = innerHeight - 90;
    let x: number, y: number;
    if (el.classList.contains('sin-tallo')) {
      x = innerWidth > 900 ? innerWidth - w - 30 : (innerWidth - w) / 2;
      y = limitar((innerHeight - h) / 2, top, Math.max(top, bot - h));
    } else {
      const p = ctrl.anclajePx();
      if (!p) return;
      const g = 38;
      const cands = [
        { x: p.x + g, y: p.y - h / 2 }, { x: p.x - g - w, y: p.y - h / 2 },
        { x: p.x - w / 2, y: p.y - h - g }, { x: p.x - w / 2, y: p.y + g },
      ];
      const cabe = (c: { x: number; y: number }) => c.x >= 12 && c.x + w <= innerWidth - 12 && c.y >= top && c.y + h <= bot;
      const pick = cands.find(cabe) ?? cands[0];
      x = limitar(pick.x, 12, innerWidth - w - 12);
      y = limitar(pick.y, top, Math.max(top, bot - h));
    }
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  };

  useLayoutEffect(() => {
    if (!abierto) return;
    posicionar();
    const off = ctrl.alMover(posicionar);
    const ro = new ResizeObserver(posicionar);
    if (ref.current) ro.observe(ref.current);
    addEventListener('resize', posicionar);
    return () => { off(); ro.disconnect(); removeEventListener('resize', posicionar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, montado, estado.popup, estado.sel]);

  useEffect(() => {
    if (!abierto) return;
    const el = ref.current;
    if (!el) return;
    if (completa) el.querySelector<HTMLElement>('[data-primario]')?.focus();
  }, [abierto, completa]);

  if (!abierto) return <Dialog.Root open={false} />;

  const id = estado.zona!;
  const f = datos.distritos.features.find((d) => d.properties.id === id)!;
  const manchas = datos.manchas.features.filter((m) => m.properties.distrito === id);
  const n = manchas.length;
  const c = manchas.filter((m) => estado.apagadas.includes(m.id)).length;
  const ver = c >= n ? [0, 1, 2, 3] : [0, 1, 2].slice(0, c);
  const res = datos.resultados.distritos[id];
  const prin = res.agregaciones.media_anual;
  const ev = evaluaciones[id];
  const dec = porDecada(prin.pendiente_anual);
  const dePrueba = datos.manchas.features.some((m) => m.properties.es_de_prueba);
  const sel = estado.sel != null ? datos.manchas.features.find((m) => m.id === estado.sel) : null;

  const evidencia = ev.veredicto === 'robusta'
    ? `Sí · ${ev.significativas.length} de ${ev.calculadas.length} formas`
    : ev.veredicto === 'parcial' ? `Parcial · ${ev.significativas.length} de ${ev.calculadas.length} formas` : 'Aún no';
  const filas = [
    { k: 'NDVI medio 2001–2025', v: prin.media.toFixed(2) },
    { k: 'Cambio por década', v: signo(dec) },
    { k: '¿Evidencia estadística?', v: evidencia },
    { k: 'En palabras simples', v: fraseEvidencia(f.properties.nombre, dec, ev), frase: true },
  ];
  const pocos = res.pixeles < 100;

  return (
    <Dialog.Root open modal={false} onOpenChange={(o) => { if (!o) ctrl.cerrarPopup(); }}>
      <Dialog.Portal>
        <Dialog.Content
          ref={fijarRef}
          className={`popup${completa ? ' sin-tallo' : ''}`}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            ref.current?.querySelector<HTMLElement>('[data-primario]')?.focus();
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Entrada contenedor={ref} rapido={estado.ligero} />
          <Dialog.Close className="x" aria-label="Cerrar">×</Dialog.Close>
          <span className={`etiqueta-tipo${completa ? ' ok' : ''}`}>
            {completa ? 'Zona completa' : dePrueba ? 'Manchas de prueba · NDVI real' : 'Área quemada MCD64A1 · NDVI real'}
          </span>
          <Dialog.Title asChild><h3>{f.properties.nombre}</h3></Dialog.Title>
          <Dialog.Description className="meta">
            {completa
              ? n === 0
                ? 'No hay registros de incendio en este distrito en el periodo. Estos son sus datos.'
                : `Las ${n} manchas están apagadas. Estos son los datos completos del distrito.`
              : sel
                ? `Mancha seleccionada · ≈ ${sel.properties.area_ha.toLocaleString('es-PE')} ha${sel.properties.es_de_prueba ? ' (dato de prueba)' : ''}`
                : 'Toca otro punto del mapa o elige la siguiente mancha.'}
          </Dialog.Description>
          <ul className="datos">
            {filas.map((r, i) => (
              <li key={r.k} className={r.frase ? 'frase' : ''}>
                <span>{r.k}</span>
                <Valor visible={ver.includes(i)} rapido={estado.ligero}>{r.v}</Valor>
              </li>
            ))}
          </ul>
          <Grafica
            serie={prin.serie} pendienteAnual={prin.pendiente_anual} anios={datos.resultados.anios}
            progreso={n ? Math.min(c / n, 1) : 1} tendencia={completa} rapido={estado.ligero}
            etiqueta={`NDVI medio anual de ${f.properties.nombre}`}
          />
          {completa && (
            <details className="agregaciones">
              <summary>Las tres formas de medirlo</summary>
              <table>
                <thead><tr><th>Medida</th><th className="num">Por década</th><th className="num">p</th></tr></thead>
                <tbody>
                  {AGREGACIONES.map(({ id: ag, nombre }) => (
                    <tr key={ag}><td>{nombre}</td><td className="num">{signo(porDecada(res.agregaciones[ag].pendiente_anual))}</td><td className="num">{fmtP(res.agregaciones[ag].p)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="nota">Conclusión: {etiquetaVeredicto(ev.veredicto)}. Se muestran las tres medidas juntas para no elegir la que dé significancia.</p>
            </details>
          )}
          <div className="acciones">
            {completa ? (
              <>
                <span className="prog">{n} de {n}</span>
                <button type="button" className="btn-ok" data-primario onClick={() => void ctrl.volver()}>Volver a la provincia</button>
              </>
            ) : (
              <>
                <span className="prog">{c} de {n} apagadas</span>
                {estado.sel == null ? (
                  <button type="button" className="btn-apagar" data-primario disabled={estado.ocupado} onClick={() => ctrl.elegirMasCercana()}>Elegir mancha</button>
                ) : (
                  <button type="button" className="btn-apagar" data-primario disabled={estado.ocupado} onClick={() => void ctrl.apagar()}>Apagar</button>
                )}
              </>
            )}
          </div>
          <p className="nota">
            {completa
              ? `${dePrueba ? 'Las manchas son de prueba; el NDVI de este distrito es real' : 'NDVI real'} (MODIS MOD13Q1, 2001–2025).${pocos ? ` Ojo: este distrito tiene solo ${res.pixeles} píxeles de 250 m; los resultados son poco estables.` : ''}`
              : 'Apagar es una forma de explorar los datos; no representa combate real del fuego.'}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Entrada suave: la tarjeta sube y aparece sin rebote, y sus partes llegan escalonadas. */
function Entrada({ contenedor, rapido }: { contenedor: React.RefObject<HTMLDivElement | null>; rapido: boolean }) {
  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    if (rapido) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      return;
    }
    gsap.fromTo(el, { opacity: 0, y: 28, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: 'power3.out', clearProps: 'transform' });
    gsap.fromTo(el.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.045, delay: 0.12, ease: 'power3.out', clearProps: 'transform' });
  }, [contenedor, rapido]);
  return null;
}
