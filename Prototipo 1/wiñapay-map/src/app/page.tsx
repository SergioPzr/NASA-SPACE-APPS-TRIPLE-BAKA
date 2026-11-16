import type { Metadata } from 'next';
import Link from 'next/link';
import { DISTRITOS_CON_FUEGO, DISTRITOS_TOTAL, MapaPartido } from '@/components/MapaPartido';
import { AnimacionesPortada } from '@/components/portada/AnimacionesPortada';
import { HistoriaSatelite } from '@/components/portada/HistoriaSatelite';
import { CarruselOng, type OngData } from '@/components/portada/CarruselOng';
import manchas from '@/data/manchas.json';
import resultados from '@/data/resultados.json';
import './landing.css';

export const metadata: Metadata = {
  title: { absolute: 'WIÑAPAY · El territorio cambia. Hagámoslo visible.' },
};

const anios = resultados.anios;
const hayPrueba = manchas.features.some((m) => m.properties.es_de_prueba);

const ATAJOS = [
  {
    href: '/mapa',
    tono: 'arcilla',
    titulo: 'Mapa de Cusco',
    texto: 'Entra por un distrito, apaga sus focos y descubre cómo cambió su verdor desde 2001.',
    cta: 'Explorar el mapa',
  },
  {
    href: '/resumen',
    tono: 'siena',
    titulo: 'Resumen Provincial',
    texto: 'La provincia completa en una tabla con las tres medidas. Exporta en CSV o imagen.',
    cta: 'Ver el resumen',
  },
  {
    href: '/testimonios',
    tono: 'arena',
    titulo: 'Testimonios e Iniciativas',
    texto: 'Relatos documentados de comunidades afectadas y proyectos comunales de recuperación.',
    cta: 'Conocer testimonios',
  },
] as const;

/* Organizaciones reales y verificadas en Cusco con fotos locales */
const ONGS_AYUDA: readonly OngData[] = [
  {
    id: 'ecoan',
    org: 'ECOAN / Acción Andina',
    titulo: 'Reforestación con queñuales',
    desc: 'Más de 12.3 millones de árboles nativos de queñua plantados con comunidades en la cuenca de Vilcanota.',
    url: 'https://ecoanperu.org',
    tipo: 'reforestacion',
    imagen: '/img/ong/ecoan.jpg',
  },
  {
    id: 'vallesagrado',
    org: 'Valle Sagrado Verde',
    titulo: 'Restauración en el Valle Sagrado',
    desc: 'Plantación comunitaria de especies nativas (queñua, chachacomo, molle) en laderas degradadas.',
    url: 'https://vallesagradoverde.org',
    tipo: 'reforestacion',
    imagen: '/img/ong/vallesagrado.jpg',
  },
  {
    id: 'profonanpe',
    org: 'Profonanpe / Perú por Naturaleza',
    titulo: 'Fondo de Emergencia Incendios',
    desc: 'Financiamiento directo para rehabilitación de suelos afectados y apoyo a comunidades de Cusco.',
    url: 'https://profonanpe.org.pe',
    tipo: 'donacion',
    imagen: '/img/ong/profonanpe.jpg',
  },
  {
    id: 'wwf',
    org: 'WWF Perú',
    titulo: 'Adaptación climática en Vilcanota',
    desc: 'Proyectos comunales de siembra de agua y conservación de cuencas altoandinas frente al cambio climático.',
    url: 'https://www.wwf.org.pe',
    tipo: 'donacion',
    imagen: '/img/ong/wwf.jpg',
  },
  {
    id: 'sernanp',
    org: 'SERNANP / SERFOR',
    titulo: 'Brigadas forestales voluntarias',
    desc: 'Capacitación comunal en cortafuegos, monitoreo y combate de incendios en áreas protegidas de Cusco.',
    url: 'https://www.gob.pe/sernanp',
    tipo: 'voluntariado',
    imagen: '/img/ong/sernanp.jpg',
  },
  {
    id: 'spda',
    org: 'SPDA / Actualidad Ambiental',
    titulo: 'Defensa legal y comunal',
    desc: 'Asesoría jurídica y campañas por los derechos de comunidades campesinas afectadas por emergencias ambientales.',
    url: 'https://www.actualidadambiental.pe',
    tipo: 'voluntariado',
    imagen: '/img/ong/spda.jpg',
  },
] as const;

