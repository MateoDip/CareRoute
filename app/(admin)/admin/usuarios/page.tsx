import type { Metadata } from "next";
import Link from "next/link";
import { SinDatos } from "@/components/sin-datos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requerirAdminEnPagina } from "@/lib/auth";
import { listarUsuarios } from "@/lib/db/usuarios";
import { ETIQUETA_ROL } from "@/lib/formato";

export const metadata: Metadata = { title: "Usuarios · CareRoute" };

/**
 * /admin/usuarios — quién usa CareRoute, con su rol y su centro (spec §2).
 * Cada fila lleva a la pantalla donde el admin le asigna rol y centro.
 */
export default async function UsuariosAdmin() {
  await requerirAdminEnPagina();
  const usuarios = await listarUsuarios();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Usuarios</h1>
        <p className="text-muted-foreground">
          Quien entra con Google queda como médico derivante sin centro. Desde acá le asignás
          rol y centro para que pueda operar.
        </p>
      </div>

      {usuarios.length === 0 ? (
        <SinDatos
          titulo="Todavía no hay usuarios"
          descripcion="Aparecen acá después de entrar por primera vez con Google."
        />
      ) : (
        <Card>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {usuarios.map((usuario) => (
                <li key={usuario.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/admin/usuarios/${usuario.id}`}
                    className="flex flex-col gap-1 rounded-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-primary underline-offset-4 hover:underline">
                        {usuario.nombre}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {usuario.email}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="suave">{ETIQUETA_ROL[usuario.rol]}</Badge>
                      {usuario.centroSalud ? (
                        <span>{usuario.centroSalud.nombre}</span>
                      ) : usuario.rol === "ADMIN" ? null : (
                        <Badge variant="destructivo-suave">Sin centro</Badge>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
