import type { RolUsuario } from "@prisma/client";
import Link from "next/link";
import { salir } from "@/app/acciones-sesion";
import { Button, buttonVariants } from "@/components/ui/button";
import { ETIQUETA_ROL } from "@/lib/formato";

type Props = { nombre: string; rol: RolUsuario };

/**
 * Barra de navegación de las pantallas con sesión (clase 10). Siempre igual y
 * en el mismo lugar: nombre del sistema (vuelve al inicio), acceso a las
 * entrantes (criterio "Recuerdo" de la spec §7), quién está usando el sistema
 * con qué rol, y Salir.
 *
 * Mostrar u ocultar algo acá es experiencia de uso, no seguridad: cada página
 * y cada consulta verifican la sesión por su cuenta.
 */
export function Navegacion({ nombre, rol }: Props) {
  return (
    <header className="border-b bg-card">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2"
      >
        <Link href="/" className="mr-2 rounded-sm text-lg font-bold">
          CareRoute
        </Link>
        <Link
          href="/?rol=destino"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Entrantes
        </Link>
        {rol === "MEDICO_DERIVANTE" && (
          <Link
            href="/solicitudes/nueva"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Nueva solicitud
          </Link>
        )}

        <div className="ml-auto flex min-w-0 items-center gap-3">
          <p className="min-w-0 text-right text-sm leading-tight">
            <span className="block break-words font-medium">{nombre}</span>
            <span className="block text-muted-foreground">{ETIQUETA_ROL[rol]}</span>
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
