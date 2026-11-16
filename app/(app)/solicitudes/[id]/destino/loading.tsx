import { Cargando } from "@/components/cargando";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Cargando el ranking de destinos, la pantalla que más tarda (calcula camas y
 * puntajes). Sin este archivo, Next mostraba el esqueleto del listado (el
 * loading.tsx más cercano) o dejaba la pantalla anterior quieta hasta que el
 * servidor respondía. Con él, el cambio de pantalla es inmediato: el aviso y la
 * forma del contenido aparecen apenas se toca el enlace.
 */
export default function CargandoDestino() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Cargando texto="Buscando centros con cama…" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((opcion) => (
          <Skeleton key={opcion} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
