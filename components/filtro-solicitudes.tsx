"use client";

import type { EstadoSolicitud, NivelUrgencia } from "@prisma/client";
import Link from "next/link";
import { useId, useState } from "react";
import {
  BadgeEstado,
  BadgeNivel,
  claseFranjaNivel,
} from "@/components/estado-solicitud";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconoEntrante, IconoSaliente } from "@/components/ui/iconos";
import { formatearDni } from "@/lib/formato";
import { cn } from "@/lib/utils";

/** Una fila lista para mostrar. Todo serializable: la fecha llega formateada. */
export type SolicitudEnLista = {
  id: string;
  pacienteDni: string;
  estado: EstadoSolicitud;
  /** null mientras no tenga triaje. */
  nivel: NivelUrgencia | null;
  sentido: "entrante" | "saliente";
  /** El centro del otro lado: el de origen si entra, el de destino si sale (null: sin elegir). */
  otroCentro: string | null;
  fecha: string;
};

type Props = {
  solicitudes: SolicitudEnLista[];
  estados: { valor: EstadoSolicitud; etiqueta: string }[];
};

const TODOS = "TODOS";

function textoSentido(solicitud: SolicitudEnLista): string {
  if (solicitud.sentido === "entrante") return `Llega desde ${solicitud.otroCentro}`;
  return solicitud.otroCentro ? `Sale hacia ${solicitud.otroCentro}` : "Sale, sin destino elegido";
}

/**
 * El listado como la pizarra de una guardia: una fila por paciente, con la
 * franja del color del triaje a la izquierda, y arriba el filtro por estado.
 *
 * Por qué es de cliente: el filtro guarda en el navegador qué estado eligió el
 * médico y filtra sin volver al servidor. Los datos ya llegan cargados y
 * autorizados desde la página: acá no hay fetch ni useEffect.
 *
 * El filtro es un grupo de botones con la cantidad de cada estado
 * (aria-pressed marca el elegido). Resuelve el estado "sin resultados" (clase
 * 10): hay solicitudes, pero ninguna en el estado elegido. El "vacío" (el centro
 * no tiene ninguna) lo resuelve la página antes de renderizar este componente.
 */
export function FiltroSolicitudes({ solicitudes, estados }: Props) {
  const idTitulo = useId();
  const [estado, setEstado] = useState<EstadoSolicitud | typeof TODOS>(TODOS);

  const visibles =
    estado === TODOS
      ? solicitudes
      : solicitudes.filter((solicitud) => solicitud.estado === estado);
  const etiquetaElegida = estados.find((e) => e.valor === estado)?.etiqueta ?? "";
  const cantidad = (valor: EstadoSolicitud) =>
    solicitudes.filter((solicitud) => solicitud.estado === valor).length;

  const opciones = [
    { valor: TODOS, etiqueta: "Todos", total: solicitudes.length },
    ...estados.map((e) => ({ ...e, total: cantidad(e.valor) })),
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p id={idTitulo} className="text-sm font-semibold">
          Filtrar por estado
        </p>
        {/* En el teléfono los botones se deslizan de costado en vez de ocupar tres filas. */}
        <div
          role="group"
          aria-labelledby={idTitulo}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {opciones.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={estado === opcion.valor}
              onClick={() => setEstado(opcion.valor)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-accent",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground",
                opcion.total === 0 && "text-muted-foreground",
              )}
            >
              {opcion.etiqueta}
              <span className="text-xs font-semibold opacity-80">{opcion.total}</span>
            </button>
          ))}
        </div>
        <p aria-live="polite" className="sr-only">
          {visibles.length === 1 ? "1 solicitud" : `${visibles.length} solicitudes`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              Ninguna solicitud está en estado «{etiquetaElegida}»
            </CardTitle>
            <CardDescription>
              Hay {solicitudes.length === 1 ? "1 solicitud" : `${solicitudes.length} solicitudes`}{" "}
              en otros estados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setEstado(TODOS)}>
              Mostrar todas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {visibles.map((solicitud) => (
            <li key={solicitud.id}>
              <Link
                href={`/solicitudes/${solicitud.id}`}
                className="relative flex flex-col gap-3 py-4 pr-4 pl-6 transition-colors hover:bg-accent focus-visible:-outline-offset-2 sm:flex-row sm:items-center sm:gap-6"
              >
                <span
                  aria-hidden="true"
                  className={cn("absolute inset-y-0 left-0 w-1.5", claseFranjaNivel(solicitud.nivel))}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-lg font-bold leading-tight">
                    DNI {formatearDni(solicitud.pacienteDni)}
                  </span>
                  <span className="flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
                    {solicitud.sentido === "entrante" ? (
                      <IconoEntrante className="mt-0.5" />
                    ) : (
                      <IconoSaliente className="mt-0.5" />
                    )}
                    <span className="min-w-0 break-words">{textoSentido(solicitud)}</span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <span className="flex flex-wrap gap-1.5 sm:justify-end">
                    <BadgeEstado estado={solicitud.estado} />
                    {solicitud.nivel && <BadgeNivel nivel={solicitud.nivel} />}
                  </span>
                  <span className="text-xs text-muted-foreground">{solicitud.fecha}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
