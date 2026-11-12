import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Piezas comunes de todos los formularios (clase 12). Mobile-first: en el
 * teléfono los botones van apilados y a lo ancho, el principal arriba; desde sm:
 * van en fila, el principal a la derecha.
 */

/**
 * El error de regla de negocio o de servicio (409 / 502): arriba del formulario,
 * con texto y, si hay, el enlace para resolverlo.
 */
export function ErrorDelFormulario({
  mensaje,
  enlace,
}: {
  mensaje?: string;
  enlace?: { href: string; texto: string };
}) {
  if (!mensaje) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>No se pudo guardar</AlertTitle>
      <AlertDescription>
        <p>{mensaje}</p>
        {enlace && (
          <Link href={enlace.href} className="font-semibold text-destructive underline underline-offset-4">
            {enlace.texto}
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
}

type PropsAcciones = {
  pendiente: boolean;
  texto: string;
  textoPendiente: string;
  cancelarHref: string;
};

/**
 * Guardar y Cancelar. Mientras la acción corre, Guardar queda deshabilitado y
 * cambia el texto: dos toques rápidos no crean dos registros.
 */
export function AccionesFormulario({ pendiente, texto, textoPendiente, cancelarHref }: PropsAcciones) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
      <Button type="submit" size="lg" disabled={pendiente} className="w-full sm:w-auto">
        {pendiente ? textoPendiente : texto}
      </Button>
      <Link
        href={cancelarHref}
        aria-disabled={pendiente}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
      >
        Cancelar
      </Link>
    </div>
  );
}
