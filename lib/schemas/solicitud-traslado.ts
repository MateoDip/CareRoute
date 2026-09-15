import { z } from "zod";

/**
 * Los ids los genera Prisma con `cuid()`, no son UUID. Validarlos con `.uuid()`
 * rechazaría el 100% de los ids reales.
 */
export const idSchema = z
  .string()
  .trim()
  .min(1, "El ID es obligatorio")
  .max(64, "El ID es demasiado largo");

export const estadoSolicitudSchema = z.enum([
  "PENDIENTE",
  "EVALUANDO",
  "APROBADA",
  "RECHAZADA",
  "EN_CURSO",
  "FINALIZADA",
]);

export const pacienteDniSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "El DNI solo puede tener números")
  .min(7, "El DNI debe tener al menos 7 números")
  .max(10, "El DNI no puede superar los 10 números");

/** Body de POST /api/solicitudes. El centro de origen sale de la sesión. */
export const crearSolicitudSchema = z.object({
  pacienteDni: pacienteDniSchema,
});

/** Body de PATCH /api/solicitudes/:id. Todos los campos opcionales. */
export const actualizarSolicitudSchema = crearSolicitudSchema.partial();

/** Query params de GET /api/solicitudes. */
export const filtroSolicitudesSchema = z.object({
  rol: z.enum(["origen", "destino"]).optional(),
  estado: estadoSolicitudSchema.optional(),
});

/** Body de POST /api/solicitudes/:id/aprobacion. */
export const aprobarSolicitudSchema = z.object({
  centroDestinoId: idSchema,
});

/** Representación completa de una solicitud ya persistida. */
export const solicitudTrasladoSchema = z.object({
  id: idSchema,
  centroOrigenId: idSchema,
  centroDestinoId: idSchema.optional(),
  pacienteDni: pacienteDniSchema,
  estado: estadoSolicitudSchema,
  fechaSolicitud: z.coerce.date({
    required_error: "La fecha de solicitud es obligatoria",
    invalid_type_error: "Formato de fecha inválido",
  }),
});

export type CrearSolicitud = z.infer<typeof crearSolicitudSchema>;
export type ActualizarSolicitud = z.infer<typeof actualizarSolicitudSchema>;
export type FiltroSolicitudes = z.infer<typeof filtroSolicitudesSchema>;
export type SolicitudTraslado = z.infer<typeof solicitudTrasladoSchema>;
