import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { existeCentro, listarUnidadesDelCentro } from "@/lib/db/centros";
import {
  asignarDestino,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import { tiposConCamaLibre, unidadConCamaLibre } from "@/lib/disponibilidad";
import { responderError } from "@/lib/errores";
import {
  capacidadAgotada,
  conflicto,
  errorValidacion,
  noEncontrado,
} from "@/lib/http";
import { impedimentoParaAsignarDestino } from "@/lib/reglas-solicitud";
import { asignarDestinoSchema } from "@/lib/schemas/solicitud-traslado";
import { unidadRequerida } from "@/lib/scoring-hospitales";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/destino — el médico derivante elige, del ranking, el
 * centro al que quiere derivar (HU04, paso 3 del flujo principal).
 *
 * Todavía no reserva cama: la reserva la hace la aprobación del receptor. Acá se
 * verifica que el destino tenga cama del tipo requerido en este momento (caso de
 * error de HU04: "Capacidad agotada" + tipos que sí tienen cama, para recargar el
 * ranking). Mientras nadie apruebe, el derivante puede cambiar de destino.
 */
export async function POST(request: Request, { params }: Contexto) {
  try {
    // 1-2. SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_DERIVANTE");
    const { id } = await params;

    // 3. PERTENENCIA → 404. Elige destino el centro de origen.
    const solicitud = await obtenerSolicitudDelCentro(
      id,
      usuario.centroSaludId,
      "origen",
    );
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // 4. BODY → 400
    const body: unknown = await request.json().catch(() => null);
    const datos = asignarDestinoSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);
    const { centroDestinoId } = datos.data;

    // 5. REGLAS → 409
    const impedimento = impedimentoParaAsignarDestino({
      estado: solicitud.estado,
      centroOrigenId: solicitud.centroOrigenId,
      centroDestinoId,
    });
    if (impedimento?.motivo === "ESTADO_INCOMPATIBLE") {
      return conflicto("Solo se puede elegir destino con el triaje hecho y antes de la aprobación", {
        estadoActual: impedimento.estadoActual,
        transicionesPosibles: impedimento.transicionesPosibles,
      });
    }
    if (impedimento?.motivo === "DESTINO_IGUAL_A_ORIGEN") {
      return conflicto("El centro de destino no puede ser el de origen");
    }
    if (!solicitud.evaluacionTriaje) {
      return conflicto("Falta la evaluación de triaje", {
        estadoActual: solicitud.estado,
      });
    }

    if (!(await existeCentro(centroDestinoId))) {
      return noEncontrado("El centro de destino no existe");
    }

    const tipoRequerido = unidadRequerida(
      solicitud.evaluacionTriaje.nivelUrgenciaSugerido,
    );
    const unidades = await listarUnidadesDelCentro(centroDestinoId);
    if (!unidadConCamaLibre(unidades, tipoRequerido)) {
      return capacidadAgotada(tipoRequerido, tiposConCamaLibre(unidades));
    }

    // 6. DELEGAR — null: la aprobaron o rechazaron entre la lectura y acá.
    const actualizada = await asignarDestino({
      solicitudId: id,
      centroOrigenId: usuario.centroSaludId,
      centroDestinoId,
    });
    if (!actualizada) {
      return conflicto("La solicitud cambió de estado mientras se procesaba");
    }

    return NextResponse.json(actualizada, { status: 200 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/destino", error);
  }
}
