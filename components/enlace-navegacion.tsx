"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  children: React.ReactNode;
};

/**
 * Un enlace de la barra que se marca cuando es la pantalla actual
 * (aria-current="page"). Es de cliente solo para leer la URL: el resto de la
 * barra se dibuja en el servidor.
 *
 * "/" y "/?rol=destino" son la misma ruta: se distinguen por el query param.
 */
export function EnlaceNavegacion({ href, children }: Props) {
  const ruta = usePathname();
  const parametros = useSearchParams();
  const destino = new URL(href, "http://x");
  const actual =
    ruta === destino.pathname &&
    (parametros.get("rol") ?? "") === (destino.searchParams.get("rol") ?? "");

  return (
    <Link
      href={href}
      aria-current={actual ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "text-muted-foreground aria-[current=page]:bg-accent aria-[current=page]:text-primary",
      )}
    >
      {children}
    </Link>
  );
}
