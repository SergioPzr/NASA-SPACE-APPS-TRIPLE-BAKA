import type { Metadata } from 'next';
import Link from 'next/link';
import { Contornos } from '@/components/Contornos';
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
  ['01 · MIRA', 'Recorre los distritos de la provincia y descubre cómo cambió su vegetación.'],
  ['02 · COMPRENDE', 'Tres formas de medir el verdor y una regla clara para afirmar un cambio.'],
  ['03 · ACTÚA', 'Comparte un testimonio o una iniciativa de recuperación de tu comunidad.'],
] as const;

const ATAJOS = [
  { href: '/mapa', simbolo: '⌖', titulo: 'Mapa de Cusco', texto: 'Entra por un distrito, apaga sus focos y descubre cómo cambió su verdor desde 2001.', cta: 'EXPLORAR EL MAPA' },
  { href: '/resumen', simbolo: '▤', titulo: 'Resumen', texto: 'La provincia completa en una tabla, con las tres medidas y su conclusión. Exporta CSV o imagen.', cta: 'VER EL RESUMEN' },
  { href: '/testimonios', simbolo: '✳', titulo: 'Testimonios e iniciativas', texto: 'Cuenta qué has visto en tu territorio o presenta un proyecto de recuperación. Todo se revisa antes de publicarse.', cta: 'PARTICIPAR' },
] as const;

const PILARES = [
  ['NDVI real', `MODIS MOD13Q1, 250 m, compuestos de 16 días, ${periodo}.`],
  ['Tres medidas', 'Media anual, máximo anual y estación seca se muestran juntas, no la que más convenga.'],
  ['El fuego, solo como máscara', 'Marca dónde mirar. No es una segunda variable.'],
  ['Sin conexión', 'Tras la primera visita, el mapa, el resumen y los testimonios abren sin red.'],
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
        <Contornos />
        <div className="hero-contenido">
          <p className="sobretitulo">CUSCO · PERÚ · NASA SPACE APPS 2026</p>
          <h1 id="titulo-hero">El territorio cambia.<br />Hagámoslo visible.</h1>
          <p className="entrada">
            {anios.length} años de verdor satelital de la provincia de Cusco, distrito por distrito, y una mirada honesta sobre qué cambios tienen evidencia y cuáles todavía no.
          </p>
          <div className="acciones-hero">
            <Link href="/mapa" className="btn btn-dorado">Explorar el mapa ↗</Link>
            <Link href="/acerca" className="btn btn-contorno">Cómo lo medimos</Link>
          </div>
        </div>
      </section>

      <ol className="pasos" aria-label="Cómo funciona">
        {PASOS.map(([t, d]) => (
          <li key={t}><b>{t}</b><span>{d}</span></li>
        ))}
      </ol>

      <section className="atajos" aria-label="Por dónde empezar">
        {ATAJOS.map((a) => (
          <Link key={a.href} href={a.href} className="atajo">
            <span className="simbolo" aria-hidden="true">{a.simbolo}</span>
            <h2>{a.titulo}</h2>
            <p>{a.texto}</p>
            <strong>{a.cta} ↗</strong>
          </Link>
        ))}
      </section>

      <section className="banda" aria-labelledby="titulo-banda">
        <div className="banda-interior">
          <div>
            <p className="sobretitulo">UNA SOLA VARIABLE, CONTADA CON HONESTIDAD</p>
            <h2 id="titulo-banda">Un cambio solo se afirma si lo resisten las tres medidas.</h2>
            <p>
              Medimos el verdor de la vegetación (NDVI) de tres maneras y aplicamos la prueba de Mann-Kendall a cada una. Si no coinciden, decimos <em>«aún no hay evidencia suficiente»</em>. Nunca inventamos una tendencia.
            </p>
            <Link href="/acerca" className="btn btn-dorado">Cómo se decide ↗</Link>
          </div>
          <ul className="pilares">
            {PILARES.map(([t, d]) => (
              <li key={t}><b>{t}</b><span>{d}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cifras" aria-label="La provincia en cifras">
        <div><b>{Object.keys(resultados.distritos).length}</b><span>distritos</span></div>
        <div><b>{anios.length}</b><span>años, {periodo}</span></div>
        <div><b>250 m</b><span>resolución del satélite</span></div>
        <div><b>3</b><span>medidas por distrito</span></div>
      </section>
      {hayPrueba && (
        <p className="aviso-landing">
          Las manchas de fuego del mapa son de prueba hasta incorporar el producto MCD64A1 de la NASA; están marcadas así en pantalla.
        </p>
      )}

      <section className="usuarios" aria-labelledby="titulo-usuarios">
        <div className="usuarios-interior">
          <p className="sobretitulo oscuro">PARA QUIÉN ES</p>
          <h2 id="titulo-usuarios">Hecho para quien cuida el territorio.</h2>
          <div className="usuarios-filas">
            {USUARIOS.map(([t, d]) => (
              <article key={t}><h3>{t}</h3><p>{d}</p></article>
            ))}
          </div>
          <Link href="/mapa" className="btn btn-bosque">Empieza por tu distrito ↗</Link>
        </div>
      </section>

      <footer className="pie">
        <div className="pie-interior">
          <div>
            <p className="marca-pie">wiñapay<span>.</span></p>
            <small>El territorio cambia. Hagámoslo visible.</small>
          </div>
          <small>NASA Space Apps 2026 · Cusco, Perú<br />Datos: NASA MODIS (MOD13Q1), NASADEM e INEI.</small>
        </div>
      </footer>
    </main>
  );
}
