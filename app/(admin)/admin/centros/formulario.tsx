"use client";

import type { NivelComplejidad } from "@prisma/client";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { AccionesFormulario, ErrorDelFormulario } from "@/components/formulario";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ETIQUETA_COMPLEJIDAD } from "@/lib/formato";
import { SIN_ENVIAR, type AccionDeFormulario } from "@/lib/formularios";

const NIVELES = ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const satisfies readonly NivelComplejidad[];

type Props = {
  accion: AccionDeFormulario;
  texto: string;
  textoPendiente: string;
  /** Al editar, los datos actuales del centro. Al dar de alta, vacío. */
  inicial?: { nombre: string; nivelComplejidad: NivelComplejidad; ubicacion: string };
};

/**
 * Los datos de un centro de salud: lo usan el alta (/admin/centros/nuevo) y la
 * edición (/admin/centros/:id). Si la acción falla, vuelve a mostrar lo escrito.
 */
export function FormularioCentro({ accion, texto, textoPendiente, inicial }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, SIN_ENVIAR);

  return (
    <form action={enviar} noValidate className="flex flex-col gap-6">
      <ErrorDelFormulario mensaje={estado.error} />

      <Campo etiqueta="Nombre" errores={estado.errores?.nombre}>
        {(control) => (
          <Input
            {...control}
            name="nombre"
            autoComplete="off"
            required
            defaultValue={estado.valores?.nombre ?? inicial?.nombre}
          />
        )}
      </Campo>

      <Campo etiqueta="Nivel de complejidad" errores={estado.errores?.nivelComplejidad}>
        {(control) => (
          <NativeSelect
            {...control}
            name="nivelComplejidad"
            required
            defaultValue={estado.valores?.nivelComplejidad ?? inicial?.nivelComplejidad ?? ""}
          >
            <option value="" disabled>
              Elegí…
            </option>
            {NIVELES.map((nivel) => (
              <option key={nivel} value={nivel}>
                {ETIQUETA_COMPLEJIDAD[nivel]}
              </option>
            ))}
          </NativeSelect>
        )}
      </Campo>

      <Campo etiqueta="Ubicación" ayuda="Dirección y ciudad." errores={estado.errores?.ubicacion}>
        {(control) => (
          <Input
            {...control}
            name="ubicacion"
            autoComplete="off"
            required
            defaultValue={estado.valores?.ubicacion ?? inicial?.ubicacion}
          />
        )}
      </Campo>

      <AccionesFormulario
        pendiente={pendiente}
        texto={texto}
        textoPendiente={textoPendiente}
        cancelarHref="/admin/centros"
      />
    </form>
  );
}
