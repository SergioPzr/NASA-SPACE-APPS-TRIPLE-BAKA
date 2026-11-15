'use client';

import { useEffect, useMemo, useState } from 'react';
import { cargarDatos, type Origen } from './cliente-datos';
import { evaluar, type Evaluacion } from './evidencia';
import type { Datos } from './tipos';

export type EstadoDatos =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'listo'; datos: Datos; origen: Origen; evaluaciones: Record<string, Evaluacion>; evalProvincia: Evaluacion };

export function useDatos(): EstadoDatos & { reintentar: () => void } {
  const [intento, setIntento] = useState(0);
  const [res, setRes] = useState<{ datos: Datos; origen: Origen } | 'error' | null>(null);

  useEffect(() => {
    let vivo = true;
    setRes(null);
    cargarDatos().then((r) => vivo && setRes(r), () => vivo && setRes('error'));
    return () => { vivo = false; };
  }, [intento]);

  const listo = useMemo(() => {
    if (!res || res === 'error') return null;
    const zonas = Object.fromEntries(Object.entries(res.datos.resultados.distritos).map(([id, z]) => [id, z.agregaciones]));
    return { evaluaciones: evaluar(zonas), evalProvincia: evaluar({ provincia: res.datos.resultados.provincia.agregaciones }).provincia };
  }, [res]);

  const reintentar = () => setIntento((n) => n + 1);
  if (res === 'error') return { estado: 'error', reintentar };
  if (!res || !listo) return { estado: 'cargando', reintentar };
  return { estado: 'listo', datos: res.datos, origen: res.origen, ...listo, reintentar };
}
