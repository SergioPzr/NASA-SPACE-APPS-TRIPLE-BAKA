import type { Metadata } from 'next';
import { AyudarApp } from '@/components/AyudarApp';

export const metadata: Metadata = {
  title: 'WIÑAPAY · ¿Cómo ayudar?',
  description: 'Iniciativas de reforestación, donaciones de emergencia, voluntariado y formas de apoyar a las comunidades de Cusco afectadas por incendios y cambio climático.',
};

const INICIATIVAS = [
  {
    id: 'ecoan',
    titulo: 'Reforestación con queñuales nativos',
    org: 'ECOAN / Acción Andina',
    descripcion:
      'Desde el año 2000, Acción Andina trabaja con más de 25 comunidades de la región Vilcanota en Cusco para plantar Polylepis (queñua), el árbol más alto del mundo. Han restaurado más de 185,000 hectáreas en seis países andinos y plantado 12,3 millones de árboles nativos. Fue declarada Iniciativa Emblemática de la Década ONU de Restauración de Ecosistemas en 2024.',
    url: 'https://ecoanperu.org',
    urlTexto: 'ecoanperu.org',
    tipo: 'reforestacion',
  },
  {
    id: 'vallesagrado',
    titulo: 'Restauración en el Valle Sagrado',
    org: 'Valle Sagrado Verde',
    descripcion:
      'Programa de reforestación en el Valle Sagrado de los Incas con queñua, chachacomo, molle y tara. Involucra a comunidades locales y visitantes en jornadas de plantación y monitoreo de la recuperación del ecosistema.',
    url: 'https://vallesagradoverde.org',
    urlTexto: 'vallesagradoverde.org',
    tipo: 'reforestacion',
  },
  {
    id: 'profonanpe',
    titulo: 'Fondo de Emergencia para Incendios',
    org: 'Profonanpe / Perú por Naturaleza',
    descripcion:
      'Fondo de donaciones de emergencia para comunidades afectadas por incendios forestales en todo el Perú, incluida la región Cusco. Los fondos financian rehabilitación de suelos, reforestación y apoyo a familias desplazadas.',
    url: 'https://profonanpe.org.pe',
    urlTexto: 'profonanpe.org.pe',
    yape: '961 853 072',
    tipo: 'donacion',
  },
  {
    id: 'wwf',
    titulo: 'Adaptación al cambio climático en Andes del sur',
    org: 'WWF Perú',
    descripcion:
      'WWF Perú apoya a comunidades altoandinas afectadas por incendios y el retroceso glaciar en la Cordillera del Vilcanota, con planes de adaptación hídrica, restauración de ecosistemas y reducción de riesgos ante eventos extremos.',
    url: 'https://www.wwf.org.pe',
    urlTexto: 'wwf.org.pe',
    tipo: 'donacion',
  },
  {
    id: 'sernanp',
    titulo: 'Brigadas forestales voluntarias',
    org: 'SERNANP / SERFOR',
    descripcion:
      'Programa de capacitación de comuneros en técnicas de líneas cortafuego y monitoreo temprano de incendios en zonas de amortiguamiento de Áreas Naturales Protegidas, incluido el entorno del Santuario Histórico de Machu Picchu y la provincia de Cusco.',
    url: 'https://www.gob.pe/sernanp',
    urlTexto: 'gob.pe/sernanp',
    tipo: 'voluntariado',
  },
  {
    id: 'spda',
    titulo: 'Incidencia legal y campañas ambientales',
    org: 'SPDA / Actualidad Ambiental',
    descripcion:
      'La Sociedad Peruana de Derecho Ambiental impulsa campañas de incidencia legal por los derechos de las comunidades afectadas por desastres naturales y cambio climático, y mantiene el portal de noticias ambientales más completo del Perú.',
    url: 'https://www.actualidadambiental.pe',
    urlTexto: 'actualidadambiental.pe',
    tipo: 'voluntariado',
  },
] as const;

const PRACTICAS = [
  {
    icono: '🔥',
    titulo: 'Evita quemas no controladas en temporada seca',
    texto:
      'La mayoría de los incendios en Cusco empiezan por quemas hechas por personas. Entre mayo y noviembre la vegetación altoandina está seca y una chispa puede volverse incontrolable en minutos. Si necesitas hacer una quema de pastos, coordina con tu comunidad y respeta las normas municipales.',
  },
  {
    icono: '🌱',
    titulo: 'Planta especies nativas',
    texto:
      'La queñua (Polylepis), el chachacomo y el molle retienen el agua de las cuencas y resisten mejor el fuego que las especies exóticas. Participa en jornadas comunitarias de reforestación o contacta a las organizaciones de esta página.',
  },
  {
    icono: '💧',
    titulo: 'Protege los bofedales y ojos de agua',
    texto:
      'Los bofedales (humedales altoandinos) actúan como esponjas que almacenan agua durante las lluvias y la liberan en la temporada seca. Evita el pastoreo intensivo en estas zonas y denuncia cualquier intervención ilegal.',
  },
  {
    icono: '📡',
    titulo: 'Difunde los datos',
    texto:
      'Comparte los mapas y el resumen de WIÑAPAY con tu comunidad, municipio u organización. Los datos satelitales de la NASA son una evidencia objetiva que puede apoyar solicitudes de atención o proyectos de restauración.',
  },
];

export default function PaginaAyudar() {
  return <AyudarApp iniciativas={INICIATIVAS} practicas={PRACTICAS} />;
}
