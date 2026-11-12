import type { RolUsuario } from "@prisma/client";
import Link from "next/link";
import { Suspense } from "react";
import { salir } from "@/app/acciones-sesion";
import { EnlaceNavegacion } from "@/components/enlace-navegacion";
import { Marca } from "@/components/marca";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconoMas } from "@/components/ui/iconos";
import { ETIQUETA_ROL, iniciales } from "@/lib/formato";
import { cn } from "@/lib/utils";

type Props = { nombre: string; rol: RolUsuario };

/**
 * Barra de navegación de las pantallas con sesión (clase 10). Siempre igual y
 * en el mismo lugar: marca (vuelve al inicio), acceso a las entrantes (criterio
 * "Recuerdo" de la spec §7), nueva solicitud para el derivante, quién está
 * usando el sistema con qué rol, y Salir.
 *
 * En el teléfono va en dos filas: arriba la marca y la sesión, abajo las
 * acciones, a lo ancho. Desde sm: todo en una fila.
 *
 * Mostrar u ocultar algo acá es experiencia de uso, no seguridad: cada página
 * y cada consulta verifican la sesión por su cuenta.
 */
export function Navegacion({ nombre, rol }: Props) {
  const enlaces = (
    <EnlaceNavegacion href="/?rol=destino">Entrantes</EnlaceNavegacion>
  );

  return (
    <header className="border-b bg-card">
      <nav
        aria-label="Principal"
        className="mx-auto grid max-w-4xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:flex sm:px-6"
      >
        <Link href="/" className="justify-self-start rounded-md">
          <Marca />
        </Link>

        <div className="col-span-2 row-start-2 flex items-center gap-2 sm:order-none sm:row-auto">
          {/* Sin Suspense, leer la URL en el cliente frenaría el render de toda la barra. */}
          <Suspense fallback={enlaces}>{enlaces}</Suspense>
          {rol === "MEDICO_DERIVANTE" && (
            <Link
              href="/solicitudes/nueva"
              className={cn(buttonVariants({ size: "sm" }), "ml-auto sm:ml-0")}
            >
              <IconoMas />
              Nueva solicitud
            </Link>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-3 sm:ml-auto">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-primary"
          >
            {iniciales(nombre)}
          </span>
          <p className="hidden min-w-0 text-sm leading-tight md:block">
            <span className="block truncate font-semibold">{nombre}</span>
            <span className="block text-muted-foreground">{ETIQUETA_ROL[rol]}</span>
          </p>
          <p className="sr-only md:hidden">
            Sesión de {nombre}, {ETIQUETA_ROL[rol]}
          </p>
          <form action={salir}>
            <Button type="submit" variant="outline" size="sm">
              Salir
            </Button>
          </form>
        </div>
      </nav>
    </header>
  );
}
