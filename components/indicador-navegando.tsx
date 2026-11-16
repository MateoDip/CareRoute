"use client";

import { useLinkStatus } from "next/link";
import { Relojito } from "@/components/cargando";

/**
 * Va adentro de un <Link>: mientras Next navega a esa pantalla, muestra el
 * relojito al lado del texto del enlace. Así se ve al instante que el toque
 * llegó, aunque el servidor todavía no haya respondido.
 */
export function IndicadorNavegando() {
  const { pending } = useLinkStatus();
  return pending ? <Relojito className="size-4" /> : null;
}
