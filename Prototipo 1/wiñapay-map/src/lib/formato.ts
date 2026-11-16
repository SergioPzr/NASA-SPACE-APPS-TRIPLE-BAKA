export const fmtP = (p: number) => (p < 0.001 ? '<0.001' : p.toFixed(3));
export const signo = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3);
export const porDecada = (pendienteAnual: number) => pendienteAnual * 10;
export const textoP = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`);
