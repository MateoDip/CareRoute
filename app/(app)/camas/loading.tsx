import { Cargando } from "@/components/cargando";
import { Skeleton } from "@/components/ui/skeleton";

/** Cargando las camas del centro: el aviso y la forma del formulario. */
export default function CargandoCamas() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Cargando texto="Cargando las camas…" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
