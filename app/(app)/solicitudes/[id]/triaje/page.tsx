import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SinDatos } from "@/components/sin-datos";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import { ETIQUETA_NIVEL } from "@/lib/formato";
import { nivelUrgenciaSchema } from "@/lib/schemas/evaluacion-triaje";
import { registrarTriajeAction } from "./acciones";
import { FormularioTriaje } from "./formulario";

export const metadata: Metadata = { title: "Triaje · CareRoute" };

type Props = { params: Promise<{ id: string }> };

/**
 * /solicitudes/:id/triaje — paso 2 del flujo (HU02). Solo el médico derivante
 * del centro de origen, con la misma consulta de pertenencia que la API.
 */
export default async function Triaje({ params }: Props) {
  const usuario = await requerirMedicoEnPagina("MEDICO_DERIVANTE");
  const { id } = await params;

  const solicitud = await obtenerSolicitudDelCentro(id, usuario.centroSaludId, "origen");
  if (!solicitud) notFound();

  const volverHref = `/solicitudes/${solicitud.id}`;

  if (solicitud.estado !== "PENDIENTE" || solicitud.evaluacionTriaje) {
    return (
      <SinDatos
        encabezado="h1"
        titulo="Esta solicitud ya tiene triaje"
        descripcion="El triaje se carga una sola vez, mientras la solicitud está pendiente."
        accion={{ href: volverHref, texto: "Volver a la solicitud" }}
      />
    );
  }

  const niveles = nivelUrgenciaSchema.options.map((valor) => ({
    valor,
    etiqueta: ETIQUETA_NIVEL[valor],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Triaje · DNI {solicitud.pacienteDni}</h1>
        <p className="text-muted-foreground">
          La IA sugiere el nivel de urgencia; la decisión de derivar la sigue
          tomando un médico.
        </p>
      </div>
      <FormularioTriaje
        accion={registrarTriajeAction.bind(null, solicitud.id)}
        niveles={niveles}
        volverHref={volverHref}
      />
    </div>
  );
}
