import Link from "next/link";
import {
  FiltroSolicitudes,
  type SolicitudEnLista,
} from "@/components/filtro-solicitudes";
import { SinDatos } from "@/components/sin-datos";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { nombreDelCentro } from "@/lib/db/centros";
import { listarSolicitudesDelCentro } from "@/lib/db/solicitudes";
import { ETIQUETA_ESTADO, formatearFechaHora } from "@/lib/formato";
import {
  estadoSolicitudSchema,
  filtroSolicitudesSchema,
} from "@/lib/schemas/solicitud-traslado";
import { cn } from "@/lib/utils";

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

/** Las tres vistas del listado: todas, las que llegan y las que salen. */
const VISTAS = [
  { rol: undefined, texto: "Todas", href: "/" },
  { rol: "destino", texto: "Entrantes", href: "/?rol=destino" },
  { rol: "origen", texto: "Salientes", href: "/?rol=origen" },
] as const;

/**
 * / — las solicitudes del centro del médico (HU06, HU07). Server Component.
 *
 * Lee de lib/db/ con un await, sin fetch a la propia API, y con el centro de la
 * sesión dentro de la consulta: la misma que usa GET /api/solicitudes. Con
 * ?rol=destino muestra solo las entrantes (link "Entrantes" de la barra).
 *
 * Las dos consultas no dependen una de la otra: van juntas en Promise.all y la
 * pantalla espera solo a la más lenta (clase 14).
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
  // Solo el derivante inicia derivaciones (HU01); la API se lo niega al resto.
  const puedeIniciar = usuario.rol === "MEDICO_DERIVANTE";

  const [solicitudes, centro] = await Promise.all([
    listarSolicitudesDelCentro({ centroSaludId: usuario.centroSaludId, rol }),
    nombreDelCentro(usuario.centroSaludId),
  ]);

  // Props serializables para el componente de cliente: texto, no Date.
  const filas: SolicitudEnLista[] = solicitudes.map((solicitud) => {
    const esSaliente = solicitud.centroOrigenId === usuario.centroSaludId;
    return {
      id: solicitud.id,
      pacienteDni: solicitud.pacienteDni,
      estado: solicitud.estado,
      nivel: solicitud.evaluacionTriaje?.nivelUrgenciaSugerido ?? null,
      sentido: esSaliente ? "saliente" : "entrante",
      otroCentro: esSaliente
        ? (solicitud.centroDestino?.nombre ?? null)
        : solicitud.centroOrigen.nombre,
      fecha: formatearFechaHora(solicitud.fechaSolicitud),
    };
  });

  const estados = estadoSolicitudSchema.options.map((valor) => ({
    valor,
    etiqueta: ETIQUETA_ESTADO[valor],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{textos.titulo}</h1>
        {centro && <p className="text-muted-foreground">{centro}</p>}
      </div>

      <nav aria-label="Vistas del listado" className="-mt-2 flex gap-1 border-b">
        {VISTAS.map((vista) => (
          <Link
            key={vista.texto}
            href={vista.href}
            aria-current={vista.rol === rol ? "page" : undefined}
            className={cn(
              "-mb-px rounded-t-md border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              "aria-[current=page]:border-primary aria-[current=page]:text-primary",
            )}
          >
            {vista.texto}
          </Link>
        ))}
      </nav>

      {filas.length === 0 ? (
        <SinDatos
          titulo={textos.vacioTitulo}
          descripcion={textos.vacioDescripcion}
          accion={
            rol
              ? { href: "/", texto: "Ver todas las solicitudes" }
              : puedeIniciar
                ? { href: "/solicitudes/nueva", texto: "Iniciar la primera solicitud" }
                : undefined
          }
        />
      ) : (
        <FiltroSolicitudes solicitudes={filas} estados={estados} />
      )}
    </div>
  );
}
