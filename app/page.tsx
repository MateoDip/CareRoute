import {
  FiltroSolicitudes,
  type SolicitudEnLista,
} from "@/components/filtro-solicitudes";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { listarSolicitudesDelCentro } from "@/lib/db/solicitudes";
import { ETIQUETA_ESTADO, formatearFechaHora } from "@/lib/formato";
import { estadoSolicitudSchema } from "@/lib/schemas/solicitud-traslado";
import { salir } from "./ingresar/acciones";

/**
 * / — las solicitudes del centro del médico (HU06, HU07). Server Component.
 *
 * Lee de lib/db/ con un await, sin fetch a la propia API, y con el centro de la
 * sesión dentro de la consulta: la misma que usa GET /api/solicitudes.
 */
export default async function Inicio() {
  const usuario = await requerirMedicoEnPagina();
  const solicitudes = await listarSolicitudesDelCentro({
    centroSaludId: usuario.centroSaludId,
  });

  // Props serializables para el componente de cliente: texto, no Date.
  const filas: SolicitudEnLista[] = solicitudes.map((solicitud) => {
    const esSaliente = solicitud.centroOrigenId === usuario.centroSaludId;
    const sentido = esSaliente
      ? `Saliente · ${solicitud.centroDestino ? `a ${solicitud.centroDestino.nombre}` : "sin destino todavía"}`
      : `Entrante · desde ${solicitud.centroOrigen.nombre}`;

    return {
      id: solicitud.id,
      pacienteDni: solicitud.pacienteDni,
      estado: solicitud.estado,
      estadoEtiqueta: ETIQUETA_ESTADO[solicitud.estado],
      sentido,
      fecha: formatearFechaHora(solicitud.fechaSolicitud),
    };
  });

  const estados = estadoSolicitudSchema.options.map((valor) => ({
    valor,
    etiqueta: ETIQUETA_ESTADO[valor],
  }));

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-foreground/15 px-4 py-3">
        <span className="text-lg font-bold">CareRoute</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{usuario.nombre}</span>
          <form action={salir}>
            <button
              type="submit"
              className="rounded border border-foreground/30 px-3 py-1.5 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-2xl font-bold">Solicitudes de tu centro</h1>

        {filas.length === 0 ? (
          <p className="rounded border border-foreground/15 p-4">
            Tu centro todavía no tiene solicitudes de traslado, ni enviadas ni
            recibidas.
          </p>
        ) : (
          <FiltroSolicitudes solicitudes={filas} estados={estados} />
        )}
      </main>
    </>
  );
}
