import {
  FiltroSolicitudes,
  type SolicitudEnLista,
} from "@/components/filtro-solicitudes";
import { SinDatos } from "@/components/sin-datos";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { listarSolicitudesDelCentro } from "@/lib/db/solicitudes";
import { ETIQUETA_ESTADO, formatearFechaHora } from "@/lib/formato";
import {
  estadoSolicitudSchema,
  filtroSolicitudesSchema,
} from "@/lib/schemas/solicitud-traslado";

type Props = { searchParams: Promise<{ rol?: string | string[] }> };

const TEXTOS = {
  todas: {
    titulo: "Solicitudes de tu centro",
    vacioTitulo: "Tu centro todavía no tiene solicitudes",
    vacioDescripcion:
      "Cuando un médico de tu centro inicie una derivación, o cuando otro centro elija al tuyo como destino, la vas a ver acá.",
  },
  destino: {
    titulo: "Solicitudes entrantes",
    vacioTitulo: "No hay solicitudes entrantes",
    vacioDescripcion:
      "Cuando otro centro elija al tuyo como destino de una derivación, aparece acá para que la revises.",
  },
  origen: {
    titulo: "Solicitudes salientes",
    vacioTitulo: "Tu centro no envió solicitudes",
    vacioDescripcion: "Las derivaciones que inicie tu centro van a aparecer acá.",
  },
} as const;

/**
 * / — las solicitudes del centro del médico (HU06, HU07). Server Component.
 *
 * Lee de lib/db/ con un await, sin fetch a la propia API, y con el centro de la
 * sesión dentro de la consulta: la misma que usa GET /api/solicitudes. Con
 * ?rol=destino muestra solo las entrantes (link "Entrantes" de la barra).
 *
 * Los cinco estados (clase 10): cargando → loading.tsx · error → error.tsx ·
 * vacío → SinDatos, acá · sin resultados → el filtro · con datos → el listado.
 */
export default async function Inicio({ searchParams }: Props) {
  const usuario = await requerirMedicoEnPagina();

  // Query param = entrada externa: se valida con el mismo schema que la API.
  // Un valor inválido no es un error de pantalla: se muestran todas.
  const filtro = filtroSolicitudesSchema
    .pick({ rol: true })
    .safeParse({ rol: (await searchParams).rol });
  const rol = filtro.success ? filtro.data.rol : undefined;
  const textos = TEXTOS[rol ?? "todas"];

  const solicitudes = await listarSolicitudesDelCentro({
    centroSaludId: usuario.centroSaludId,
    rol,
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
      sentido,
      fecha: formatearFechaHora(solicitud.fechaSolicitud),
    };
  });

  const estados = estadoSolicitudSchema.options.map((valor) => ({
    valor,
    etiqueta: ETIQUETA_ESTADO[valor],
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{textos.titulo}</h1>

      {filas.length === 0 ? (
        <SinDatos
          titulo={textos.vacioTitulo}
          descripcion={textos.vacioDescripcion}
          accion={rol ? { href: "/", texto: "Ver todas las solicitudes" } : undefined}
        />
      ) : (
        <FiltroSolicitudes solicitudes={filas} estados={estados} />
      )}
    </div>
  );
}
