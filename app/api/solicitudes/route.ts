import { NextResponse } from "next/server";
import {
  crearSolicitud,
  listarSolicitudesDelCentro,
} from "@/lib/db/solicitudes";
import {
  errorInterno,
  errorValidacion,
  noAutenticado,
  sinPermiso,
} from "@/lib/http";
import {
  crearSolicitudSchema,
  filtroSolicitudesSchema,
} from "@/lib/schemas/solicitud-traslado";
import { getSesion } from "@/lib/sesion";

/**
 * GET /api/solicitudes
 *
 * Lista las solicitudes del centro del usuario. Filtros opcionales:
 *   ?rol=origen|destino   — solo las que salen de, o llegan a, su centro
 *   ?estado=APROBADA      — solo las que están en ese estado
 *
 * La combinación `?rol=destino&estado=APROBADA` es lo que resuelve HU06: son las
 * derivaciones que le asignaron al centro y todavía tiene que preparar.
 */
export async function GET(request: Request) {
  try {
    // 1. AUTORIZAR
    const sesion = await getSesion(request);
    if (!sesion) return noAutenticado();

    // 2. VALIDAR — los query params también son entrada externa.
    const { searchParams } = new URL(request.url);
    const filtros = filtroSolicitudesSchema.safeParse({
      rol: searchParams.get("rol") ?? undefined,
      estado: searchParams.get("estado") ?? undefined,
    });
    if (!filtros.success) return errorValidacion(filtros.error);

    // 3. DELEGAR
    const solicitudes = await listarSolicitudesDelCentro({
      centroSaludId: sesion.centroSaludId,
      rol: filtros.data.rol,
      estado: filtros.data.estado,
    });

    // 4. RESPONDER
    return NextResponse.json(solicitudes, { status: 200 });
  } catch (error) {
    return errorInterno("GET /api/solicitudes", error);
  }
}

/**
 * POST /api/solicitudes
 *
 * Registra una solicitud de traslado. El body trae únicamente el DNI del paciente:
 * el centro de origen sale de la sesión, y el estado y la fecha los pone la base.
 */
export async function POST(request: Request) {
  try {
    // 1. VALIDAR
    const body: unknown = await request.json().catch(() => null);
    const datos = crearSolicitudSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    // 2. AUTORIZAR
    const sesion = await getSesion(request);
    if (!sesion) return noAutenticado();
    if (sesion.rol !== "MEDICO_DERIVANTE") {
      return sinPermiso("Solo un médico derivante puede crear solicitudes");
    }

    // 3. DELEGAR — la identidad va como parámetro, nunca dentro del body.
    const solicitud = await crearSolicitud(datos.data, sesion.centroSaludId);

    // 4. RESPONDER — 201 y el recurso creado, con su id.
    return NextResponse.json(solicitud, { status: 201 });
  } catch (error) {
    return errorInterno("POST /api/solicitudes", error);
  }
}
