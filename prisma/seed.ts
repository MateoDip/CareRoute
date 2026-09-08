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

  // 3. Caso Feliz: Solicitud aprobada con evaluación de triaje completa
  await prisma.solicitudTraslado.upsert({
    where: { id: 'solicitud-ok-1' },
    update: {},
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

  const solicitudPendiente = await prisma.solicitudTraslado.upsert({
    where: { id: 'solicitud-pendiente-1' },
    update: {},
    create: {
      id: 'solicitud-pendiente-1',
      centroOrigenId: centroOrigen.id,
      pacienteDni: '87654321',
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