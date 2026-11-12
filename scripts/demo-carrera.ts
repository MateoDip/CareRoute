import { baseDePruebas } from "../e2e/base";
import { cargarEntornoE2E, variable } from "../e2e/entorno";

/**
 * Demostración de la clase 14: diez pedidos simultáneos para el mismo paciente,
 * directo contra el caso de uso (`npm run demo:carrera`).
 *
 * Llama a `iniciarSolicitud` diez veces a la vez con Promise.all, igual que la
 * Server Action y POST /api/solicitudes, y después cuenta en la base cuántas
 * derivaciones abiertas quedaron. Tiene que haber una.
 *
 * Corre contra la base local de las pruebas (.env.e2e), nunca contra producción.
 * Necesita la base con el seed: `npm run test:e2e` la deja lista.
 *
 * La prueba que corre en el CI es e2e/concurrencia.spec.ts (por HTTP). Esta va
 * sin HTTP: en una sola máquina, Next atiende los pedidos de a uno por vez
 * durante unos milisegundos y eso puede esconder el hueco entre preguntar y
 * guardar. Acá el hueco queda a la vista.
 */
async function main() {
  const entorno = cargarEntornoE2E();
  // Antes de importar lib/: el cliente de Prisma de la app lee estas variables.
  process.env.DATABASE_URL = variable(entorno, "DATABASE_URL");
  process.env.DIRECT_URL = variable(entorno, "DIRECT_URL");

  const { iniciarSolicitud } = await import("../lib/casos/iniciar-solicitud");
  const base = baseDePruebas();

  const usuario = await base.usuario.findUniqueOrThrow({
    where: { email: variable(entorno, "SEED_EMAIL_DERIVANTE") },
    select: { id: true, email: true, nombre: true, rol: true, centroSaludId: true },
  });
  if (!usuario.centroSaludId) throw new Error("El derivante del seed no tiene centro.");
  const derivante = { ...usuario, centroSaludId: usuario.centroSaludId };

  // Un DNI nuevo en cada corrida, para no chocar con la anterior.
  const pacienteDni = `7${String(Date.now()).slice(-8)}`;

  const resultados = await Promise.all(
    Array.from({ length: 10 }, () => iniciarSolicitud(derivante, { pacienteDni })),
  );

  const aceptados = resultados.filter((resultado) => resultado.ok).length;
  const rechazados = resultados.filter(
    (resultado) => !resultado.ok && resultado.motivo === "DERIVACION_ABIERTA",
  ).length;
  const guardados = await base.solicitudTraslado.count({
    where: {
      centroOrigenId: derivante.centroSaludId,
      pacienteDni,
      estado: { notIn: ["RECHAZADA", "FINALIZADA"] },
    },
  });

  console.log(
    `DNI ${pacienteDni}: ${aceptados} aceptados, ${rechazados} rechazados con 409, ` +
      `${guardados} guardados. Debería haber 1.`,
  );
  await base.$disconnect();
  process.exit(guardados === 1 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
