import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonAccion } from "@/components/boton-accion";
import {
  BadgeEstado,
  BadgeNivel,
  MarcaNivel,
  PasosDelTraslado,
} from "@/components/estado-solicitud";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconoVolver } from "@/components/ui/iconos";
import { requerirMedicoEnPagina } from "@/lib/auth";
import {
  listarBitacora,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import {
  ETIQUETA_EVENTO,
  ETIQUETA_NIVEL,
  ETIQUETA_TRIPULACION,
  formatearDni,
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
 *
 * Orden de la pantalla: quién es el paciente y en qué paso está, qué tiene que
 * hacer este médico ahora, y después el detalle (triaje, derivación, traslado).
 */
export default async function DetalleSolicitud({ params }: Props) {
  const usuario = await requerirMedicoEnPagina();
  const { id } = await params;

  const solicitud = await obtenerSolicitudDelCentro(id, usuario.centroSaludId);
  if (!solicitud) notFound();

  // La bitácora se pide recién después de comprobar que la solicitud es suya:
  // depende de la primera consulta, así que no va en un Promise.all.
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
  const hayAcciones = paso.cargarTriaje || paso.elegirDestino || paso.aprobar || paso.rechazar;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 self-start text-muted-foreground")}
      >
        <IconoVolver />
        Volver a las solicitudes
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Paciente</p>
          <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl">
            DNI {formatearDni(solicitud.pacienteDni)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BadgeEstado estado={solicitud.estado} />
          {triaje && <BadgeNivel nivel={triaje.nivelUrgenciaSugerido} />}
        </div>
      </div>

      <PasosDelTraslado
        estado={solicitud.estado}
        tieneTriaje={triaje !== null}
        tieneDestino={solicitud.centroDestinoId !== null}
        fueAprobada={solicitud.fechaAprobacion !== null}
      />

      <section
        aria-labelledby="que-sigue"
        className={cn(
          "flex flex-col gap-4 rounded-xl border p-5 sm:p-6",
          hayAcciones ? "border-primary/40 bg-accent" : "bg-card",
        )}
      >
        <h2 id="que-sigue" className="text-lg font-bold">
          Qué sigue
        </h2>
        {paso.aviso && <p>{paso.aviso}</p>}
        {(paso.cargarTriaje || paso.elegirDestino) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {paso.cargarTriaje && (
              <Link
                href={`/solicitudes/${solicitud.id}/triaje`}
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              >
                Cargar triaje
              </Link>
            )}
            {paso.elegirDestino && (
              <Link
                href={`/solicitudes/${solicitud.id}/destino`}
                className={cn(
                  buttonVariants({ size: "lg", variant: solicitud.centroDestinoId ? "outline" : "default" }),
                  "w-full sm:w-auto",
                )}
              >
                {solicitud.centroDestinoId ? "Cambiar destino" : "Ver ranking y elegir destino"}
              </Link>
            )}
          </div>
        )}
        {(paso.aprobar || paso.rechazar) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
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
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              Triaje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {triaje ? (
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
                <Signo titulo="Frecuencia cardíaca" valor={String(triaje.frecuenciaCardiaca)} unidad="lpm" />
                <Signo
                  titulo="Presión arterial"
                  valor={`${triaje.presionSistolica}/${triaje.presionDiastolica}`}
                  unidad="mmHg"
                />
                <div className="col-span-2 flex flex-col gap-1 bg-card p-3">
                  <dt className="text-sm text-muted-foreground">Nivel de urgencia</dt>
                  <dd className="flex flex-wrap items-center gap-x-2 font-semibold">
                    <MarcaNivel nivel={triaje.nivelUrgenciaSugerido} className="size-3" />
                    {ETIQUETA_NIVEL[triaje.nivelUrgenciaSugerido]}
                    <span className="font-normal text-muted-foreground">
                      {triaje.origenNivel === "IA" ? "sugerido por la IA" : "elegido por el médico"}
                    </span>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">Todavía no se registró el triaje.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              Derivación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4">
              <Dato titulo="Desde" valor={solicitud.centroOrigen.nombre} />
              <Dato titulo="Hacia" valor={solicitud.centroDestino?.nombre ?? "Sin elegir todavía"} />
              <div className="grid grid-cols-2 gap-4">
                <Dato titulo="Solicitada" valor={formatearFechaHora(solicitud.fechaSolicitud)} />
                <Dato
                  titulo="Aprobada"
                  valor={
                    solicitud.fechaAprobacion
                      ? formatearFechaHora(solicitud.fechaAprobacion)
                      : "Todavía no"
                  }
                />
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              Tripulación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {solicitud.asignacionesTripulacion.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {solicitud.asignacionesTripulacion.map(({ tripulacionMedica, asignadaEn }) => (
                  <li key={tripulacionMedica.id} className="flex flex-col gap-0.5">
                    <p className="font-semibold">Ambulancia {tripulacionMedica.patenteAmbulancia}</p>
                    <p className="break-words text-sm text-muted-foreground">
                      {tripulacionMedica.paramedicoResponsable}, {ETIQUETA_TRIPULACION[tripulacionMedica.estado].toLowerCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Asignada el {formatearFechaHora(asignadaEn)}
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
            <CardTitle as="h2" className="text-lg">
              Bitácora del traslado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bitacora.length > 0 ? (
              <ol className="flex flex-col border-l-2 border-border pl-5">
                {bitacora.map((registro) => (
                  <li key={registro.id} className="relative pb-5 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-card bg-primary"
                    />
                    <p className="text-sm text-muted-foreground">{formatearFechaHora(registro.fechaHora)}</p>
                    <p className="font-semibold">{ETIQUETA_EVENTO[registro.evento]}</p>
                    {registro.observaciones && <p className="break-words">{registro.observaciones}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">Todavía no hay registros del traslado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{titulo}</dt>
      <dd className="break-words font-semibold">{valor}</dd>
    </div>
  );
}

/** Un signo vital: la cifra grande y la unidad chica, como en un monitor. */
function Signo({ titulo, valor, unidad }: { titulo: string; valor: string; unidad: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-3">
      <dt className="text-sm text-muted-foreground">{titulo}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-1">
        <span className="text-2xl font-bold">{valor}</span>
        <span className="text-sm text-muted-foreground">{unidad}</span>
      </dd>
    </div>
  );
}
