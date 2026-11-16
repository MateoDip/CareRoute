import { Cargando } from "@/components/cargando";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Cargando el formulario de triaje. Sin este archivo, Next mostraba el esqueleto del listado (el
 * loading.tsx más cercano) o dejaba la pantalla anterior quieta hasta que el
 * servidor respondía. Con él, el cambio de pantalla es inmediato: el aviso y la
 * forma del contenido aparecen apenas se toca el enlace.
 */
export default function CargandoTriaje() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Cargando texto="Cargando el triaje…" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
