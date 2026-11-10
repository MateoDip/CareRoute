"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = { error: Error & { digest?: string }; reset: () => void };

/**
 * Error al cargar una pantalla con sesión (clase 10). Reemplaza el try/catch
 * por página: nadie se olvida de manejarlo.
 *
 * Next exige que sea de cliente. No muestra el mensaje de la excepción (puede
 * tener datos internos): lo registra en la consola y le dice al médico que el
 * problema es del sistema, que no se perdió nada y qué hacer.
 *
 * Reintentar refresca los datos del servidor y después reinicia el límite de
 * error: con solo `reset()` se volvería a pintar el mismo error.
 */
export default function ErrorDePantalla({ error, reset }: Props) {
  const router = useRouter();
  const [reintentando, iniciarTransicion] = useTransition();

  useEffect(() => {
    console.error("Error al cargar la pantalla", error);
  }, [error]);

  function reintentar() {
    iniciarTransicion(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertTitle>No pudimos cargar esta pantalla</AlertTitle>
        <AlertDescription>
          <p>
            Es un problema del sistema, no de algo que hayas hecho. No se perdió
            nada de lo que ya estaba guardado.
          </p>
          <p>
            Probá de nuevo en unos segundos. Si sigue fallando, avisá al
            administrador
            {error.digest ? ` y pasale este código: ${error.digest}` : ""}.
          </p>
        </AlertDescription>
      </Alert>
      <Button onClick={reintentar} disabled={reintentando} className="self-start">
        {reintentando ? "Reintentando…" : "Reintentar"}
      </Button>
    </div>
  );
}
