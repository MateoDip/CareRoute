import { Skeleton } from "@/components/ui/skeleton";

/** Cargando la ficha: misma forma que el contenido (volver, título, badges y tarjetas). */
export default function CargandoFicha() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p role="status" className="sr-only">
        Cargando la solicitud…
      </p>
      <Skeleton className="h-5 w-48" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      {[0, 1, 2].map((tarjeta) => (
        <Skeleton key={tarjeta} className="h-40 w-full" />
      ))}
    </div>
  );
}
