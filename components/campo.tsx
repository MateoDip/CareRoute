"use client";

import { useId } from "react";

/** Lo que el control tiene que recibir para quedar conectado con su etiqueta, ayuda y error. */
export type PropsDeControl = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type Props = {
  etiqueta: string;
  ayuda?: string;
  errores?: string[];
  children: (control: PropsDeControl) => React.ReactNode;
};

/**
 * Un campo de formulario accesible (clase 12): etiqueta, control, ayuda y error
 * conectados.
 *
 *  - La etiqueta apunta al control con htmlFor/id.
 *  - El control apunta a la ayuda y al error con aria-describedby: el lector de
 *    pantalla los lee al enfocarlo.
 *  - Con error, el control lleva aria-invalid y el mensaje se escribe, no solo el
 *    color (spec §7).
 *
 * Los ids salen de useId(): únicos aunque el mismo formulario aparezca dos veces.
 */
export function Campo({ etiqueta, ayuda, errores, children }: Props) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const hayError = Boolean(errores && errores.length > 0);
  const describe = [ayuda ? idAyuda : null, hayError ? idError : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children({
        id,
        "aria-describedby": describe || undefined,
        "aria-invalid": hayError ? true : undefined,
      })}
      {ayuda && (
        <p id={idAyuda} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      {hayError && (
        <p id={idError} className="text-sm font-medium text-destructive">
          {errores?.join(" ")}
        </p>
      )}
    </div>
  );
}
