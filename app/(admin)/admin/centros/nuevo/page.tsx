import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconoVolver } from "@/components/ui/iconos";
import { requerirAdminEnPagina } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { crearCentroAction } from "../acciones";
import { FormularioCentro } from "../formulario";

export const metadata: Metadata = { title: "Nuevo centro · CareRoute" };

/** /admin/centros/nuevo — alta de un centro de salud (spec §2). */
export default async function NuevoCentro() {
  await requerirAdminEnPagina();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/centros"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 self-start text-muted-foreground")}
      >
        <IconoVolver />
        Volver a los centros
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Nuevo centro de salud</h1>
        <p className="text-muted-foreground">
          Cargá las camas libres que tiene hoy cada unidad. Después cambian solas con las
          derivaciones, y el médico receptor del centro las puede corregir.
        </p>
      </div>
      <Card>
        <CardContent>
          <FormularioCentro accion={crearCentroAction} texto="Crear centro" textoPendiente="Creando…" conCamas />
        </CardContent>
      </Card>
    </div>
  );
}
