import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SinDatos } from "@/components/sin-datos";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { rankingDeDestinos } from "@/lib/casos/ranking-destinos";
import { obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import { ETIQUETA_NIVEL } from "@/lib/formato";
import { elegirDestinoAction } from "./acciones";
import { FormularioDestino } from "./formulario";

export const metadata: Metadata = { title: "Elegir destino · CareRoute" };

type Props = { params: Promise<{ id: string }> };

/** Cómo se nombra cada tipo de cama en pantalla. */
const NOMBRE_CAMA = { UTI: "de UTI", UCO: "de UCO", SALA_COMUN: "de sala común", GUARDIA: "de guardia" } as const;

/**
 * /solicitudes/:id/destino — pasos 3 y 4 del flujo (HU03 y HU04). El ranking sale
 * del mismo caso de uso que GET /candidatos: la pantalla no puede ofrecer un
 * centro que la API rechazaría.
 */
export default async function ElegirDestino({ params }: Props) {
  const usuario = await requerirMedicoEnPagina("MEDICO_DERIVANTE");
  const { id } = await params;

  const solicitud = await obtenerSolicitudDelCentro(id, usuario.centroSaludId, "origen");
  if (!solicitud) notFound();
  const volverHref = `/solicitudes/${solicitud.id}`;

  if (solicitud.estado !== "EVALUANDO") {
    return (
      <SinDatos
        encabezado="h1"
        titulo="Ahora no se puede elegir destino"
        descripcion={
          solicitud.estado === "PENDIENTE"
            ? "Primero hay que cargar el triaje: de él sale el tipo de cama que necesita el paciente."
            : "El destino se elige mientras la solicitud se evalúa, antes de que el receptor la apruebe."
        }
        accion={{ href: volverHref, texto: "Volver a la solicitud" }}
      />
    );
  }

  const ranking = await rankingDeDestinos(usuario, solicitud.id);
  if (!ranking.ok) notFound();
  const { tipoUnidadRequerida, candidatos } = ranking.valor;
  const nivel = solicitud.evaluacionTriaje?.nivelUrgenciaSugerido;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Elegir destino · DNI {solicitud.pacienteDni}</h1>
        <p className="text-muted-foreground">
          {nivel ? `Nivel de urgencia ${ETIQUETA_NIVEL[nivel].toLowerCase()}: ` : ""}
          el paciente necesita una cama {NOMBRE_CAMA[tipoUnidadRequerida]}. La
          cama se reserva recién cuando el centro de destino aprueba.
        </p>
      </div>

      {candidatos.length === 0 ? (
        <SinDatos
          titulo={`Ningún centro tiene cama ${NOMBRE_CAMA[tipoUnidadRequerida]} libre`}
          descripcion="El ranking se actualiza cuando un centro libera camas. Mientras tanto, la solicitud sigue en evaluación."
          accion={{ href: volverHref, texto: "Volver a la solicitud" }}
        />
      ) : (
        <FormularioDestino
          accion={elegirDestinoAction.bind(null, solicitud.id)}
          candidatos={candidatos}
          tipoCama={NOMBRE_CAMA[tipoUnidadRequerida]}
          destinoActualId={solicitud.centroDestinoId}
          volverHref={volverHref}
        />
      )}
    </div>
  );
}
