import type { Metadata } from 'next';
import Link from 'next/link';
import { DISTRITOS_CON_FUEGO, DISTRITOS_TOTAL, MapaPartido } from '@/components/MapaPartido';
import { AnimacionesPortada } from '@/components/portada/AnimacionesPortada';
import { HistoriaSatelite } from '@/components/portada/HistoriaSatelite';
import manchas from '@/data/manchas.json';
import resultados from '@/data/resultados.json';
import './landing.css';

export const metadata: Metadata = {
  title: { absolute: 'WIÑAPAY · El territorio cambia. Hagámoslo visible.' },
};

const anios = resultados.anios;
const periodo = `${anios[0]}–${anios[anios.length - 1]}`;
const hayPrueba = manchas.features.some((m) => m.properties.es_de_prueba);

const PASOS = [
  ['Mira', 'Recorre los distritos de la provincia y descubre cómo cambió su vegetación.'],
  ['Comprende', 'Tres formas de medir el verdor y una regla clara para afirmar un cambio.'],
  ['Actúa', 'Comparte un testimonio o una iniciativa de recuperación de tu comunidad.'],
] as const;

const ATAJOS = [
  { href: '/mapa', tono: 'bosque', seguidor: 'Abrir el mapa', titulo: 'Mapa de Cusco', texto: 'Entra por un distrito, apaga sus focos y descubre cómo cambió su verdor desde 2001.', cta: 'EXPLORAR EL MAPA' },
  { href: '/resumen', tono: 'salvia', seguidor: 'Ver la tabla', titulo: 'Resumen', texto: 'La provincia completa en una tabla, con las tres medidas y su conclusión. Exporta CSV o imagen.', cta: 'VER EL RESUMEN' },
  { href: '/testimonios', tono: 'arena', seguidor: 'Contar lo que ves', titulo: 'Testimonios e iniciativas', texto: 'Cuenta qué has visto en tu territorio o presenta un proyecto de recuperación. Todo se revisa antes de publicarse.', cta: 'PARTICIPAR' },
] as const;

const PILARES = [
  ['NDVI real', `MODIS MOD13Q1, 250 m, compuestos de 16 días, ${periodo}.`],
  ['Tres medidas', 'Media anual, máximo anual y estación seca se muestran juntas, no la que más convenga.'],
  ['El fuego, solo como máscara', 'Marca dónde mirar. No es una segunda variable.'],
  ['Sin conexión', 'Tras la primera visita, el mapa, el resumen y los testimonios abren sin red.'],
] as const;

const LEMAS = [
  'Una sola variable: el verdor',
  'Tres formas de medirlo, juntas',
  '«Aún no hay evidencia» no es «no hay cambio»',
  `Datos abiertos de la NASA, ${periodo}`,
  'El fuego marca dónde mirar',
  'Funciona sin conexión',
] as const;

const USUARIOS = [
  ['Comunidades locales', 'Ver en su propio territorio qué cambió, y dejar su testimonio.'],
  ['ONG', 'Decidir dónde mirar primero con evidencia que se puede exportar.'],
  ['Empresas benéficas', 'Respaldar iniciativas de recuperación con datos abiertos de la NASA.'],
] as const;

