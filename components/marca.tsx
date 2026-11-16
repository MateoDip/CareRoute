import { cn } from "@/lib/utils";

/**
 * El logo de CareRoute, el de la presentación: una ruta que se curva en una C,
 * del punto de partida (hielo) al de llegada (coral), con el trayecto punteado
 * adentro. Usa solo los tokens `marca-*` (app/globals.css). Es decorativo: el
 * nombre del sistema lo dice el texto de al lado.
 */
export function LogoCareRoute({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-74 -74 148 148"
      aria-hidden="true"
      focusable="false"
      className={cn("fill-none", className)}
    >
      <path
        d="M46 -40 A62 62 0 1 0 46 40"
        className="stroke-marca-principal"
        strokeWidth={18}
        strokeLinecap="round"
      />
      <path
        d="M-18 0 H22"
        className="stroke-marca-principal"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray="2 16"
      />
      <circle cx={46} cy={40} r={17} className="fill-marca-acento" />
      <circle cx={46} cy={-40} r={11} className="fill-marca-texto" />
    </svg>
  );
}

/**
 * La marca: el logo sobre su recuadro azul noche y el nombre. El recuadro es
 * igual en los dos temas, así el logo se ve siempre con los colores de la
 * presentación.
 */
export function Marca({
  className,
  grande = false,
}: {
  className?: string;
  grande?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid place-items-center rounded-lg bg-marca-fondo",
          grande ? "size-10" : "size-8",
        )}
      >
        <LogoCareRoute className={grande ? "size-7" : "size-6"} />
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
