import { Cargando } from "@/components/cargando";
import { Skeleton } from "@/components/ui/skeleton";

/** Cargando cualquier pantalla del panel: el aviso y una lista genérica. */
export default function CargandoAdmin() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Cargando />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      {[0, 1, 2].map((bloque) => (
        <Skeleton key={bloque} className="h-24 w-full" />
      ))}
    </div>
  );
}
