/** Misma preferencia que usa el mapa: el «Modo ligero» guardado manda; si no hay, se sigue al sistema. */
export const CLAVE_LIGERO = 'winapay-ligero';

export function movimientoReducido(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(CLAVE_LIGERO);
    if (v !== null) return v === '1';
  } catch { /* sin almacenamiento */ }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
