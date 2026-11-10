import { Skeleton } from "@/components/ui/skeleton";

/**
 * Cargando el listado (clase 10). Next.js envuelve la página en <Suspense> con
 * este archivo: sin useEffect ni bandera. El esqueleto tiene la forma del
 * contenido (título, filtro, tarjetas), no un spinner centrado.
 */
export default function CargandoListado() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p role="status" className="sr-only">
        Cargando solicitudes…
      </p>
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-9 w-full sm:w-72" />
      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((fila) => (
          <li key={fila}>
            <Skeleton className="h-20 w-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
