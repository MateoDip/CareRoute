import { Skeleton } from "@/components/ui/skeleton";

/** Cargando la ficha: misma forma que el contenido (volver, DNI, pasos, qué sigue y tarjetas). */
export default function CargandoFicha() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p role="status" className="sr-only">
        Cargando la solicitud…
      </p>
      <Skeleton className="h-8 w-52" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-5 w-44" />
      </div>
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-36 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((tarjeta) => (
          <Skeleton key={tarjeta} className="h-44 w-full" />
        ))}
      </div>
    </div>
  );
}