export default function Inicio() {
  return (
    <main className="landing">

      {/* ════════════════════════════════════════════════════════════
          HERO — Pantalla completa con dos fases:
          Fase 0: Cusco verde vivo (latido mecánico sin cambio de color)
          Fase 1: Mitad izquierda se quema, texto aparece sin cortes
          ════════════════════════════════════════════════════════════ */}
      <section className="hero" aria-labelledby="titulo-hero">

        {/* Capa 1 — Territorio vivo (siempre visible como base) */}
        <div className="hero-capa hero-vivo" aria-hidden="true">
          <MapaPartido variante="vivo" />
        </div>

        {/* Capa 2 — Territorio quemado (oculta inicialmente, --c comienza en 0) */}
        <div className="hero-capa hero-fuego">
          <div className="hero-fuego-interior">
            <MapaPartido variante="fuego" />
          </div>
        </div>

        {/* Texto del hero — invisible hasta que se quema el mapa */}
        <div className="hero-pie" aria-hidden="true">
          <p className="hero-leyenda-izq">
            {DISTRITOS_CON_FUEGO} de {DISTRITOS_TOTAL} distritos con áreas quemadas registradas por satélite.
          </p>
          <h1 id="titulo-hero" className="hero-titulo">
            El territorio cambia.<br />Hagámoslo visible.
          </h1>
          <div className="hero-pie-acciones">
            <p className="entrada">
              {anios.length} años de verdor satelital de la provincia de Cusco, distrito por distrito, y una mirada honesta sobre qué cambios tienen evidencia y cuáles todavía no.
            </p>
            <div className="acciones-hero">
              <Link href="/mapa" className="btn btn-dorado">Explorar el mapa</Link>
              <Link href="/acerca" className="btn btn-blanco-subrayado">Cómo lo medimos</Link>
            </div>
          </div>
        </div>

        {/* Control de teclado accesible (oculto visualmente) */}
        <label className="corte-control">
          <span>Mover el corte entre los dos territorios</span>
          <input type="range" min={8} max={92} defaultValue={8} />
        </label>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CONTENIDO DE SCROLL — se desbloquea tras la quema
          ════════════════════════════════════════════════════════════ */}
      <div className="scroll-contenido" aria-hidden="true">

        {hayPrueba && (
          <p className="aviso-landing">
            Las manchas de fuego del mapa son de prueba hasta incorporar el producto MCD64A1 de la NASA; están marcadas así en pantalla.
          </p>
        )}

        {/* Constelación satelital + fotos al costado sincronizadas */}
        <HistoriaSatelite />

        {/* Atajos a las herramientas con hover dramático */}
        <section className="atajos" aria-label="Por dónde empezar">
          {ATAJOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`atajo atajo-${a.tono}`}
              data-seguidor={a.cta}
            >
              <h2>{a.titulo}</h2>
              <p>{a.texto}</p>
              <strong>{a.cta}</strong>
            </Link>
          ))}
        </section>

        {/* CTA ¿Cómo ayudar? con carrusel deslizable con rueda y arrastre */}
        <section className="cta-ayudar" aria-labelledby="titulo-cta-ayudar">
          <div className="cta-ayudar-interior">
            <span className="cta-ayudar-bajada">Más allá de los datos</span>
            <h2 id="titulo-cta-ayudar">Los mapas muestran lo que cambió.<br />Tú puedes apoyar la recuperación.</h2>
            <p>Iniciativas verificadas de reforestación con queñuales nativos, fondos de emergencia y prácticas para cuidar las cuencas de Cusco.</p>
            <div className="cta-ayudar-acciones">
              <Link href="/ayudar" className="btn btn-dorado">¿Cómo ayudar?</Link>
              <Link href="/testimonios" className="btn btn-secundario">Ver iniciativas locales</Link>
            </div>
          </div>

          {/* Carrusel interactivo con scroll lateral, rueda y botones */}
          <CarruselOng ongs={ONGS_AYUDA} />
        </section>

        {/* Pie monumental — eslogan protagonista y marca wiñapay */}
        <footer className="pie">
          <div className="pie-eslogan-wrap">
            <h2 className="pie-eslogan">
              El territorio cambia.<br />
              <em>Hagámoslo visible.</em>
            </h2>
          </div>
          <p className="marca-pie" aria-label="wiñapay">wiñapay<span>.</span></p>
        </footer>
      </div>

      <AnimacionesPortada />
    </main>
  );
}
