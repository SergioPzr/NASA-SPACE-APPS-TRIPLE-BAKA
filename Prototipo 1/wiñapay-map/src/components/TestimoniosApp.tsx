'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { cargarDatos, traer } from '@/lib/cliente-datos';
import { enviar, pendientesEnCola, vaciarCola, type Destino } from '@/lib/envio-cliente';
import type { Iniciativa, Testimonio } from '@/lib/tipos';
import { LIM, validarIniciativa, validarTestimonio, type Errores } from '@/lib/validacion';

interface DefCampo {
  nombre: string;
  etiqueta: string;
  tipo: 'texto' | 'area' | 'distrito';
  ayuda?: string;
  max: number;
}

const CAMPOS: Record<Destino, DefCampo[]> = {
  testimonios: [
    { nombre: 'texto', etiqueta: 'Tu testimonio', tipo: 'area', max: LIM.texto[1], ayuda: `¿Qué cambios ves en el verdor, el agua o el monte de tu zona? (${LIM.texto[0]}–${LIM.texto[1]} caracteres)` },
    { nombre: 'nombre', etiqueta: 'Apodo (opcional)', tipo: 'texto', max: LIM.alias, ayuda: 'Se publica con tu testimonio. No uses tu nombre completo.' },
    { nombre: 'distrito', etiqueta: 'Distrito (opcional)', tipo: 'distrito', max: 10 },
  ],
  iniciativas: [
    { nombre: 'titulo', etiqueta: 'Nombre de la iniciativa', tipo: 'texto', max: LIM.titulo[1] },
    { nombre: 'descripcion', etiqueta: 'Qué hacen y cómo sumarse', tipo: 'area', max: LIM.descripcion[1], ayuda: `${LIM.descripcion[0]}–${LIM.descripcion[1]} caracteres. Es público: sin teléfonos ni correos.` },
    { nombre: 'organizacion', etiqueta: 'Organización (opcional)', tipo: 'texto', max: LIM.organizacion },
    { nombre: 'distrito', etiqueta: 'Distrito (opcional)', tipo: 'distrito', max: 10 },
    { nombre: 'contacto', etiqueta: 'Contacto para el equipo (opcional, no se publica)', tipo: 'texto', max: LIM.contacto, ayuda: 'Solo lo ve quien modera, para verificar la iniciativa.' },
  ],
};

type Mensaje = { tono: 'ok' | 'cola' | 'error'; texto: string } | null;

function Formulario({ destino, distritos, alCambiarCola }: { destino: Destino; distritos: { id: string; nombre: string }[]; alCambiarCola: () => void }) {
  const uid = useId();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [consentimiento, setConsentimiento] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [enviando, setEnviando] = useState(false);

  const enviarForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cuerpo = { ...valores, consentimiento, web: new FormData(e.currentTarget).get('web') ?? '' };
    const ids = distritos.map((d) => d.id);
    const v = destino === 'testimonios' ? validarTestimonio(cuerpo, ids) : validarIniciativa(cuerpo, ids);
    if (!v.ok) { setErrores(v.errores); setMensaje(null); return; }
    setErrores({});
    setEnviando(true);
    const r = await enviar(destino, cuerpo);
    setEnviando(false);
    alCambiarCola();
    if (r.estado === 'invalido') { setErrores(r.errores); return; }
    if (r.estado === 'rechazado') { setMensaje({ tono: 'error', texto: r.mensaje }); return; }
    setValores({});
    setConsentimiento(false);
    setMensaje(r.estado === 'enviado'
      ? { tono: 'ok', texto: 'Gracias. Quedó pendiente de revisión: lo publicaremos cuando lo moderemos.' }
      : { tono: 'cola', texto: 'Sin conexión: lo guardamos en este dispositivo y se enviará solo cuando vuelva la red.' });
  };

  return (
    <form className="formulario" onSubmit={enviarForm} noValidate>
      {CAMPOS[destino].map((c) => {
        const id = `${uid}-${c.nombre}`;
        const err = errores[c.nombre];
        const comunes = { id, name: c.nombre, value: valores[c.nombre] ?? '', 'aria-invalid': err ? true : undefined, 'aria-describedby': `${id}-ayuda${err ? ` ${id}-error` : ''}` } as const;
        const alCambiar = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValores((v) => ({ ...v, [c.nombre]: e.target.value }));
        return (
          <div className="campo" key={c.nombre}>
            <label htmlFor={id}>{c.etiqueta}</label>
            {c.tipo === 'area' && <textarea {...comunes} maxLength={c.max * 2} onChange={alCambiar} />}
            {c.tipo === 'texto' && <input type="text" {...comunes} maxLength={c.max * 2} onChange={alCambiar} autoComplete="off" />}
            {c.tipo === 'distrito' && (
              <select {...comunes} onChange={alCambiar}>
                <option value="">Sin indicar</option>
                {distritos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            )}
            <span className="ayuda" id={`${id}-ayuda`}>{c.ayuda ?? ''}</span>
            {err && <span className="error" id={`${id}-error`} role="alert">{err}</span>}
          </div>
        );
      })}
      <div className="trampa" aria-hidden="true">
        <label>No llenar este campo<input type="text" name="web" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="campo consent">
        <input
          id={`${uid}-consent`} type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)}
          aria-invalid={errores.consentimiento ? true : undefined} aria-describedby={errores.consentimiento ? `${uid}-consent-error` : undefined}
        />
        <div>
          <label htmlFor={`${uid}-consent`}>Acepto que esto se publique en WIÑAPAY después de ser revisado.</label>
          {errores.consentimiento && <span className="error" id={`${uid}-consent-error`} role="alert">{errores.consentimiento}</span>}
        </div>
      </div>
      <div><button type="submit" className="btn-prim" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar'}</button></div>
      {mensaje && <p className="estado-envio" role="status">{mensaje.texto}</p>}
    </form>
  );
}

