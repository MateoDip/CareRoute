import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconoVolver } from "@/components/ui/iconos";
import { requerirAdminEnPagina } from "@/lib/auth";
import { listarCentros } from "@/lib/db/centros";
import { obtenerUsuario } from "@/lib/db/usuarios";
import { ETIQUETA_ROL } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { asignarUsuarioAction } from "./acciones";
import { FormularioAsignarUsuario } from "./formulario";

export const metadata: Metadata = { title: "Asignar rol y centro · CareRoute" };

type Props = { params: Promise<{ id: string }> };

/** /admin/usuarios/:id — el admin le asigna rol y centro a una persona (regla 4). */
export default async function AsignarUsuario({ params }: Props) {
  const admin = await requerirAdminEnPagina();
  const { id } = await params;

  const [usuario, centros] = await Promise.all([obtenerUsuario(id), listarCentros()]);
  if (!usuario) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/usuarios"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 self-start text-muted-foreground")}
      >
        <IconoVolver />
        Volver a los usuarios
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight wrap-anywhere sm:text-3xl">{usuario.nombre}</h1>
        <p className="text-muted-foreground wrap-anywhere">
          {usuario.email} · hoy: {ETIQUETA_ROL[usuario.rol]}
        </p>
      </div>
      <Card>
        <CardContent>
          <FormularioAsignarUsuario
            accion={asignarUsuarioAction.bind(null, usuario.id)}
            centros={centros.map((centro) => ({ id: centro.id, nombre: centro.nombre }))}
            rolActual={usuario.rol}
            centroActual={usuario.centroSaludId ?? ""}
            esUnoMismo={usuario.id === admin.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
