import type { Metadata } from "next";
import Link from "next/link";
import { SinDatos } from "@/components/sin-datos";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requerirAdminEnPagina } from "@/lib/auth";
import { camasLibresPorTipo, contarCentros } from "@/lib/db/centros";
import { resumenDeUsuarios } from "@/lib/db/usuarios";
import { ETIQUETA_UNIDAD } from "@/lib/formato";

export const metadata: Metadata = { title: "Panel de administración · CareRoute" };

const TIPOS = ["UTI", "UCO", "SALA_COMUN", "GUARDIA"] as const;

/**
 * /admin — resumen del panel de administración.
 *
 * Lo primero es lo que bloquea a alguien: médicos que entraron con Google y
 * todavía no tienen centro (regla 4), cada uno con su enlace para asignárselo.
 * Después, los totales de la red: usuarios por rol, centros y camas libres por
 * tipo. Ningún dato de pacientes: el admin no ve derivaciones (docs/api.md).
 *
 * Las tres consultas no dependen una de otra: van juntas en Promise.all.
 */
export default async function ResumenAdmin() {
  await requerirAdminEnPagina();

  const [{ sinCentro, totales }, centros, camas] = await Promise.all([
    resumenDeUsuarios(),
    contarCentros(),
    camasLibresPorTipo(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Panel de administración</h1>
        <p className="text-muted-foreground">
          Usuarios, centros y camas de la red. Las derivaciones las manejan los médicos.
        </p>
      </div>

      <section aria-labelledby="titulo-esperando" className="flex flex-col gap-3">
        <h2 id="titulo-esperando" className="text-lg font-bold">
          Esperando centro
        </h2>
        {sinCentro.length === 0 ? (
          <SinDatos
            titulo="Nadie está esperando"
            descripcion="Todos los médicos registrados tienen un centro asignado."
          />
        ) : (
          <Card>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {sinCentro.map((usuario) => (
                  <li
                    key={usuario.id}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{usuario.nombre}</p>
                      <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
                    </div>
                    <Link
                      href={`/admin/usuarios/${usuario.id}`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Asignar centro<span className="sr-only"> a {usuario.nombre}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="titulo-red" className="flex flex-col gap-3">
        <h2 id="titulo-red" className="text-lg font-bold">
          La red
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Centros de salud</CardDescription>
              <CardTitle className="text-3xl">
                {centros}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Médicos derivantes</CardDescription>
              <CardTitle className="text-3xl">
                {totales.MEDICO_DERIVANTE}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Médicos receptores</CardDescription>
              <CardTitle className="text-3xl">
                {totales.MEDICO_RECEPTOR}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h3" className="text-base">
              Camas libres en toda la red
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {TIPOS.map((tipo) => (
                <div key={tipo} className="flex flex-col gap-1">
                  <dt className="text-sm text-muted-foreground">{ETIQUETA_UNIDAD[tipo]}</dt>
                  <dd className="text-2xl font-bold">{camas[tipo]}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
