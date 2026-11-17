"use client";

import type { NivelComplejidad } from "@prisma/client";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { CamposCamas } from "@/components/campos-camas";
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
  /** En el alta se cargan también las camas libres de cada tipo (regla 7). */
  conCamas?: boolean;
};

/**
 * Los datos de un centro de salud: lo usan el alta (/admin/centros/nuevo), que
 * suma las camas libres de cada tipo, y la edición (/admin/centros/:id), donde
 * las camas van en su propio formulario. Si la acción falla, vuelve a mostrar lo
 * escrito.
 */
export function FormularioCentro({ accion, texto, textoPendiente, inicial, conCamas = false }: Props) {
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
            // React 19 reinicia el formulario después de la acción, y un <select> no
            // toma el defaultValue nuevo: con la key se vuelve a montar con lo elegido.
            key={estado.valores?.nivelComplejidad ?? inicial?.nivelComplejidad ?? ""}
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

      {conCamas && <CamposCamas estado={estado} />}

      <AccionesFormulario
        pendiente={pendiente}
        texto={texto}
        textoPendiente={textoPendiente}
        cancelarHref="/admin/centros"
      />
    </form>
  );
}
