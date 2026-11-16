import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonAccion } from "@/components/boton-accion";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconoVolver } from "@/components/ui/iconos";
import { requerirAdminEnPagina } from "@/lib/auth";
import { obtenerCentro } from "@/lib/db/centros";
import { cn } from "@/lib/utils";
import { editarCentroAction, eliminarCentroAction } from "../acciones";
import { FormularioCentro } from "../formulario";

export const metadata: Metadata = { title: "Editar centro · CareRoute" };

type Props = { params: Promise<{ id: string }> };

/**
 * /admin/centros/:id — editar los datos de un centro o darlo de baja (spec §2 y
 * regla 5). La baja pide confirmación; si el centro tiene usuarios o
 * derivaciones, el caso de uso la rechaza y el mensaje dice qué resolver antes.
 */
export default async function EditarCentro({ params }: Props) {
  await requerirAdminEnPagina();
  const { id } = await params;

  const centro = await obtenerCentro(id);
  if (!centro) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/centros"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 self-start text-muted-foreground")}
      >
        <IconoVolver />
        Volver a los centros
      </Link>
      <h1 className="text-2xl font-bold tracking-tight wrap-anywhere sm:text-3xl">{centro.nombre}</h1>

      <Card>
        <CardContent>
          <FormularioCentro
            accion={editarCentroAction.bind(null, centro.id)}
            texto="Guardar cambios"
            textoPendiente="Guardando…"
            inicial={{
              nombre: centro.nombre,
              nivelComplejidad: centro.nivelComplejidad,
              ubicacion: centro.ubicacion,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">
            Dar de baja
          </CardTitle>
          <CardDescription>
            Solo se puede si el centro no tiene usuarios ni derivaciones: el historial no se
            borra. Sus unidades y equipamiento se borran con él.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BotonAccion
            accion={eliminarCentroAction.bind(null, centro.id)}
            texto="Dar de baja el centro"
            textoPendiente="Dando de baja…"
            variante="destructive"
            confirmacion="El centro deja de aparecer en el ranking y no se puede deshacer."
          />
        </CardContent>
      </Card>
    </div>
  );
}
