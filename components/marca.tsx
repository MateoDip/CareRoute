import { IconoMarca } from "@/components/ui/iconos";
import { cn } from "@/lib/utils";

/**
 * La marca: la cruz-ruta sobre petróleo y el nombre. El dibujo es decorativo;
 * el nombre del sistema lo dice el texto.
 */
export function Marca({
  className,
  grande = false,
  invertida = false,
}: {
  className?: string;
  grande?: boolean;
  /** Sobre fondo petróleo: el cuadrado va claro y el dibujo oscuro. */
  invertida?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid place-items-center rounded-lg",
          invertida ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
          grande ? "size-10" : "size-8",
        )}
      >
        <IconoMarca className={grande ? "size-6" : "size-5"} />
      </span>
      <span className={cn("font-bold tracking-tight", grande ? "text-2xl" : "text-lg")}>
        CareRoute
      </span>
    </span>
  );
}

/**
 * Los cuatro colores del triaje en una franja: el motivo visual de CareRoute.
 * Decorativa (aria-hidden): no informa nada que no esté escrito.
 */
export function FranjaTriaje({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex h-1.5 overflow-hidden rounded-full", className)}>
      <span className="flex-1 bg-triaje-rojo" />
      <span className="flex-1 bg-triaje-naranja" />
      <span className="flex-1 bg-triaje-amarillo" />
      <span className="flex-1 bg-triaje-verde" />
    </span>
  );
}