export default function Inicio() {
  return (
    <main className="landing">
      <section className="hero" aria-labelledby="titulo-hero">
        <div className="hero-partido">
          <div className="hero-capa hero-vivo" aria-hidden="true">
            <MapaPartido variante="vivo" />
            <p className="hero-titulo">El territorio cambia.<br />Hagámoslo visible.</p>
            <p className="hero-leyenda hero-leyenda-der">El mismo territorio, sin ellas.</p>
            <p className="hero-cifra"><b>250 m</b><span>es lo que mide cada píxel del satélite.</span></p>
          </div>
          <div className="hero-capa hero-fuego">
            <div className="hero-fuego-interior">
              <MapaPartido variante="fuego" />
              <h1 id="titulo-hero" className="hero-titulo">El territorio cambia.<br />Hagámoslo visible.</h1>
              <p className="hero-leyenda hero-leyenda-izq">
                {DISTRITOS_CON_FUEGO} de {DISTRITOS_TOTAL} distritos con áreas quemadas registradas por satélite.
              </p>
            </div>
          </div>
        </div>
        <label className="corte-control">
          <span>Mover el corte entre los dos territorios</span>
          <input type="range" min={8} max={92} defaultValue={56} />
        </label>
        <div className="hero-pie">
          <p className="entrada">
            {anios.length} años de verdor satelital de la provincia de Cusco, distrito por distrito, y una mirada honesta sobre qué cambios tienen evidencia y cuáles todavía no.
          </p>
          <div className="acciones-hero">
            <Link href="/mapa" className="btn btn-dorado">Explorar el mapa</Link>
            <Link href="/acerca" className="enlace-hero">Cómo lo medimos</Link>
          </div>
        </div>
      </section>

      <ol className="pasos" aria-label="Cómo funciona" data-fondo="crema">
        {PASOS.map(([t, d]) => (
          <li key={t}><h2>{t}</h2><span>{d}</span></li>
        ))}
      </ol>

      <HistoriaSatelite />
      {hayPrueba && (
        <p className="aviso-landing">
          Las manchas de fuego del mapa son de prueba hasta incorporar el producto MCD64A1 de la NASA; están marcadas así en pantalla.
        </p>
      )}

      <section className="banda" aria-labelledby="titulo-banda" data-fondo="bosque">
        <div className="banda-interior">
          <div>
            <p className="banda-bajada">Una sola variable, contada con honestidad</p>
            <h2 id="titulo-banda">Un cambio solo se afirma si lo resisten las tres medidas.</h2>
            <p>
              Medimos el verdor de la vegetación (NDVI) de tres maneras y aplicamos la prueba de Mann-Kendall a cada una. Si no coinciden, decimos <em>«aún no hay evidencia suficiente»</em>. Nunca inventamos una tendencia.
            </p>
            <Link href="/acerca" className="btn btn-dorado">Cómo se decide</Link>
          </div>
          <ul className="pilares">
            {PILARES.map(([t, d]) => (
              <li key={t}><b>{t}</b><span>{d}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cinta" aria-label="Nuestros principios">
        <div className="cinta-pista">
          {[0, 1].map((copia) => (
            <ul key={copia} className="cinta-grupo" aria-hidden={copia === 1 ? true : undefined}>
              {LEMAS.map((l) => <li key={l}>{l}<span className="cinta-sep" aria-hidden="true" /></li>)}
            </ul>
          ))}
        </div>
      </section>

      <section className="atajos" aria-label="Por dónde empezar">
        {ATAJOS.map((a) => (
          <Link key={a.href} href={a.href} className={`atajo atajo-${a.tono}`} data-seguidor={a.seguidor}>
            <h2>{a.titulo}</h2>
            <p>{a.texto}</p>
            <strong>{a.cta}</strong>
          </Link>
        ))}
      </section>

      <section className="usuarios" aria-labelledby="titulo-usuarios" data-fondo="arena">
        <p className="usuarios-bajada">Para quién es</p>
        <h2 id="titulo-usuarios">Hecho para quien cuida el territorio.</h2>
        <div className="usuarios-filas">
          {USUARIOS.map(([t, d]) => (
            <article key={t}><h3>{t}</h3><p>{d}</p></article>
          ))}
        </div>
        <Link href="/mapa" className="btn btn-bosque">Empieza por tu distrito</Link>
      </section>

      <footer className="pie">
        <div className="pie-datos">
          <small>El territorio cambia. Hagámoslo visible.</small>
          <small>NASA Space Apps 2026 · Cusco, Perú. Datos: NASA MODIS (MOD13Q1, MCD64A1), NASADEM e INEI.</small>
        </div>
        <p className="marca-pie" aria-label="wiñapay">wiñapay<span>.</span></p>
      </footer>

      <AnimacionesPortada />
    </main>
  );
}
