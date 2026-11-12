"use client";

import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { AccionesFormulario, ErrorDelFormulario } from "@/components/formulario";
import { Input } from "@/components/ui/input";
import { SIN_ENVIAR } from "@/lib/formularios";
import { iniciarSolicitudAction } from "./acciones";

/**
 * Formulario de HU01. Sin useState por campo ni fetch: useActionState guarda lo
 * que devuelve la acción. Si falla, vuelve a mostrar lo escrito (defaultValue).
 *
 * El DNI no es una cantidad: va como texto con teclado numérico (inputMode), no
 * como type="number", que en el teléfono agrega flechas y acepta "1e5".
 */
export function FormularioNuevaSolicitud() {
  const [estado, enviar, pendiente] = useActionState(iniciarSolicitudAction, SIN_ENVIAR);

  return (
    <form action={enviar} noValidate className="flex flex-col gap-6">
      <ErrorDelFormulario mensaje={estado.error} enlace={estado.enlace} />

      <Campo
        etiqueta="DNI del paciente"
        ayuda="Solo números, sin puntos."
        errores={estado.errores?.pacienteDni}
      >
        {(control) => (
          <Input
            {...control}
            name="pacienteDni"
            inputMode="numeric"
            autoComplete="off"
            required
            defaultValue={estado.valores?.pacienteDni}
          />
        )}
      </Campo>

      <AccionesFormulario
        pendiente={pendiente}
        texto="Crear solicitud"
        textoPendiente="Creando…"
        cancelarHref="/"
      />
    </form>
  );
}
