import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Centros de Salud (Origen y Destino)
  const centroOrigen = await prisma.centroSalud.upsert({
    where: { id: 'centro-origen-1' },
    update: {},
    create: {
      id: 'centro-origen-1',
      nombre: 'Hospital de Emergencias Clemente Álvarez (HECA)',
      nivelComplejidad: 'ALTA',
      ubicacion: 'Pellegrini 3205',
    },
  })

  const centroDestino = await prisma.centroSalud.upsert({
    where: { id: 'centro-destino-1' },
    update: {},
    create: {
      id: 'centro-destino-1',
      nombre: 'Hospital Provincial del Centenario',
      nivelComplejidad: 'ALTA',
      ubicacion: 'Urquiza 3101',
    },
  })

  // 2. Usuarios con distintos roles
  await prisma.usuario.upsert({
    where: { email: 'derivante@heca.gov.ar' },
    update: {},
    create: {
      email: 'derivante@heca.gov.ar',
      nombre: 'Dr. Pérez (Derivante)',
      rol: 'MEDICO_DERIVANTE',
      centroSaludId: centroOrigen.id,
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'receptor@centenario.gov.ar' },
    update: {},
    create: {
      email: 'receptor@centenario.gov.ar',
      nombre: 'Dra. Gómez (Receptora)',
      rol: 'MEDICO_RECEPTOR',
      centroSaludId: centroDestino.id,
    },
  })

  // 2b. Unidades de cuidados — sin camas cargadas, ninguna derivación se puede
  // aprobar, así que hacen falta para probar HU04.
  await prisma.unidadCuidados.upsert({
    where: { id: 'unidad-origen-uti' },
    update: {},
    create: {
      id: 'unidad-origen-uti',
      centroSaludId: centroOrigen.id,
      tipo: 'UTI',
      camasDisponibles: 1,
    },
  })

  await prisma.unidadCuidados.upsert({
    where: { id: 'unidad-destino-uti' },
    update: { camasDisponibles: 3 },
    create: {
      id: 'unidad-destino-uti',
      centroSaludId: centroDestino.id,
      tipo: 'UTI',
      camasDisponibles: 3,
    },
  })

  await prisma.unidadCuidados.upsert({
    where: { id: 'unidad-destino-uco' },
    update: { camasDisponibles: 2 },
    create: {
      id: 'unidad-destino-uco',
      centroSaludId: centroDestino.id,
      tipo: 'UCO',
      camasDisponibles: 2,
    },
  })

  await prisma.unidadCuidados.upsert({
    where: { id: 'unidad-destino-sala' },
    update: {},
    create: {
      id: 'unidad-destino-sala',
      centroSaludId: centroDestino.id,
      tipo: 'SALA_COMUN',
      camasDisponibles: 8,
    },
  })

  // 3. Caso Feliz: Solicitud aprobada con evaluación de triaje completa
  await prisma.solicitudTraslado.upsert({
    where: { id: 'solicitud-ok-1' },
    update: { estado: 'APROBADA', centroDestinoId: centroDestino.id },
    create: {
      id: 'solicitud-ok-1',
      centroOrigenId: centroOrigen.id,
      centroDestinoId: centroDestino.id,
      pacienteDni: '12345678',
      estado: 'APROBADA',
      evaluacionTriaje: {
        create: {
          frecuenciaCardiaca: 80,
          presionSistolica: 120,
          presionDiastolica: 80,
          nivelUrgenciaSugerido: 'MEDIO',
        }
      }
    },
  })

  // 4. Caso "Regla de Negocio": Recurso roto para probar que no se puedan asignar derivaciones
  await prisma.recursoEspecializado.upsert({
    where: { id: 'recurso-roto-1' },
    update: {},
    create: {
      id: 'recurso-roto-1',
      centroSaludId: centroDestino.id,
      tipo: 'RESPIRADOR',
      estado: 'FUERA_DE_SERVICIO', // <-- El caso "trampa" que pide la cátedra
      ultimaRevision: new Date(),
    }
  })

  await prisma.solicitudTraslado.upsert({
    where: { id: 'solicitud-pendiente-1' },
    update: {},
    create: {
      id: 'solicitud-pendiente-1',
      centroOrigenId: centroOrigen.id,
      pacienteDni: '87654321',
      estado: 'PENDIENTE',
    },
  })

  // 5. Datos para docs/api.http — un caso por fila del catálogo de errores.
  //    Los `update` reinician el estado: `npm run db:seed` deja todo listo para
  //    volver a correr el archivo entero después de aprobar o rechazar.

  // Receptor que trabaja en el centro de origen: dispara "destino = origen" (409).
  await prisma.usuario.upsert({
    where: { email: 'receptor@heca.gov.ar' },
    update: {},
    create: {
      email: 'receptor@heca.gov.ar',
      nombre: 'Dr. Ruiz (Receptor HECA)',
      rol: 'MEDICO_RECEPTOR',
      centroSaludId: centroOrigen.id,
    },
  })

  // Centro con UTI en cero y UCO libre: dispara "Capacidad agotada" (H3).
  const centroSinCamas = await prisma.centroSalud.upsert({
    where: { id: 'centro-sin-camas-1' },
    update: {},
    create: {
      id: 'centro-sin-camas-1',
      nombre: 'Sanatorio de Prueba Sin Camas UTI',
      nivelComplejidad: 'MEDIA',
      ubicacion: 'Córdoba 1000',
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'receptor@sincamas.gov.ar' },
    update: {},
    create: {
      email: 'receptor@sincamas.gov.ar',
      nombre: 'Dra. Sosa (Receptora sin camas)',
      rol: 'MEDICO_RECEPTOR',
      centroSaludId: centroSinCamas.id,
    },
  })

  await prisma.unidadCuidados.upsert({
    where: { id: 'unidad-sincamas-uti' },
    update: { camasDisponibles: 0 },
    create: {
      id: 'unidad-sincamas-uti',
      centroSaludId: centroSinCamas.id,
      tipo: 'UTI',
      camasDisponibles: 0,
    },
  })

  await prisma.unidadCuidados.upsert({
    where: { id: 'unidad-sincamas-uco' },
    update: { camasDisponibles: 2 },
    create: {
      id: 'unidad-sincamas-uco',
      centroSaludId: centroSinCamas.id,
      tipo: 'UCO',
      camasDisponibles: 2,
    },
  })

  // Solicitud EVALUANDO, urgencia CRITICO (→ UTI), sin destino: la que se aprueba.
  await prisma.solicitudTraslado.upsert({
    where: { id: 'solicitud-evaluada-1' },
    update: { estado: 'EVALUANDO', centroDestinoId: null },
    create: {
      id: 'solicitud-evaluada-1',
      centroOrigenId: centroOrigen.id,
      pacienteDni: '99000001',
      estado: 'EVALUANDO',
      evaluacionTriaje: {
        create: {
          frecuenciaCardiaca: 130,
          presionSistolica: 85,
          presionDiastolica: 50,
          nivelUrgenciaSugerido: 'CRITICO',
        },
      },
    },
  })

  // Solicitud de otro centro: para el derivante del HECA tiene que dar 404.
  await prisma.solicitudTraslado.upsert({
    where: { id: 'solicitud-ajena-1' },
    update: {},
    create: {
      id: 'solicitud-ajena-1',
      centroOrigenId: centroSinCamas.id,
      pacienteDni: '99000002',
      estado: 'PENDIENTE',
    },
  })

  console.log('Seed ejecutado correctamente: Datos cargados en la base.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })