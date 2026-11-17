"use client";

import type { TipoUnidad } from "@prisma/client";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { ErrorDelFormulario } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ETIQUETA_UNIDAD } from "@/lib/formato";
import { SIN_ENVIAR, type AccionDeFormulario } from "@/lib/formularios";

const TIPOS = ["UTI", "UCO", "SALA_COMUN", "GUARDIA"] as const satisfies readonly TipoUnidad[];

type Props = {
  /** La Server Action con el id de la solicitud ya fijado con .bind. */
  accion: AccionDeFormulario;
  /** Dónde está internado hoy: no aparece entre las opciones. */
  tipoActual: TipoUnidad;
};

/**
 * Pase de unidad del paciente internado (regla 7): un <select> con las otras
 * unidades y un botón. Si no queda cama del tipo elegido, el rechazo
 * ("Capacidad agotada") aparece arriba y el paciente sigue donde estaba.
 */
export function FormularioCambioDeUnidad({ accion, tipoActual }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, SIN_ENVIAR);
  const opciones = TIPOS.filter((tipo) => tipo !== tipoActual);

  return (
    <form action={enviar} noValidate className="flex flex-col gap-3">
      <ErrorDelFormulario mensaje={estado.error} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-64">
          <Campo etiqueta="Pasar a la unidad" errores={estado.errores?.tipo}>
            {(control) => (
              // key: React 19 reinicia el formulario y un <select> no toma el defaultValue nuevo.
              <NativeSelect
                {...control}
                key={estado.valores?.tipo ?? opciones[0]}
                name="tipo"
                defaultValue={estado.valores?.tipo ?? opciones[0]}
              >
                {opciones.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ETIQUETA_UNIDAD[tipo]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Campo>
        </div>
        <Button type="submit" variant="outline" size="lg" disabled={pendiente} className="w-full sm:w-auto">
          {pendiente ? "Pasando…" : "Pasar a otra unidad"}
        </Button>
      </div>
    </form>
  );
}
