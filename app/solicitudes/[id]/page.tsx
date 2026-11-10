import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirMedicoEnPagina } from "@/lib/auth";
import {
  listarBitacora,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_EVENTO,
  ETIQUETA_NIVEL,
  ETIQUETA_TRIPULACION,
  formatearFechaHora,
} from "@/lib/formato";

type Props = { params: Promise<{ id: string }> };

/**
 * /solicitudes/:id — ficha de la derivación (HU02, HU04, HU07). Server Component.
 *
 * Misma autorización que GET /api/solicitudes/:id: sesión, rol clínico y
 * centro, y la pertenencia dentro del `where`. "No existe" y "no es de tu
 * centro" terminan los dos en notFound(), sin mensajes distintos.
 */
export default async function DetalleSolicitud({ params }: Props) {
  const usuario = await requerirMedicoEnPagina();
  const { id } = await params;

  const solicitud = await obtenerSolicitudDelCentro(id, usuario.centroSaludId);
  if (!solicitud) notFound();

  // La bitácora se pide recién después de comprobar que la solicitud es suya.
  const bitacora = await listarBitacora(solicitud.id);
  const triaje = solicitud.evaluacionTriaje;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-4 sm:p-6">
      <Link
        href="/"
        className="self-start text-blue-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-blue-400"
      >
        ← Volver a las solicitudes
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Paciente DNI {solicitud.pacienteDni}</h1>
        <p className="mt-1 text-foreground/70">
          Solicitud de traslado · {ETIQUETA_ESTADO[solicitud.estado]}
        </p>
      </div>

      <section aria-labelledby="titulo-derivacion" className="flex flex-col gap-3">
        <h2 id="titulo-derivacion" className="text-lg font-semibold">
          Derivación
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Dato titulo="Estado" valor={ETIQUETA_ESTADO[solicitud.estado]} />
          <Dato titulo="Centro de origen" valor={solicitud.centroOrigen.nombre} />
          <Dato
            titulo="Centro de destino"
            valor={solicitud.centroDestino?.nombre ?? "Sin elegir todavía"}
          />
          <Dato
            titulo="Solicitada"
            valor={formatearFechaHora(solicitud.fechaSolicitud)}
          />
          <Dato
            titulo="Aprobada"
            valor={
              solicitud.fechaAprobacion
                ? formatearFechaHora(solicitud.fechaAprobacion)
                : "Todavía no"
            }
          />
        </dl>
      </section>

      <section aria-labelledby="titulo-triaje" className="flex flex-col gap-3">
        <h2 id="titulo-triaje" className="text-lg font-semibold">
          Triaje
        </h2>
        {triaje ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Dato
              titulo="Nivel de urgencia"
              valor={`${ETIQUETA_NIVEL[triaje.nivelUrgenciaSugerido]} · ${
                triaje.origenNivel === "IA"
                  ? "sugerido por IA"
                  : "elegido por el médico"
              }`}
            />
            <Dato
              titulo="Frecuencia cardíaca"
              valor={`${triaje.frecuenciaCardiaca} lpm`}
            />
            <Dato
              titulo="Presión arterial"
              valor={`${triaje.presionSistolica}/${triaje.presionDiastolica} mmHg`}
            />
          </dl>
        ) : (
          <p className="text-foreground/70">Todavía no se registró el triaje.</p>
        )}
      </section>

      <section aria-labelledby="titulo-tripulacion" className="flex flex-col gap-3">
        <h2 id="titulo-tripulacion" className="text-lg font-semibold">
          Tripulación
        </h2>
        {solicitud.asignacionesTripulacion.length > 0 ? (
          <ul className="divide-y divide-foreground/15 rounded border border-foreground/15">
            {solicitud.asignacionesTripulacion.map(({ tripulacionMedica, asignadaEn }) => (
              <li key={tripulacionMedica.id} className="flex flex-col gap-1 p-4">
                <span className="font-medium">
                  Ambulancia {tripulacionMedica.patenteAmbulancia}
                </span>
                <span className="text-sm text-foreground/70">
                  {tripulacionMedica.paramedicoResponsable} ·{" "}
                  {ETIQUETA_TRIPULACION[tripulacionMedica.estado]} · asignada{" "}
                  {formatearFechaHora(asignadaEn)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-foreground/70">Sin tripulación asignada.</p>
        )}
      </section>

      <section aria-labelledby="titulo-bitacora" className="flex flex-col gap-3">
        <h2 id="titulo-bitacora" className="text-lg font-semibold">
          Bitácora del traslado
        </h2>
        {bitacora.length > 0 ? (
          <ol className="flex flex-col gap-3">
            {bitacora.map((registro) => (
              <li key={registro.id} className="border-l-2 border-foreground/30 pl-3">
                <p className="text-sm text-foreground/70">
                  {formatearFechaHora(registro.fechaHora)}
                </p>
                <p className="font-medium">{ETIQUETA_EVENTO[registro.evento]}</p>
                {registro.observaciones && <p>{registro.observaciones}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-foreground/70">Todavía no hay registros del traslado.</p>
        )}
      </section>
    </main>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-sm text-foreground/70">{titulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
