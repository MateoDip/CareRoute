import { PrismaClient, type RolUsuario } from "@prisma/client";

/**
 * Datos de prueba para recorrer el flujo principal y cada fila del catálogo de
 * errores de docs/api.md (una request por fila en docs/api.http).
 *
 * Es idempotente: cada `upsert` reinicia el estado, así `npm run db:seed` deja
 * todo listo para volver a correr api.http de punta a punta.
 *
 * USUARIOS (clase 6): el login es con Google, así que para entrar con cada rol
 * hace falta un mail REAL. No se commitean: salen de .env.local.
 *   SEED_EMAIL_ADMIN, SEED_EMAIL_DERIVANTE, SEED_EMAIL_RECEPTOR
 * Si falta alguno, se usa un mail ficticio (sirve para la base, no para entrar).
 * Los ids de usuario no se escriben a mano: los genera la base.
 */

const prisma = new PrismaClient();

function emailDe(variable: string, ficticio: string): string {
  const valor = process.env[variable]?.trim();
  return valor ? valor.toLowerCase() : ficticio;
}

/**
 * Crea el usuario o, si ya entró con Google (y quedó MEDICO_DERIVANTE sin
 * centro), le asigna el rol y el centro de prueba. Es lo que haría un admin.
 */
async function usuarioDePrueba(datos: {
  email: string;
  nombre: string;
  rol: RolUsuario;
  centroSaludId: string | null;
}) {
  await prisma.usuario.upsert({
    where: { email: datos.email },
    update: { rol: datos.rol, centroSaludId: datos.centroSaludId },
    create: datos,
  });
}

