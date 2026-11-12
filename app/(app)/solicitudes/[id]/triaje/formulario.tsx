"use client";

import type { NivelUrgencia } from "@prisma/client";
import { useActionState, useId } from "react";
import { Campo } from "@/components/campo";
import { MarcaNivel } from "@/components/estado-solicitud";
import { AccionesFormulario, ErrorDelFormulario } from "@/components/formulario";
import { Input } from "@/components/ui/input";
import { SIN_ENVIAR, type AccionDeFormulario } from "@/lib/formularios";
import { cn } from "@/lib/utils";

type Props = {
  /** registrarTriajeAction con el id de la solicitud ya fijado. */
  accion: AccionDeFormulario;
  niveles: { valor: NivelUrgencia; etiqueta: string }[];
  volverHref: string;
};

const CLASE_OPCION =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background";

/**
 * Formulario de HU02: tres signos vitales y, opcional, el nivel de urgencia.
 *
 * Los signos vitales sí son cantidades, pero van como texto con teclado numérico
 * (inputMode): type="number" cambia el valor con la rueda del mouse y en algunos
 * teléfonos no deja escribir la coma.
 *
 * El nivel es un grupo de radios con el color de cada nivel del triaje, no un
 * <select>: en el teléfono es un toque en vez de tres. La primera opción deja que
 * lo sugiera la IA; si la IA no responde, el aviso de arriba pide elegir uno
 * (caso de error de HU02) y los signos vitales siguen cargados.
 */
export function FormularioTriaje({ accion, niveles, volverHref }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, SIN_ENVIAR);
  const valores = estado.valores;
  const idNivelError = useId();
  const errorNivel = estado.errores?.nivelUrgenciaSugerido?.join(" ");
  const nivelElegido = valores?.nivelUrgenciaSugerido ?? "";

  return (
    <form action={enviar} noValidate className="flex flex-col gap-8">
      <ErrorDelFormulario mensaje={estado.error} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-lg font-bold">Signos vitales</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo etiqueta="Frecuencia cardíaca (lpm)" errores={estado.errores?.frecuenciaCardiaca}>
            {(control) => (
              <Input {...control} name="frecuenciaCardiaca" inputMode="numeric" autoComplete="off" required defaultValue={valores?.frecuenciaCardiaca} />
            )}
          </Campo>
          <Campo etiqueta="Presión sistólica (mmHg)" errores={estado.errores?.presionSistolica}>
            {(control) => (
              <Input {...control} name="presionSistolica" inputMode="numeric" autoComplete="off" required defaultValue={valores?.presionSistolica} />
            )}
          </Campo>
          <Campo etiqueta="Presión diastólica (mmHg)" errores={estado.errores?.presionDiastolica}>
            {(control) => (
              <Input {...control} name="presionDiastolica" inputMode="numeric" autoComplete="off" required defaultValue={valores?.presionDiastolica} />
            )}
          </Campo>
        </div>
      </fieldset>

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={errorNivel ? idNivelError : undefined}
      >
        <legend className="mb-1 text-lg font-bold">Nivel de urgencia</legend>
        <p className="text-sm text-muted-foreground">
          Si no elegís uno, lo sugiere la IA a partir de los signos vitales. Siempre lo podés elegir vos.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <label className={cn(CLASE_OPCION, "col-span-2 sm:col-span-1")}>
            <input
              type="radio"
              name="nivelUrgenciaSugerido"
              value=""
              defaultChecked={nivelElegido === ""}
              className="size-4 shrink-0 accent-primary"
            />
            Que lo sugiera la IA
          </label>
          {niveles.map((nivel) => (
            <label key={nivel.valor} className={CLASE_OPCION}>
              <input
                type="radio"
                name="nivelUrgenciaSugerido"
                value={nivel.valor}
                defaultChecked={nivelElegido === nivel.valor}
                className="size-4 shrink-0 accent-primary"
              />
              <MarcaNivel nivel={nivel.valor} className="size-3" />
              {nivel.etiqueta}
            </label>
          ))}
        </div>
        {errorNivel && (
          <p id={idNivelError} className="text-sm font-medium text-destructive">
            {errorNivel}
          </p>
        )}
      </fieldset>

      <AccionesFormulario
        pendiente={pendiente}
        texto="Guardar triaje"
        textoPendiente="Guardando… (la IA puede tardar unos segundos)"
        cancelarHref={volverHref}
      />
    </form>
  );
}
