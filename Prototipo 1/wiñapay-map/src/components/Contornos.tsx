const ANCHO = 1400;
const ALTO = 640;

function anillo(cx: number, cy: number, r: number, k: number, semilla: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 140; i++) {
    const t = (i / 140) * Math.PI * 2;
    const f = 1 + 0.17 * Math.sin(3 * t + k * 0.35 + semilla) + 0.09 * Math.sin(5 * t + 1.3 + k * 0.2) + 0.05 * Math.sin(2 * t - k * 0.3 + semilla * 2);
    pts.push(`${i ? 'L' : 'M'}${(cx + r * f * 1.35 * Math.cos(t)).toFixed(1)} ${(cy + r * f * Math.sin(t)).toFixed(1)}`);
  }
  return pts.join('') + 'Z';
}

const GRUPOS = [
  { cx: 1010, cy: 300, n: 16, paso: 34, semilla: 0 },
  { cx: 220, cy: 520, n: 9, paso: 30, semilla: 2.1 },
];

/** Líneas de nivel decorativas, generadas sin datos ni imágenes externas. */
export function Contornos() {
  return (
    <svg className="contornos" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {GRUPOS.flatMap((g, gi) =>
        Array.from({ length: g.n }, (_, k) => (
          <path key={`${gi}-${k}`} d={anillo(g.cx, g.cy, 26 + k * g.paso, k, g.semilla)} className={k % 5 === 4 ? 'maestra' : undefined} />
        )),
      )}
    </svg>
  );
}
