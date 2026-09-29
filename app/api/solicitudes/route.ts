import { NextResponse } from "next/server";
import { ROLES_CLINICOS, requerirUsuarioConCentro } from "@/lib/auth";
import {
  crearSolicitud,
  listarSolicitudesDelCentro,
} from "@/lib/db/solicitudes";
import { responderError } from "@/lib/errores";
import { errorValidacion } from "@/lib/http";
import {
  crearSolicitudSchema,
  filtroSolicitudesSchema,
} from "@/lib/schemas/solicitud-traslado";

/**
 * GET /api/solicitudes — las solicitudes del centro del usuario (HU06, HU07).
 *
 *   ?rol=origen|destino   — solo las que salen de, o llegan a, su centro
 *   ?estado=EVALUANDO     — solo las que están en ese estado
 *
 * HU06 para el receptor: `?rol=destino&estado=EVALUANDO` son las que le
 * propusieron y tiene que aprobar o rechazar; `&estado=APROBADA`, las que tiene
 * que preparar.
 */
export async function GET(request: Request) {
  try {
    // 1. SESIÓN (401), ROL clínico y CENTRO (403).
    const usuario = await requerirUsuarioConCentro(ROLES_CLINICOS);

    // 2. VALIDAR — los query params también son entrada externa (400).
    const { searchParams } = new URL(request.url);
    const filtros = filtroSolicitudesSchema.safeParse({
      rol: searchParams.get("rol") ?? undefined,
      estado: searchParams.get("estado") ?? undefined,
    });
    if (!filtros.success) return errorValidacion(filtros.error);

    // 3. DELEGAR — el centro sale de la sesión, nunca de la query.
    const solicitudes = await listarSolicitudesDelCentro({
      centroSaludId: usuario.centroSaludId,
      rol: filtros.data.rol,
      estado: filtros.data.estado,
    });

    return NextResponse.json(solicitudes, { status: 200 });
  } catch (error) {
    return responderError("GET /api/solicitudes", error);
  }
}

/**
 * POST /api/solicitudes — registra una solicitud de traslado (HU01).
 *
 * El body trae solo el DNI: el centro de origen sale de la sesión, y el estado y
 * la fecha los pone la base.
 */
export async function POST(request: Request) {
  try {
    const usuario = await requerirUsuarioConCentro("MEDICO_DERIVANTE");

    const body: unknown = await request.json().catch(() => null);
    const datos = crearSolicitudSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    const solicitud = await crearSolicitud(datos.data, usuario.centroSaludId);
    return NextResponse.json(solicitud, { status: 201 });
  } catch (error) {
    return responderError("POST /api/solicitudes", error);
  }
}
