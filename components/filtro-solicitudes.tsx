"use client";

import type { EstadoSolicitud } from "@prisma/client";
import Link from "next/link";
import { useId, useState } from "react";

/** Una fila lista para mostrar. Todo serializable: la fecha llega formateada. */
export type SolicitudEnLista = {
  id: string;
  pacienteDni: string;
  estado: EstadoSolicitud;
  estadoEtiqueta: string;
  /** "Entrante · desde Hospital X", "Saliente · sin destino todavía"… */
  sentido: string;
  fecha: string;
};

type Props = {
  solicitudes: SolicitudEnLista[];
  estados: { valor: EstadoSolicitud; etiqueta: string }[];
};

const TODOS = "TODOS";

/**
 * Único componente de cliente del proyecto (clase 8).
 *
 * Por qué es de cliente: el filtro guarda en el navegador qué estado eligió el
 * médico y filtra sin volver al servidor. Los datos ya llegan cargados y
 * autorizados desde la página: acá no hay fetch ni useEffect.
 */
export function FiltroSolicitudes({ solicitudes, estados }: Props) {
  const idFiltro = useId();
  const [estado, setEstado] = useState<EstadoSolicitud | typeof TODOS>(TODOS);

  const visibles =
    estado === TODOS
      ? solicitudes
      : solicitudes.filter((solicitud) => solicitud.estado === estado);
  const etiquetaElegida = estados.find((e) => e.valor === estado)?.etiqueta;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <label htmlFor={idFiltro} className="font-medium">
          Estado
        </label>
        <select
          id={idFiltro}
          value={estado}
          onChange={(evento) =>
            setEstado(
              estados.find((e) => e.valor === evento.target.value)?.valor ?? TODOS,
            )
          }
          className="rounded border border-foreground/30 bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <option value={TODOS}>Todos</option>
          {estados.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
        <p aria-live="polite" className="text-sm text-foreground/70">
          {visibles.length === 1
            ? "1 solicitud"
            : `${visibles.length} solicitudes`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded border border-foreground/15 p-4">
          No hay solicitudes en estado «{etiquetaElegida}». Elegí otro estado o
          «Todos».
        </p>
      ) : (
        <ul className="divide-y divide-foreground/15 rounded border border-foreground/15">
          {visibles.map((solicitud) => (
            <li key={solicitud.id}>
              <Link
                href={`/solicitudes/${solicitud.id}`}
                className="flex flex-col gap-1 p-4 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="flex flex-col">
                  <span className="font-medium">DNI {solicitud.pacienteDni}</span>
                  <span className="text-sm text-foreground/70">
                    {solicitud.sentido} · {solicitud.fecha}
                  </span>
                </span>
                <span className="self-start rounded-full border border-foreground/30 px-3 py-0.5 text-sm sm:self-auto">
                  {solicitud.estadoEtiqueta}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
