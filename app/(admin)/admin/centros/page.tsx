import type { Metadata } from "next";
import Link from "next/link";
import { SinDatos } from "@/components/sin-datos";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconoMas } from "@/components/ui/iconos";
import { requerirAdminEnPagina } from "@/lib/auth";
import { listarCentros } from "@/lib/db/centros";
import { ETIQUETA_COMPLEJIDAD, ETIQUETA_UNIDAD } from "@/lib/formato";

export const metadata: Metadata = { title: "Centros · CareRoute" };

const ORDEN = ["UTI", "UCO", "SALA_COMUN", "GUARDIA"] as const;

/**
 * /admin/centros — los centros de salud de la red, con las camas libres de cada
 * unidad. CentroSalud es la entidad con CRUD completo (spec §2): desde acá se da
 * de alta uno nuevo y cada fila lleva a editarlo o darlo de baja.
 */
export default async function CentrosAdmin() {
  await requerirAdminEnPagina();
  const centros = await listarCentros();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Centros de salud</h1>
          <p className="text-muted-foreground">Los hospitales de la red y sus camas libres.</p>
        </div>
        <Link href="/admin/centros/nuevo" className={buttonVariants()}>
          <IconoMas />
          Nuevo centro
        </Link>
      </div>

      {centros.length === 0 ? (
        <SinDatos
          titulo="Todavía no hay centros"
          descripcion="Dá de alta el primero para que los médicos puedan derivar."
          accion={{ href: "/admin/centros/nuevo", texto: "Nuevo centro" }}
        />
      ) : (
        <Card>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {centros.map((centro) => (
                <li key={centro.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/admin/centros/${centro.id}`}
                    className="self-start rounded-md font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {centro.nombre}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {centro.ubicacion} · complejidad {ETIQUETA_COMPLEJIDAD[centro.nivelComplejidad].toLowerCase()}
                  </p>
                  <p className="text-sm">
                    {centro.unidadesCuidados.length === 0
                      ? "Sin unidades cargadas"
                      : [...centro.unidadesCuidados]
                          .sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo))
                          .map((unidad) => `${ETIQUETA_UNIDAD[unidad.tipo]}: ${unidad.camasDisponibles} libres`)
                          .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
