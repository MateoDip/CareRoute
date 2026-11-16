import Link from "next/link";
import { Suspense } from "react";
import { salir } from "@/app/acciones-sesion";
import { EnlaceNavegacion } from "@/components/enlace-navegacion";
import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { ETIQUETA_ROL, iniciales } from "@/lib/formato";

/**
 * Barra del panel de administración (/admin). Misma forma que la de los médicos
 * (components/navegacion.tsx) pero con las secciones del admin: resumen,
 * usuarios y centros. El admin no ve solicitudes ni datos de pacientes.
 */
export function NavegacionAdmin({ nombre }: { nombre: string }) {
  const enlaces = (
    <>
      <EnlaceNavegacion href="/admin">Resumen</EnlaceNavegacion>
      <EnlaceNavegacion href="/admin/usuarios">Usuarios</EnlaceNavegacion>
      <EnlaceNavegacion href="/admin/centros">Centros</EnlaceNavegacion>
    </>
  );

  return (
    <header className="border-b bg-card">
      <nav
        aria-label="Administración"
        className="mx-auto grid max-w-4xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:flex sm:px-6"
      >
        <Link href="/admin" className="justify-self-start rounded-md">
          <Marca />
        </Link>

        <div className="col-span-2 row-start-2 flex flex-wrap items-center gap-1 sm:order-none sm:row-auto">
          {/* Sin Suspense, leer la URL en el cliente frenaría el render de toda la barra. */}
          <Suspense fallback={enlaces}>{enlaces}</Suspense>
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
            <span className="block text-muted-foreground">{ETIQUETA_ROL.ADMIN}</span>
          </p>
          <p className="sr-only md:hidden">
            Sesión de {nombre}, {ETIQUETA_ROL.ADMIN}
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
