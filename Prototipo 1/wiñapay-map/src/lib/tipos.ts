import type { NombreAgregacion } from './evidencia';

export type Coord = [number, number];
export type BBox = [number, number, number, number];

export interface DistritoProps {
  id: string;
  nombre: string;
  capital: string;
  centroide: Coord;
  bbox: BBox;
}
export interface Distrito {
  type: 'Feature';
  id: number;
  properties: DistritoProps;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
}
export interface ManchaProps {
  id: number;
  distrito: string;
  area_ha: number;
  es_de_prueba?: boolean;
}
export interface Mancha {
  type: 'Feature';
  id: number;
  properties: ManchaProps;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
}
export interface Curva {
  type: 'Feature';
  properties: { elev: number };
  geometry: { type: 'LineString'; coordinates: number[][] };
}
export interface Coleccion<T> {
  type: 'FeatureCollection';
  features: T[];
}

export interface SerieAgregada {
  serie: number[];
  media: number;
  pendiente_anual: number;
  p: number;
  tau: number;
  n: number;
  significativo: boolean;
  direccion: string;
}
export interface ResultadoZona {
  pixeles: number;
  agregaciones: Record<NombreAgregacion, SerieAgregada>;
  frase_ciudadana?: string;
}
export interface Resultados {
  metodo: {
    variable: string;
    periodo: string;
    agregaciones: Record<NombreAgregacion, string>;
    principal: NombreAgregacion;
    prueba: string;
    nivel: number;
    calidad: string;
  };
  anios: number[];
  distritos: Record<string, ResultadoZona>;
  provincia: ResultadoZona;
}

export interface Datos {
  distritos: Coleccion<Distrito>;
  manchas: Coleccion<Mancha>;
  curvas: Coleccion<Curva>;
  resultados: Resultados;
}

export interface Envio {
  nombre?: string;
  distrito?: string;
  texto: string;
  consentimiento: boolean;
}
export interface Testimonio extends Envio {
  id: string;
  creado: string;
}
export interface Iniciativa {
  id: string;
  titulo: string;
  organizacion?: string;
  distrito?: string;
  descripcion: string;
  contacto_publico?: string;
  creado: string;
}
