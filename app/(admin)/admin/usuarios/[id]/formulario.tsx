"use client";

import type { RolUsuario } from "@prisma/client";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { AccionesFormulario, ErrorDelFormulario } from "@/components/formulario";
import { NativeSelect } from "@/components/ui/native-select";
import { ETIQUETA_ROL } from "@/lib/formato";
import { SIN_ENVIAR, type AccionDeFormulario } from "@/lib/formularios";

const ROLES = ["MEDICO_DERIVANTE", "MEDICO_RECEPTOR", "ADMIN"] as const satisfies readonly RolUsuario[];

type Props = {
  /** La Server Action con el id del usuario ya fijado con .bind. */
  accion: AccionDeFormulario;
  centros: { id: string; nombre: string }[];
  rolActual: RolUsuario;
  centroActual: string;
  /** El admin editándose a sí mismo: se le avisa que no puede quitarse el rol. */
  esUnoMismo: boolean;
};

/**
 * Rol y centro de un usuario. Dos <select> nativos: en el teléfono abren el
 * selector del sistema. Si la acción falla, vuelven a mostrar lo elegido.
 */
export function FormularioAsignarUsuario({ accion, centros, rolActual, centroActual, esUnoMismo }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, SIN_ENVIAR);

  return (
    <form action={enviar} noValidate className="flex flex-col gap-6">
      <ErrorDelFormulario mensaje={estado.error} />

      <Campo
        etiqueta="Rol"
        ayuda={esUnoMismo ? "Sos vos: no podés quitarte el rol de administrador." : undefined}
        errores={estado.errores?.rol}
      >
        {(control) => (
          <NativeSelect {...control} name="rol" defaultValue={estado.valores?.rol ?? rolActual}>
            {ROLES.map((rol) => (
              <option key={rol} value={rol}>
                {ETIQUETA_ROL[rol]}
              </option>
            ))}
          </NativeSelect>
        )}
      </Campo>

      <Campo
        etiqueta="Centro de salud"
        ayuda="Los médicos necesitan un centro para operar. El administrador puede no tener."
        errores={estado.errores?.centroSaludId}
      >
        {(control) => (
          <NativeSelect
            {...control}
            name="centroSaludId"
            defaultValue={estado.valores?.centroSaludId ?? centroActual}
          >
            <option value="">Sin centro</option>
            {centros.map((centro) => (
              <option key={centro.id} value={centro.id}>
                {centro.nombre}
              </option>
            ))}
          </NativeSelect>
        )}
      </Campo>

      <AccionesFormulario
        pendiente={pendiente}
        texto="Guardar"
        textoPendiente="Guardando…"
        cancelarHref="/admin/usuarios"
      />
    </form>
  );
}