export function TestimoniosApp() {
  const [testimonios, setTestimonios] = useState<Testimonio[] | null>(null);
  const [iniciativas, setIniciativas] = useState<Iniciativa[] | null>(null);
  const [distritos, setDistritos] = useState<{ id: string; nombre: string }[]>([]);
  const [cola, setCola] = useState(0);
  const [aviso, setAviso] = useState('');

  const refrescarCola = useCallback(() => { void pendientesEnCola().then(setCola); }, []);

  useEffect(() => {
    let vivo = true;
    traer<Testimonio[]>('/api/testimonios').then((r) => vivo && setTestimonios(r.dato), () => vivo && setTestimonios([]));
    traer<Iniciativa[]>('/api/iniciativas').then((r) => vivo && setIniciativas(r.dato), () => vivo && setIniciativas([]));
    cargarDatos().then((r) => vivo && setDistritos(r.datos.distritos.features.map((f) => ({ id: f.properties.id, nombre: f.properties.nombre }))), () => undefined);
    refrescarCola();
    const alVolver = () => { void vaciarCola().then(refrescarCola); };
    addEventListener('online', alVolver);
    return () => { vivo = false; removeEventListener('online', alVolver); };
  }, [refrescarCola]);

  const nombreDe = (id?: string) => distritos.find((d) => d.id === id)?.nombre;

  const reenviar = async () => {
    const r = await vaciarCola();
    setCola(r.restantes);
    setAviso(r.enviados > 0 ? `Se enviaron ${r.enviados} pendientes.` : r.restantes > 0 ? 'Todavía no hay conexión con el servidor.' : '');
  };

  return (
    <main className="pagina">
      <h1>Testimonios e iniciativas</h1>
      <p className="bajada">Los satélites ven el verdor; quienes viven en el territorio ven lo que significa. Aquí se cuentan los cambios y se conectan las iniciativas de recuperación.</p>

      <section className="panel aviso" aria-labelledby="reglas">
        <h2 id="reglas" style={{ marginTop: 0 }}>Cómo se publican</h2>
        <ul className="lista">
          <li>Todo pasa por moderación antes de aparecer: nada se publica automáticamente.</li>
          <li>Necesitamos tu consentimiento explícito. No pidas ni publiques teléfonos, correos ni nombres completos.</li>
          <li>Si no tienes conexión, tu envío se guarda en este dispositivo y se manda solo al volver la red.</li>
        </ul>
      </section>

      {cola > 0 && (
        <p className="estado-envio" role="status">
          Tienes {cola} {cola === 1 ? 'envío' : 'envíos'} en cola, pendiente{cola === 1 ? '' : 's'} de enviar.{' '}
          <button type="button" className="btn-sec" onClick={reenviar}>Enviar ahora</button> {aviso}
        </p>
      )}

      <h2>Testimonios</h2>
      {testimonios === null ? <p role="status">Cargando…</p> : testimonios.length === 0 ? (
        <p className="vacio">Todavía no hay testimonios publicados. Sé la primera persona en contar lo que ve en tu zona.</p>
      ) : (
        <ul className="tarjetas">
          {testimonios.map((t) => (
            <li key={t.id}><blockquote>{t.texto}</blockquote><span className="firma">{[t.nombre, nombreDe(t.distrito)].filter(Boolean).join(' · ') || 'Anónimo'}</span></li>
          ))}
        </ul>
      )}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Cuenta lo que ves</h3>
        <Formulario destino="testimonios" distritos={distritos} alCambiarCola={refrescarCola} />
      </div>

      <h2>Iniciativas de recuperación</h2>
      {iniciativas === null ? <p role="status">Cargando…</p> : iniciativas.length === 0 ? (
        <p className="vacio">Aún no hay iniciativas publicadas. Si tu comunidad u organización recupera el monte, cuéntanos.</p>
      ) : (
        <ul className="tarjetas">
          {iniciativas.map((i) => (
            <li key={i.id}>
              <h3 style={{ margin: '0 0 4px' }}>{i.titulo}</h3>
              <p style={{ margin: '0 0 6px' }}>{i.descripcion}</p>
              <span className="firma">{[i.organizacion, nombreDe(i.distrito)].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Registra una iniciativa</h3>
        <Formulario destino="iniciativas" distritos={distritos} alCambiarCola={refrescarCola} />
      </div>
    </main>
  );
}
