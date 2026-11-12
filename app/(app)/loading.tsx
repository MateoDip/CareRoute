import { Skeleton } from "@/components/ui/skeleton";

/**
 * Cargando el listado (clase 10). Next.js envuelve la página en <Suspense> con
 * este archivo: sin useEffect ni bandera. El esqueleto tiene la forma del
 * contenido (título, vistas, filtro y filas), no un spinner centrado.
 */
export default function CargandoListado() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p role="status" className="sr-only">
        Cargando solicitudes…
      </p>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-56 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((chip) => (
          <Skeleton key={chip} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {[0, 1, 2, 3].map((fila) => (
          <div key={fila} className="flex items-center gap-4 py-4 pr-4 pl-6">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
