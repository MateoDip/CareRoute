import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FormularioCamas } from "@/components/formulario-camas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { obtenerCentro } from "@/lib/db/centros";
import { fijarCamasDelReceptorAction } from "./acciones";

export const metadata: Metadata = { title: "Camas de tu centro · CareRoute" };

/**
 * /camas — el médico receptor corrige las camas libres de su centro (HU05,
 * regla 7). Solo su centro: sale de la sesión, nunca de la URL. Para otro rol la
 * pantalla no existe (404), como en PATCH /api/unidades/:id (403).
 */
/** ?guardado=1: la acción guardó y redirigió acá (validado con Zod, como todo query param). */
const parametrosSchema = z.object({ guardado: z.literal("1").optional() });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CamasDelCentro({ searchParams }: Props) {
  const usuario = await requerirMedicoEnPagina("MEDICO_RECEPTOR");
  const centro = await obtenerCentro(usuario.centroSaludId);
  if (!centro) notFound();
  const guardado = parametrosSchema.safeParse(await searchParams).data?.guardado === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Camas de tu centro</h1>
        <p className="max-w-prose text-muted-foreground">
          {centro.nombre}. Las camas cambian solas cuando aprobás una derivación, pasás a un
          paciente de unidad o le das el alta. Corregilas acá si internaste pacientes que no
          llegaron por CareRoute.
        </p>
      </div>
      {guardado && (
        <Alert>
          <AlertTitle>Camas guardadas</AlertTitle>
          <AlertDescription>El ranking de los otros centros ya ve los números nuevos.</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent>
          <FormularioCamas
            accion={fijarCamasDelReceptorAction}
            inicial={Object.fromEntries(
              centro.unidadesCuidados.map((unidad) => [unidad.tipo, unidad.camasDisponibles]),
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
