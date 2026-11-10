"use client";

import { useActionState } from "react";
import { AccionesFormulario, ErrorDelFormulario } from "@/components/formulario";
import { Card, CardContent } from "@/components/ui/card";
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
 * el lector de pantalla anuncia "1 de 3". Viene marcado el primero del ranking
 * (o el destino que ya tenía), pero nada se guarda hasta que el médico confirma.
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
        <legend className="mb-2 font-semibold">
          Centros con cama {tipoCama} libre, del más al menos recomendado
        </legend>
        {candidatos.map((centro, posicion) => (
          <label key={centro.id} className="block cursor-pointer">
            <Card className="gap-0 py-4 transition-colors hover:bg-accent has-[:checked]:bg-accent">
              <CardContent className="flex items-start gap-3 px-4">
                <input
                  type="radio"
                  name="centroDestinoId"
                  value={centro.id}
                  defaultChecked={centro.id === elegido}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="break-words font-medium">
                    {posicion + 1}. {centro.nombre}
                    {centro.id === destinoActualId ? " (destino actual)" : ""}
                  </span>
                  <span className="break-words text-sm text-muted-foreground">
                    {centro.ubicacion} · {centro.camasDisponibles}{" "}
                    {centro.camasDisponibles === 1 ? "cama libre" : "camas libres"} ·{" "}
                    {centro.recursosOperativos}{" "}
                    {centro.recursosOperativos === 1 ? "equipo operativo" : "equipos operativos"}
                  </span>
                </span>
              </CardContent>
            </Card>
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
