"use client";

import type { EstadoSolicitud } from "@prisma/client";
import Link from "next/link";
import { useId, useState } from "react";
import { BadgeEstado } from "@/components/estado-solicitud";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";

/** Una fila lista para mostrar. Todo serializable: la fecha llega formateada. */
export type SolicitudEnLista = {
  id: string;
  pacienteDni: string;
  estado: EstadoSolicitud;
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
 * Único componente de cliente propio (clase 8; el otro "use client" es
 * error.tsx, que Next exige de cliente).
 *
 * Por qué es de cliente: el filtro guarda en el navegador qué estado eligió el
 * médico y filtra sin volver al servidor. Los datos ya llegan cargados y
 * autorizados desde la página: acá no hay fetch ni useEffect.
 *
 * Resuelve el estado "sin resultados" (clase 10): hay solicitudes, pero ninguna
 * en el estado elegido. Lo sabe solo el cliente. El "vacío" (el centro no tiene
 * ninguna) lo resuelve la página antes de renderizar este componente.
 */
export function FiltroSolicitudes({ solicitudes, estados }: Props) {
  const idFiltro = useId();
  const [estado, setEstado] = useState<EstadoSolicitud | typeof TODOS>(TODOS);

  const visibles =
    estado === TODOS
      ? solicitudes
      : solicitudes.filter((solicitud) => solicitud.estado === estado);
  const etiquetaElegida = estados.find((e) => e.valor === estado)?.etiqueta ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <label htmlFor={idFiltro} className="text-sm font-medium">
          Estado
        </label>
        <NativeSelect
          id={idFiltro}
          value={estado}
          onChange={(evento) =>
            setEstado(
              estados.find((e) => e.valor === evento.target.value)?.valor ?? TODOS,
            )
          }
          className="sm:w-56"
        >
          <option value={TODOS}>Todos</option>
          {estados.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </NativeSelect>
        <p aria-live="polite" className="text-sm text-muted-foreground">
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
        <ul className="flex flex-col gap-3">
          {visibles.map((solicitud) => (
            <li key={solicitud.id}>
              <Link href={`/solicitudes/${solicitud.id}`} className="block rounded-xl">
                <Card className="gap-0 py-4 transition-colors hover:bg-accent">
                  <CardContent className="flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">DNI {solicitud.pacienteDni}</p>
                      <p className="break-words text-sm text-muted-foreground">
                        {solicitud.sentido} · {solicitud.fecha}
                      </p>
                    </div>
                    <BadgeEstado estado={solicitud.estado} />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
