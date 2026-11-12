import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Íconos del sistema visual, dibujados a mano en SVG (sin librería de íconos:
 * no se suma una dependencia por ocho dibujos). Trazo de 2 px en currentColor,
 * así toman el color del texto que los rodea y respetan los dos temas.
 *
 * Siempre decorativos (aria-hidden): el texto de al lado dice lo mismo. Un ícono
 * nunca es el único dato.
 */

type PropsIcono = React.SVGProps<SVGSVGElement>;

function Icono({ className, children, ...props }: PropsIcono) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("size-4 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Marca de CareRoute: la cruz médica con el brazo derecho convertido en ruta. */
export function IconoMarca(props: PropsIcono) {
  return (
    <Icono strokeWidth={2.4} {...props}>
      <path d="M9 3h4v6h6" />
      <path d="M9 3v6H3v4h6v6h4v-6h3" />
      <path d="m18 10 3 3-3 3" />
    </Icono>
  );
}

/** Llega al centro: flecha hacia adentro de la bandeja. */
export function IconoEntrante(props: PropsIcono) {
  return (
    <Icono {...props}>
      <path d="M17 7 7 17" />
      <path d="M15 17H7V9" />
    </Icono>
  );
}

/** Sale del centro. */
export function IconoSaliente(props: PropsIcono) {
  return (
    <Icono {...props}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </Icono>
  );
}

export function IconoMas(props: PropsIcono) {
  return (
    <Icono {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icono>
  );
}

export function IconoVolver(props: PropsIcono) {
  return (
    <Icono {...props}>
      <path d="m15 18-6-6 6-6" />
    </Icono>
  );
}

export function IconoCheck(props: PropsIcono) {
  return (
    <Icono {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icono>
  );
}

export function IconoCruz(props: PropsIcono) {
  return (
    <Icono {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icono>
  );
}

/** Cama de internación. */
export function IconoCama(props: PropsIcono) {
  return (
    <Icono {...props}>
      <path d="M3 7v12" />
      <path d="M3 15h18v4" />
      <path d="M21 15v-3a3 3 0 0 0-3-3h-7v6" />
      <circle cx="7" cy="11" r="2" />
    </Icono>
  );
}
