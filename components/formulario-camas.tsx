"use client";

import type { TipoUnidad } from "@prisma/client";
import { useActionState } from "react";
import { CamposCamas } from "@/components/campos-camas";
import { ErrorDelFormulario } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { SIN_ENVIAR, type AccionDeFormulario } from "@/lib/formularios";

type Props = {
  /** La Server Action con el id del centro ya fijado con .bind. */
  accion: AccionDeFormulario;
  inicial: Partial<Record<TipoUnidad, number>>;
};

/**
 * Corregir a mano las camas libres de un centro (HU05, regla 7): para los
 * pacientes que el hospital interna sin pasar por CareRoute. Lo usan el
 * receptor (/camas, su centro) y el admin (/admin/centros/:id).
 */
export function FormularioCamas({ accion, inicial }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, SIN_ENVIAR);

  return (
    <form action={enviar} noValidate className="flex flex-col gap-6">
      <ErrorDelFormulario mensaje={estado.error} />
      <CamposCamas estado={estado} inicial={inicial} />
      <Button type="submit" size="lg" disabled={pendiente} className="w-full sm:w-auto sm:self-start">
        {pendiente ? "Guardando…" : "Guardar camas"}
      </Button>
    </form>
  );
}
