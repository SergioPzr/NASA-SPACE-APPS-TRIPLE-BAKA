import { DISTRITOS, MANCHAS, VISTA_MAPA } from './portada/datosPortada';

export { DISTRITOS_CON_FUEGO, DISTRITOS_TOTAL } from './portada/datosPortada';

interface Props {
  /** "fuego": el territorio con las áreas quemadas registradas. "vivo": el mismo territorio sin ellas. */
  variante: 'fuego' | 'vivo';
}

/** Contorno real de los distritos de Cusco (INEI) y áreas quemadas (MCD64A1), solo decorativo en la portada. */
export function MapaPartido({ variante }: Props) {
  const idPixel = `pixel-${variante}`;
  return (
    <svg className={`hero-mapa hero-mapa-${variante}`} viewBox={VISTA_MAPA} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={idPixel} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="4.5" cy="4.5" r="1.7" className="mapa-punto" />
        </pattern>
        {variante === 'fuego' ? (
          <radialGradient id="fuego-grad" cx="45%" cy="40%" r="65%">
            <stop offset="0" style={{ stopColor: 'var(--llama)' }} />
            <stop offset="0.45" style={{ stopColor: 'var(--brasa)' }} />
            <stop offset="0.8" style={{ stopColor: 'var(--terracota)' }} />
            <stop offset="1" style={{ stopColor: 'var(--rojo-fuego)' }} />
          </radialGradient>
        ) : (
          <linearGradient id="vivo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--salvia)' }} />
            <stop offset="1" style={{ stopColor: 'var(--brote)' }} />
          </linearGradient>
        )}
      </defs>
      {DISTRITOS.map((d) => (
        <g key={d.id}>
          <path d={d.d} className="mapa-distrito" />
          <path d={d.d} fill={`url(#${idPixel})`} className="mapa-pixeles" />
        </g>
      ))}
      {variante === 'fuego' && MANCHAS.map((m, i) => <path key={i} d={m.d} className="mapa-mancha" />)}
    </svg>
  );
}
