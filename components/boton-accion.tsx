"use client";

import { useActionState, useState } from "react";
import { ErrorDelFormulario } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { SIN_ENVIAR, type AccionDeFormulario } from "@/lib/formularios";

type Props = {
  /** La Server Action con el id de la solicitud ya fijado con .bind. */
  accion: AccionDeFormulario;
  texto: string;
  textoPendiente: string;
  variante?: "default" | "destructive" | "outline";
  /** Si está, el primer toque pide confirmar y explica la consecuencia. */
  confirmacion?: string;
};

/**
 * Una operación sin campos — aprobar, rechazar — como un formulario de un solo
 * botón (clase 12). El rechazo de la regla de negocio aparece arriba del botón y
 * el botón se deshabilita mientras la acción corre.
 *
 * Las operaciones que no se deshacen piden confirmación en la misma pantalla, sin
 * un diálogo del navegador: el segundo botón dice qué va a pasar.
 */
export function BotonAccion({ accion, texto, textoPendiente, variante = "default", confirmacion }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, SIN_ENVIAR);
  const [confirmando, setConfirmando] = useState(false);
  const pideConfirmar = Boolean(confirmacion) && !confirmando;

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <ErrorDelFormulario mensaje={estado.error} />

      {pideConfirmar ? (
        <Button
          type="button"
          variant={variante}
          size="lg"
          onClick={() => setConfirmando(true)}
          className="w-full sm:w-auto sm:self-start"
        >
          {texto}
        </Button>
      ) : (
        <>
          {confirmacion && <p className="text-sm">{confirmacion}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" variant={variante} size="lg" disabled={pendiente} className="w-full sm:w-auto">
              {pendiente ? textoPendiente : confirmacion ? `Sí, ${texto.toLowerCase()}` : texto}
            </Button>
            {confirmacion && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={pendiente}
                onClick={() => setConfirmando(false)}
                className="w-full sm:w-auto"
              >
                No, volver
              </Button>
            )}
          </div>
        </>
      )}
    </form>
  );
}