async function main() {
  // ---------------------------------------------------------------------------
  // 1. Centros, unidades y recursos
  // ---------------------------------------------------------------------------
  const centroOrigen = await prisma.centroSalud.upsert({
    where: { id: "centro-origen-1" },
    update: {},
    create: {
      id: "centro-origen-1",
      nombre: "Hospital de Emergencias Clemente Álvarez (HECA)",
      nivelComplejidad: "ALTA",
      ubicacion: "Pellegrini 3205",
    },
  });

  const centroDestino = await prisma.centroSalud.upsert({
    where: { id: "centro-destino-1" },
    update: {},
    create: {
      id: "centro-destino-1",
      nombre: "Hospital Provincial del Centenario",
      nivelComplejidad: "ALTA",
      ubicacion: "Urquiza 3101",
    },
  });

  // Centro con UTI en cero y UCO libre: dispara "Capacidad agotada" (HU04).
  const centroSinCamas = await prisma.centroSalud.upsert({
    where: { id: "centro-sin-camas-1" },
    update: {},
    create: {
      id: "centro-sin-camas-1",
      nombre: "Sanatorio de Prueba Sin Camas UTI",
      nivelComplejidad: "MEDIA",
      ubicacion: "Córdoba 1000",
    },
  });

  const unidades = [
    { id: "unidad-origen-uti", centroSaludId: centroOrigen.id, tipo: "UTI", camas: 1 },
    { id: "unidad-destino-uti", centroSaludId: centroDestino.id, tipo: "UTI", camas: 3 },
    { id: "unidad-destino-uco", centroSaludId: centroDestino.id, tipo: "UCO", camas: 2 },
    { id: "unidad-destino-sala", centroSaludId: centroDestino.id, tipo: "SALA_COMUN", camas: 8 },
    { id: "unidad-sincamas-uti", centroSaludId: centroSinCamas.id, tipo: "UTI", camas: 0 },
    { id: "unidad-sincamas-uco", centroSaludId: centroSinCamas.id, tipo: "UCO", camas: 2 },
  ] as const;

  for (const unidad of unidades) {
    await prisma.unidadCuidados.upsert({
      where: { id: unidad.id },
      update: { camasDisponibles: unidad.camas },
      create: {
        id: unidad.id,
        centroSaludId: unidad.centroSaludId,
        tipo: unidad.tipo,
        camasDisponibles: unidad.camas,
      },
    });
  }

  // Regla de negocio violada a propósito: un respirador fuera de servicio no
  // suma como recurso operativo en el ranking.
  await prisma.recursoEspecializado.upsert({
    where: { id: "recurso-roto-1" },
    update: {},
    create: {
      id: "recurso-roto-1",
      centroSaludId: centroDestino.id,
      tipo: "RESPIRADOR",
      estado: "FUERA_DE_SERVICIO",
      ultimaRevision: new Date("2026-08-01T12:00:00Z"),
    },
  });

  await prisma.recursoEspecializado.upsert({
    where: { id: "recurso-ok-1" },
    update: {},
    create: {
      id: "recurso-ok-1",
      centroSaludId: centroDestino.id,
      tipo: "MONITOR_MULTIPARAMETRICO",
      estado: "OPERATIVO",
      ultimaRevision: new Date("2026-09-01T12:00:00Z"),
    },
  });

  // ---------------------------------------------------------------------------
  // 2. Usuarios de prueba, uno por rol
  // ---------------------------------------------------------------------------
  await usuarioDePrueba({
    email: emailDe("SEED_EMAIL_ADMIN", "admin@careroute.test"),
    nombre: "Admin de prueba",
    rol: "ADMIN",
    centroSaludId: null, // el admin no participa del flujo clínico
  });

  await usuarioDePrueba({
    email: emailDe("SEED_EMAIL_DERIVANTE", "derivante@heca.test"),
    nombre: "Dr. Pérez (Derivante HECA)",
    rol: "MEDICO_DERIVANTE",
    centroSaludId: centroOrigen.id,
  });

  await usuarioDePrueba({
    email: emailDe("SEED_EMAIL_RECEPTOR", "receptor@centenario.test"),
    nombre: "Dra. Gómez (Receptora Centenario)",
    rol: "MEDICO_RECEPTOR",
    centroSaludId: centroDestino.id,
  });

  // ---------------------------------------------------------------------------
  // 3. Solicitudes, una por situación del catálogo de errores
  // ---------------------------------------------------------------------------

  // PENDIENTE, sin triaje: corregir DNI, evaluar, 409 de "falta triaje".
  await prisma.solicitudTraslado.upsert({
    where: { id: "solicitud-pendiente-1" },
    update: { estado: "PENDIENTE", centroDestinoId: null, fechaAprobacion: null },
    create: {
      id: "solicitud-pendiente-1",
      centroOrigenId: centroOrigen.id,
      pacienteDni: "99000010",
    },
  });
  await prisma.evaluacionTriaje.deleteMany({
    where: { solicitudId: "solicitud-pendiente-1" },
  });

  // EVALUANDO, CRÍTICO (→ UTI), sin destino: el derivante elige destino.
  await prisma.solicitudTraslado.upsert({
    where: { id: "solicitud-evaluada-1" },
    update: { estado: "EVALUANDO", centroDestinoId: null, fechaAprobacion: null },
    create: {
      id: "solicitud-evaluada-1",
      centroOrigenId: centroOrigen.id,
      pacienteDni: "99000001",
      estado: "EVALUANDO",
      evaluacionTriaje: {
        create: {
          frecuenciaCardiaca: 130,
          presionSistolica: 85,
          presionDiastolica: 50,
          nivelUrgenciaSugerido: "CRITICO",
          origenNivel: "MANUAL",
        },
      },
    },
  });

  // EVALUANDO, CRÍTICO, destino ya elegido (Centenario): la aprueba el receptor.
  await prisma.solicitudTraslado.upsert({
    where: { id: "solicitud-propuesta-1" },
    update: {
      estado: "EVALUANDO",
      centroDestinoId: centroDestino.id,
      fechaAprobacion: null,
    },
    create: {
      id: "solicitud-propuesta-1",
      centroOrigenId: centroOrigen.id,
      centroDestinoId: centroDestino.id,
      pacienteDni: "99000003",
      estado: "EVALUANDO",
      evaluacionTriaje: {
        create: {
          frecuenciaCardiaca: 125,
          presionSistolica: 90,
          presionDiastolica: 55,
          nivelUrgenciaSugerido: "CRITICO",
          origenNivel: "IA",
        },
      },
    },
  });

  // APROBADA con tripulación asignada: 409 de "ya aprobada", 403 del derivante
  // que intenta rechazarla (spec §6), rechazo del receptor que devuelve la cama.
  const aprobada = await prisma.solicitudTraslado.upsert({
    where: { id: "solicitud-ok-1" },
    update: { estado: "APROBADA", centroDestinoId: centroDestino.id },
    create: {
      id: "solicitud-ok-1",
      centroOrigenId: centroOrigen.id,
      centroDestinoId: centroDestino.id,
      pacienteDni: "99000004",
      estado: "APROBADA",
      fechaAprobacion: new Date("2026-09-20T14:30:00Z"),
      evaluacionTriaje: {
        create: {
          frecuenciaCardiaca: 80,
          presionSistolica: 120,
          presionDiastolica: 80,
          nivelUrgenciaSugerido: "MEDIO",
          origenNivel: "MANUAL",
        },
      },
    },
  });

  // N-N: una tripulación hace varios traslados; este traslado tiene una.
  const tripulacion = await prisma.tripulacionMedica.upsert({
    where: { id: "tripulacion-1" },
    update: {},
    create: {
      id: "tripulacion-1",
      patenteAmbulancia: "AE123CD",
      paramedicoResponsable: "Lic. Romero",
      estado: "EN_BASE",
    },
  });
  await prisma.asignacionTripulacion.upsert({
    where: {
      solicitudId_tripulacionMedicaId: {
        solicitudId: aprobada.id,
        tripulacionMedicaId: tripulacion.id,
      },
    },
    update: {},
    create: { solicitudId: aprobada.id, tripulacionMedicaId: tripulacion.id },
  });

  // Solicitud de OTRO centro: para el derivante del HECA tiene que dar 404.
  await prisma.solicitudTraslado.upsert({
    where: { id: "solicitud-ajena-1" },
    update: {},
    create: {
      id: "solicitud-ajena-1",
      centroOrigenId: centroSinCamas.id,
      pacienteDni: "99000002",
    },
  });

  console.log("Seed ejecutado: centros, usuarios de prueba y solicitudes cargados.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
