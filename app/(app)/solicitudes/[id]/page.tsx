import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonAccion } from "@/components/boton-accion";
import { BadgeEstado, BadgeNivel } from "@/components/estado-solicitud";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { proximoPaso } from "@/lib/proximo-paso";
import { cn } from "@/lib/utils";
import { aprobarAction, rechazarAction } from "./acciones";

type Props = { params: Promise<{ id: string }> };

/**
 * /solicitudes/:id — ficha de la derivación (HU02, HU04, HU07). Server Component.
 *
 * Misma autorización que GET /api/solicitudes/:id: sesión, rol clínico y
 * centro, y la pertenencia dentro del `where`. "No existe" y "no es de tu
 * centro" terminan los dos en notFound() → (app)/not-found.tsx.
 */
export default async function DetalleSolicitud({ params }: Props) {
  const usuario = await requerirMedicoEnPagina();
  const { id } = await params;

  const solicitud = await obtenerSolicitudDelCentro(id, usuario.centroSaludId);
  if (!solicitud) notFound();

  // La bitácora se pide recién después de comprobar que la solicitud es suya.
  const bitacora = await listarBitacora(solicitud.id);
  const triaje = solicitud.evaluacionTriaje;

  // Qué botones ve este médico: experiencia de uso. Cada acción vuelve a
  // verificar rol, lado y estado en su caso de uso.
  const paso = proximoPaso({
    rol: usuario.rol,
    estado: solicitud.estado,
    esOrigen: solicitud.centroOrigenId === usuario.centroSaludId,
    esDestino: solicitud.centroDestinoId === usuario.centroSaludId,
    tieneDestino: solicitud.centroDestinoId !== null,
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className={cn(buttonVariants({ variant: "link" }), "self-start px-0")}>
        ← Volver a las solicitudes
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="break-words text-2xl font-bold">
          Paciente DNI {solicitud.pacienteDni}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <BadgeEstado estado={solicitud.estado} />
          {triaje && <BadgeNivel nivel={triaje.nivelUrgenciaSugerido} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Qué sigue</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {paso.aviso && <p>{paso.aviso}</p>}
          {paso.cargarTriaje && (
            <Link href={`/solicitudes/${solicitud.id}/triaje`} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto sm:self-start")}>
              Cargar triaje
            </Link>
          )}
          {paso.elegirDestino && (
            <Link
              href={`/solicitudes/${solicitud.id}/destino`}
              className={cn(
                buttonVariants({ size: "lg", variant: solicitud.centroDestinoId ? "outline" : "default" }),
                "w-full sm:w-auto sm:self-start",
              )}
            >
              {solicitud.centroDestinoId ? "Cambiar destino" : "Ver ranking y elegir destino"}
            </Link>
          )}
          {paso.aprobar && (
            <BotonAccion
              accion={aprobarAction.bind(null, solicitud.id)}
              texto="Aprobar y reservar cama"
              textoPendiente="Aprobando…"
            />
          )}
          {paso.rechazar && (
            <BotonAccion
              accion={rechazarAction.bind(null, solicitud.id)}
              texto="Rechazar derivación"
              textoPendiente="Rechazando…"
              variante="outline"
              confirmacion={
                solicitud.estado === "APROBADA"
                  ? "Se cancela la derivación y la cama reservada vuelve a quedar libre. No se puede deshacer."
                  : "Se cancela la derivación. No se puede deshacer."
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Derivación</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Triaje</CardTitle>
        </CardHeader>
        <CardContent>
          {triaje ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Dato
                titulo="Nivel de urgencia"
                valor={`${ETIQUETA_NIVEL[triaje.nivelUrgenciaSugerido]} · ${
                  triaje.origenNivel === "IA" ? "sugerido por IA" : "elegido por el médico"
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
            <p className="text-muted-foreground">Todavía no se registró el triaje.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Tripulación</CardTitle>
        </CardHeader>
        <CardContent>
          {solicitud.asignacionesTripulacion.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {solicitud.asignacionesTripulacion.map(({ tripulacionMedica, asignadaEn }) => (
                <li key={tripulacionMedica.id}>
                  <p className="font-medium">
                    Ambulancia {tripulacionMedica.patenteAmbulancia}
                  </p>
                  <p className="break-words text-sm text-muted-foreground">
                    {tripulacionMedica.paramedicoResponsable} ·{" "}
                    {ETIQUETA_TRIPULACION[tripulacionMedica.estado]} · asignada{" "}
                    {formatearFechaHora(asignadaEn)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Sin tripulación asignada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Bitácora del traslado</CardTitle>
        </CardHeader>
        <CardContent>
          {bitacora.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {bitacora.map((registro) => (
                <li key={registro.id}>
                  <p className="text-sm text-muted-foreground">
                    {formatearFechaHora(registro.fechaHora)}
                  </p>
                  <p className="font-medium">{ETIQUETA_EVENTO[registro.evento]}</p>
                  {registro.observaciones && (
                    <p className="break-words">{registro.observaciones}</p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">
              Todavía no hay registros del traslado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{titulo}</dt>
      <dd className="break-words font-medium">{valor}</dd>
    </div>
  );
}
