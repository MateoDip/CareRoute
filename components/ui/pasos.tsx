import { IconoCheck, IconoCruz } from "@/components/ui/iconos";
import { cn } from "@/lib/utils";

/*
 * Línea de pasos de un proceso (no es de shadcn: componente propio del sistema
 * visual). No conoce el dominio: recibe títulos y estados ya resueltos.
 *
 * Es una lista ordenada de verdad (<ol>), con el paso actual marcado con
 * aria-current="step", y cada paso dice su estado en texto para el lector de
 * pantalla: el color y el tilde nunca son el único dato.
 *
 * En el teléfono se ve la barra y, arriba, el paso actual en palabras; desde sm:
 * cada segmento lleva su título debajo.
 */

type EstadoPaso = "hecho" | "actual" | "pendiente" | "cancelado";

type Props = {
  pasos: { titulo: string; estado: EstadoPaso }[];
  /** Nombre de la lista para el lector de pantalla ("Avance de la derivación"). */
  etiqueta: string;
  className?: string;
};

const TEXTO_ESTADO: Record<EstadoPaso, string> = {
  hecho: "hecho",
  actual: "en curso",
  pendiente: "pendiente",
  cancelado: "cancelado",
};

const COLOR_SEGMENTO: Record<EstadoPaso, string> = {
  hecho: "bg-primary",
  actual: "bg-primary/40",
  pendiente: "bg-border",
  cancelado: "bg-destructive",
};

const COLOR_TITULO: Record<EstadoPaso, string> = {
  hecho: "text-foreground",
  actual: "text-primary font-semibold",
  pendiente: "text-muted-foreground",
  cancelado: "text-destructive font-semibold",
};

export function Pasos({ pasos, etiqueta, className }: Props) {
  const posicion = pasos.findIndex(
    (paso) => paso.estado === "actual" || paso.estado === "cancelado",
  );
  const pasoActual = pasos[posicion];
  const resumen = pasoActual
    ? `${pasoActual.titulo} (paso ${posicion + 1} de ${pasos.length})`
    : `Completo: ${pasos.length} de ${pasos.length} pasos`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Solo en el teléfono, donde los títulos no entran debajo de cada segmento. */}
      <p className="text-sm font-semibold sm:hidden" aria-hidden="true">
        {resumen}
      </p>
      <ol aria-label={etiqueta} className="flex gap-1.5">
        {pasos.map((paso, indice) => (
          <li
            key={paso.titulo}
            aria-current={paso.estado === "actual" ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-2"
          >
            <span aria-hidden="true" className={cn("h-1.5 rounded-full", COLOR_SEGMENTO[paso.estado])} />
            <span className="sr-only">
              Paso {indice + 1}: {paso.titulo}, {TEXTO_ESTADO[paso.estado]}.
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "hidden items-start gap-1 text-xs leading-tight sm:flex",
                COLOR_TITULO[paso.estado],
              )}
            >
              {paso.estado === "hecho" && <IconoCheck className="size-3.5 text-primary" />}
              {paso.estado === "cancelado" && <IconoCruz className="size-3.5" />}
              <span className="min-w-0">{paso.titulo}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
