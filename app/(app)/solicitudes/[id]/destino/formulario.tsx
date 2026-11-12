"use client";

import { useActionState } from "react";
import { AccionesFormulario, ErrorDelFormulario } from "@/components/formulario";
import { Badge } from "@/components/ui/badge";
import { IconoCama } from "@/components/ui/iconos";
import { SIN_ENVIAR, type AccionDeFormulario } from "@/lib/formularios";

export type CentroOpcion = {
  id: string;
  nombre: string;
  ubicacion: string;
  camasDisponibles: number;
  recursosOperativos: number;
};

type Props = {
  /** elegirDestinoAction con el id de la solicitud ya fijado. */
  accion: AccionDeFormulario;
  candidatos: CentroOpcion[];
  tipoCama: string;
  destinoActualId: string | null;
  volverHref: string;
};

/**
 * Ranking de destinos como un grupo de opciones (HU03 y HU04).
 *
 * Radios nativos dentro de un fieldset: se recorren con las flechas del teclado y
 * el lector de pantalla anuncia "1 de 3". El número de cada opción es su puesto
 * en el ranking (sí es una secuencia). Viene marcado el primero del ranking (o el
 * destino que ya tenía), pero nada se guarda hasta que el médico confirma.
 */
export function FormularioDestino({ accion, candidatos, tipoCama, destinoActualId, volverHref }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, SIN_ENVIAR);
  const elegido =
    estado.valores?.centroDestinoId ?? destinoActualId ?? candidatos[0]?.id ?? "";
  const error = estado.errores?.centroDestinoId?.join(" ");

  return (
    <form action={enviar} className="flex flex-col gap-6">
      <ErrorDelFormulario mensaje={estado.error} />

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={error ? "destino-error" : undefined}
      >
        <legend className="mb-2 text-lg font-bold">
          Centros con cama {tipoCama} libre, del más al menos recomendado
        </legend>
        {candidatos.map((centro, posicion) => (
          <label
            key={centro.id}
            className="flex cursor-pointer items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background sm:p-5"
          >
            <input
              type="radio"
              name="centroDestinoId"
              value={centro.id}
              defaultChecked={centro.id === elegido}
              className="mt-1.5 size-4 shrink-0 accent-primary"
            />
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold"
            >
              {posicion + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="break-words font-bold">{centro.nombre}</span>
                {posicion === 0 && <Badge>Más recomendado</Badge>}
                {centro.id === destinoActualId && <Badge variant="outline">Destino actual</Badge>}
              </span>
              <span className="break-words text-sm text-muted-foreground">{centro.ubicacion}</span>
              <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5 font-semibold">
                  <IconoCama className="text-primary" />
                  {centro.camasDisponibles}{" "}
                  {centro.camasDisponibles === 1 ? "cama libre" : "camas libres"}
                </span>
                <span className="text-muted-foreground">
                  {centro.recursosOperativos}{" "}
                  {centro.recursosOperativos === 1 ? "equipo operativo" : "equipos operativos"}
                </span>
              </span>
            </span>
          </label>
        ))}
        {error && (
          <p id="destino-error" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </fieldset>

      <AccionesFormulario
        pendiente={pendiente}
        texto="Confirmar destino"
        textoPendiente="Confirmando…"
        cancelarHref={volverHref}
      />
    </form>
  );
}
