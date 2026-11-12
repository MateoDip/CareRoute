import { baseDePruebas } from "../e2e/base";

/**
 * Muchos datos en la base local de pruebas (clase 14): `npm run db:carga`.
 *
 * Agrega 200 centros y 50.000 solicitudes ficticias (DNI desde 20.000.001, sin
 * datos reales) para medir con `npm run demo:indices` cómo responden las
 * consultas de las pantallas principales cuando la tabla deja de ser chica.
 * El HECA del seed (centro-origen-1) recibe 500 como origen y 250 como destino.
 *
 * Solo la base de .env.e2e: `baseDePruebas` corta si no es local. La próxima
 * corrida de `npm run test:e2e` la deja limpia otra vez.
 */
const CENTROS = 200;
const SOLICITUDES = 50_000;

async function main() {
  const base = baseDePruebas();

  await base.$executeRawUnsafe(`
    INSERT INTO "CentroSalud" ("id", "nombre", "nivelComplejidad", "ubicacion", "actualizadaEn")
    SELECT 'carga-centro-' || n, 'Centro de carga ' || n, 'MEDIA', 'Calle ficticia ' || n, now()
    FROM generate_series(1, ${CENTROS}) AS n
    ON CONFLICT ("id") DO NOTHING
  `);

  // Una de cada cuatro, rechazada (pacienteDniActivo en null, regla 6). Una de
  // cada cien sale del HECA y una de cada doscientas llega a él.
  const insertadas = await base.$executeRawUnsafe(`
    INSERT INTO "SolicitudTraslado"
      ("id", "pacienteDni", "pacienteDniActivo", "estado", "centroOrigenId", "centroDestinoId", "fechaSolicitud", "actualizadaEn")
    SELECT
      'carga-solicitud-' || n,
      (20000000 + n)::text,
      CASE WHEN n % 4 = 0 THEN NULL ELSE (20000000 + n)::text END,
      (CASE WHEN n % 4 = 0 THEN 'RECHAZADA' WHEN n % 3 = 0 THEN 'EVALUANDO' ELSE 'PENDIENTE' END)::"EstadoSolicitud",
      CASE WHEN n % 100 = 1 THEN 'centro-origen-1' ELSE 'carga-centro-' || (n % ${CENTROS} + 1) END,
      CASE
        WHEN n % 200 = 2 THEN 'centro-origen-1'
        WHEN n % 3 = 0 THEN 'carga-centro-' || ((n + 7) % ${CENTROS} + 1)
      END,
      now() - make_interval(mins => n),
      now()
    FROM generate_series(1, ${SOLICITUDES}) AS n
    ON CONFLICT ("id") DO NOTHING
  `);

  // Estadísticas al día: sin esto, el planificador de Postgres decide a ciegas.
  await base.$executeRawUnsafe(`ANALYZE "SolicitudTraslado"`);
  const total = await base.solicitudTraslado.count();

  console.log(`Carga lista: ${insertadas} solicitudes nuevas, ${total} en total.`);
  await base.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
