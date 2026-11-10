"use client";

import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { AccionesFormulario, ErrorDelFormulario } from "@/components/formulario";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SIN_ENVIAR, type AccionDeFormulario } from "@/lib/formularios";

type Props = {
  /** registrarTriajeAction con el id de la solicitud ya fijado. */
  accion: AccionDeFormulario;
  niveles: { valor: string; etiqueta: string }[];
  volverHref: string;
};

/**
 * Formulario de HU02: tres signos vitales y, opcional, el nivel de urgencia.
 *
 * Los signos vitales sí son cantidades, pero van como texto con teclado numérico
 * (inputMode): type="number" cambia el valor con la rueda del mouse y en algunos
 * teléfonos no deja escribir la coma.
 */
export function FormularioTriaje({ accion, niveles, volverHref }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, SIN_ENVIAR);
  const valores = estado.valores;

  return (
    <form action={enviar} noValidate className="flex flex-col gap-6">
      <ErrorDelFormulario mensaje={estado.error} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">Signos vitales</legend>
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

      <Campo
        etiqueta="Nivel de urgencia"
        ayuda="Si no elegís uno, lo sugiere la IA a partir de los signos vitales. Siempre lo podés corregir."
        errores={estado.errores?.nivelUrgenciaSugerido}
      >
        {(control) => (
          <NativeSelect {...control} name="nivelUrgenciaSugerido" defaultValue={valores?.nivelUrgenciaSugerido ?? ""}>
            <option value="">Que lo sugiera la IA</option>
            {niveles.map((nivel) => (
              <option key={nivel.valor} value={nivel.valor}>
                {nivel.etiqueta}
              </option>
            ))}
          </NativeSelect>
        )}
      </Campo>

      <AccionesFormulario
        pendiente={pendiente}
        texto="Guardar triaje"
        textoPendiente="Guardando… (la IA puede tardar unos segundos)"
        cancelarHref={volverHref}
      />
    </form>
  );
}
