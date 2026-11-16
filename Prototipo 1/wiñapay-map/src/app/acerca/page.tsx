import type { Metadata } from 'next';
import Link from 'next/link';
import distritos from '@/data/distritos.json';
import manchas from '@/data/manchas.json';
import resultados from '@/data/resultados.json';
import { EntradaSuave } from '@/components/EntradaSuave';
import { POCOS_PIXELES } from '@/components/portada/datosPortada';

export const metadata: Metadata = { title: 'Acerca de WIÑAPAY' };

/* Cifras calculadas de los datos del proyecto (no escritas a mano) */
const ANIOS = resultados.anios;
const DESDE = ANIOS[0];
const HASTA = ANIOS[ANIOS.length - 1];
const N_DISTRITOS = distritos.features.length;
const N_QUEMAS = manchas.features.length;
const HAY_PRUEBA = manchas.features.some((m) => (m.properties as { es_de_prueba?: boolean }).es_de_prueba);

const QUE_USAMOS = [
  {
    titulo: 'La vegetación',
    texto: `Un satélite de la NASA fotografía Cusco cada 16 días. Con esas fotos medimos qué tan verde está cada zona, en cuadros de 250 metros, durante ${ANIOS.length} años (${DESDE}–${HASTA}).`,
  },
  {
    titulo: 'Los incendios',
    texto: `Otro producto de la NASA marca las zonas que se quemaron. En la provincia hay ${N_QUEMAS} zonas quemadas registradas${HAY_PRUEBA ? ' (por ahora de prueba)' : ''}. Nos dicen dónde mirar con más atención.`,
  },
  {
    titulo: 'El mapa',
    texto: `Los ${N_DISTRITOS} distritos oficiales de la provincia de Cusco y su relieve, para ubicar cada dato en su lugar.`,
  },
];

const COMO_DECIDIMOS = [
  { titulo: 'Lo medimos de tres maneras', texto: 'El promedio de todo el año, el momento más verde del año y la temporada seca (de mayo a septiembre).' },
  { titulo: 'Revisamos los años uno por uno', texto: `Comparamos cómo subió o bajó la vegetación de ${DESDE} a ${HASTA}, para no confundir un año raro con un cambio de verdad.` },
  { titulo: 'Solo afirmamos lo que se repite', texto: 'Decimos «cambió» únicamente cuando las tres maneras de medirlo coinciden. Si no, decimos con honestidad que todavía no se puede asegurar.' },
];

const CONVIENE_SABER = [
  { titulo: 'Los distritos pequeños se ven menos', texto: `En zonas muy pequeñas o casi todo ciudad${POCOS_PIXELES.length ? `, como ${POCOS_PIXELES.join(' y ')}` : ''}, el satélite tiene pocos cuadros para mirar y el resultado es menos seguro.` },
  { titulo: 'Ver un cambio no explica la causa', texto: 'Los datos dicen si la vegetación cambió, no por qué. Para eso hacen falta las voces de quienes viven en el territorio.' },
  { titulo: 'Apagar el fuego es un juego', texto: 'En el mapa, «apagar» un incendio es una forma de explorar los datos; no representa combatir el fuego de verdad.' },
  { titulo: 'Funciona sin internet', texto: 'Después de la primera visita, el mapa y los datos se guardan en tu dispositivo y puedes verlos aunque no tengas conexión.' },
];

const FUENTES = [
  { nombre: 'NASA · MODIS MOD13Q1 (vegetación)', url: 'https://lpdaac.usgs.gov/products/mod13q1v061/' },
  { nombre: 'NASA · MODIS MCD64A1 (zonas quemadas)', url: 'https://lpdaac.usgs.gov/products/mcd64a1v061/' },
  { nombre: 'NASA · NASADEM (relieve)', url: 'https://lpdaac.usgs.gov/products/nasadem_hgtv001/' },
  { nombre: 'INEI · Límites de los distritos', url: 'https://www.inei.gob.pe/' },
];

export default function Acerca() {
  return (
    <main className="pagina ayudar2 acerca2">
      <EntradaSuave />
      <header className="ay-cabecera">
        <p className="ay-bajada ay-entra">Sobre el proyecto</p>
        <h1 className="titulo-centrado ay-entra">Acerca de WIÑAPAY</h1>
        <p className="ay-intro ay-entra">
          Una herramienta para que las comunidades, las ONG y quienes quieran ayudar vean cómo cambió la vegetación de la provincia de Cusco, y qué tan seguros podemos estar de cada cambio.
        </p>
      </header>

      <section aria-labelledby="ac-usamos">
        <h2 id="ac-usamos" className="ay-titulo ay-entra">Qué miramos</h2>
        <ol className="ac-tres">
          {QUE_USAMOS.map((b, i) => (
            <li key={b.titulo} className="ay-practica ay-entra">
              <span className="ay-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{b.titulo}</h3>
              <p>{b.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ac-decidimos" className="ay-practicas-sec">
        <h2 id="ac-decidimos" className="ay-titulo ay-entra">Cómo decidimos si algo cambió</h2>
        <ol className="ac-pasos">
          {COMO_DECIDIMOS.map((p, i) => (
            <li key={p.titulo} className="ac-paso ay-entra">
              <span className="ac-paso-num" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ac-saber" className="ay-practicas-sec">
        <h2 id="ac-saber" className="ay-titulo ay-entra">Lo que conviene saber</h2>
        <ul className="ay-practicas">
          {CONVIENE_SABER.map((p) => (
            <li key={p.titulo} className="ay-practica ay-entra">
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ac-fuentes" className="ay-practicas-sec">
        <h2 id="ac-fuentes" className="ay-titulo ay-entra">De dónde salen los datos</h2>
        <ul className="ac-fuentes ay-entra">
          {FUENTES.map((f) => (
            <li key={f.url}>
              <a className="ay-enlace" href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre} ↗</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="ay-cierre ay-entra">
        <p>Proyecto para el NASA Space Apps Challenge 2026.</p>
        <h2>El territorio cambia. Hagámoslo visible.</h2>
        <div className="ay-cierre-acciones">
          <Link href="/mapa" className="ay-boton">Explorar el mapa</Link>
          <Link href="/resumen" className="ay-boton secundario">Ver el resumen</Link>
        </div>
      </section>
    </main>
  );
}
