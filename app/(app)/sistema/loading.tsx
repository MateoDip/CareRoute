import { Cargando } from "@/components/cargando";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Cargando la galería del sistema visual. Sin este archivo, Next mostraba el esqueleto del listado (el
 * loading.tsx más cercano) o dejaba la pantalla anterior quieta hasta que el
 * servidor respondía. Con él, el cambio de pantalla es inmediato: el aviso y la
 * forma del contenido aparecen apenas se toca el enlace.
 */
export default function CargandoSistema() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Cargando texto="Cargando la galería…" />
      <Skeleton className="h-9 w-64 max-w-full" />
      {[0, 1, 2].map((seccion) => (
        <Skeleton key={seccion} className="h-40 w-full" />
      ))}
    </div>
  );
}
