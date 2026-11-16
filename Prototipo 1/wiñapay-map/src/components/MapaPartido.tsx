import { DISTRITOS, MANCHAS, VISTA_MAPA } from './portada/datosPortada';

export { DISTRITOS_CON_FUEGO, DISTRITOS_TOTAL } from './portada/datosPortada';

interface Props {
  /** "fuego": el territorio con las áreas quemadas registradas. "vivo": el mismo territorio sin ellas. */
  variante: 'fuego' | 'vivo';
}

/** Contorno real de los distritos de Cusco (INEI) y áreas quemadas (MCD64A1).
 * Todas las geometrías y manchas quedan estrictamente confinadas al interior de los distritos mediante clipPath.
 */
export function MapaPartido({ variante }: Props) {
  const idPixel = `pixel-${variante}`;
  const idClip = `clip-provincia-${variante}`;

  return (
    <svg className={`hero-mapa hero-mapa-${variante}`} viewBox={VISTA_MAPA} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={idPixel} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="4.5" cy="4.5" r="1.7" className="mapa-punto" />
        </pattern>
        <clipPath id={idClip}>
          {DISTRITOS.map((d) => (
            <path key={d.id} d={d.d} />
          ))}
        </clipPath>
        {variante === 'fuego' ? (
          <>
            <radialGradient id="fuego-grad" cx="45%" cy="40%" r="65%">
              <stop offset="0" style={{ stopColor: '#facc15' }} />
              <stop offset="0.4" style={{ stopColor: '#f97316' }} />
              <stop offset="0.75" style={{ stopColor: '#ea580c' }} />
              <stop offset="1" style={{ stopColor: '#dc2626' }} />
            </radialGradient>
            <filter id="fuego-resplandor" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </>
        ) : (
          <linearGradient id="vivo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: '#52b788' }} />
            <stop offset="1" style={{ stopColor: '#2d6a4f' }} />
          </linearGradient>
        )}
      </defs>

      {/* Trama de distritos confinados */}
      <g clipPath={`url(#${idClip})`}>
        {DISTRITOS.map((d) => (
          <g key={d.id}>
            <path d={d.d} className="mapa-distrito" />
            <path d={d.d} fill={`url(#${idPixel})`} className="mapa-pixeles" />
          </g>
        ))}

        {/* Todas las manchas de fuego quedan estrictamente dentro de los distritos */}
        {variante === 'fuego' &&
          MANCHAS.map((m, i) => (
            <path
              key={i}
              d={m.d}
              className="mapa-mancha"
              fill="url(#fuego-grad)"
              filter="url(#fuego-resplandor)"
            />
          ))}
      </g>

      {/* Bordes exteriores de los distritos para nitidez */}
      {DISTRITOS.map((d) => (
        <path key={`borde-${d.id}`} d={d.d} className="mapa-distrito-borde" fill="none" />
      ))}
    </svg>
  );
}
