const BD = 'winapay';
const VERSION = 1;
export type Almacen = 'datos' | 'cola';

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    if (typeof indexedDB === 'undefined') return mal(new Error('sin IndexedDB'));
    const rq = indexedDB.open(BD, VERSION);
    rq.onupgradeneeded = () => {
      rq.result.createObjectStore('datos');
      rq.result.createObjectStore('cola', { keyPath: 'idLocal', autoIncrement: true });
    };
    rq.onsuccess = () => ok(rq.result);
    rq.onerror = () => mal(rq.error);
  });
}

async function tx<T>(almacen: Almacen, modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((ok, mal) => {
      const rq = f(db.transaction(almacen, modo).objectStore(almacen));
      rq.onsuccess = () => ok(rq.result);
      rq.onerror = () => mal(rq.error);
    });
  } finally {
    db.close();
  }
}

export const guardarDato = (clave: string, valor: unknown) => tx('datos', 'readwrite', (s) => s.put(valor, clave)).catch(() => undefined);
export const leerDato = <T>(clave: string) => tx<T | undefined>('datos', 'readonly', (s) => s.get(clave)).catch(() => undefined);

export interface ItemCola {
  idLocal?: number;
  destino: 'testimonios' | 'iniciativas';
  cuerpo: Record<string, unknown>;
  creado: number;
}
export const encolar = (item: Omit<ItemCola, 'idLocal'>) => tx('cola', 'readwrite', (s) => s.add(item));
export const leerCola = () => tx<ItemCola[]>('cola', 'readonly', (s) => s.getAll()).catch(() => [] as ItemCola[]);
export const quitarDeCola = (id: number) => tx('cola', 'readwrite', (s) => s.delete(id)).catch(() => undefined);
