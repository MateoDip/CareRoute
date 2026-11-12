import { baseDePruebas } from "../e2e/base";

/**
 * ¿Cuánto ayudan los índices? (clase 14): `npm run demo:indices`.
 *
 * Corre EXPLAIN ANALYZE sobre las consultas de las pantallas principales, con y
 * sin sus índices, en la base local de pruebas. "Sin índice" es de verdad: el
 * índice se borra dentro de una transacción que después se deshace, así que la
 * base queda como estaba.
 *
 * Antes: `npm run db:carga` (con 6 filas, cualquier consulta es instantánea).
 * Cada medición se repite tres veces y se queda con la mejor: la primera suele
 * ser más lenta porque los datos todavía no están en memoria.
 */

type Busqueda = {
  nombre: string;
  sql: string;
  /** Los índices que usa: se borran para medir "sin índice". */
  indices: string[];
};

const HECA = "centro-origen-1";

const BUSQUEDAS: Busqueda[] = [
  {
    nombre: "Listado de tu centro (/)",
    sql: `SELECT "id" FROM "SolicitudTraslado"
          WHERE "centroOrigenId" = '${HECA}' OR "centroDestinoId" = '${HECA}'
          ORDER BY "fechaSolicitud" DESC LIMIT 50`,
    indices: [
      "SolicitudTraslado_centroOrigenId_idx",
      "SolicitudTraslado_centroDestinoId_idx",
      "SolicitudTraslado_centroOrigenId_pacienteDniActivo_key",
    ],
  },
  {
    nombre: "Entrantes (/?rol=destino)",
    sql: `SELECT "id" FROM "SolicitudTraslado"
          WHERE "centroDestinoId" = '${HECA}'
          ORDER BY "fechaSolicitud" DESC LIMIT 50`,
    indices: ["SolicitudTraslado_centroDestinoId_idx"],
  },
  {
    nombre: "¿Ya tiene una derivación abierta? (regla 6)",
    sql: `SELECT "id" FROM "SolicitudTraslado"
          WHERE "centroOrigenId" = '${HECA}' AND "pacienteDniActivo" = '20000101'`,
    indices: [
      "SolicitudTraslado_centroOrigenId_pacienteDniActivo_key",
      "SolicitudTraslado_centroOrigenId_idx",
    ],
  },
];

type Nodo = {
  "Node Type": string;
  "Actual Rows"?: number;
  "Actual Loops"?: number;
  "Rows Removed by Filter"?: number;
  Plans?: Nodo[];
};
type Medicion = { ms: number; filasLeidas: number; plan: string };

/** Las hojas del plan son las que leen la tabla o el índice. */
function hojas(nodo: Nodo): Nodo[] {
  return nodo.Plans?.length ? nodo.Plans.flatMap(hojas) : [nodo];
}

const base = baseDePruebas();

async function medir(sql: string, indicesABorrar: string[]): Promise<Medicion> {
  let mejor: Medicion | null = null;
  for (let intento = 0; intento < 3; intento += 1) {
    const medicion = await base
      .$transaction(async (tx) => {
        for (const indice of indicesABorrar) {
          await tx.$executeRawUnsafe(`DROP INDEX "${indice}"`);
        }
        const filas = await tx.$queryRawUnsafe<{ "QUERY PLAN": [{ Plan: Nodo; "Execution Time": number }] }[]>(
          `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`,
        );
        const resultado = filas[0]?.["QUERY PLAN"][0];
        if (!resultado) throw new Error("EXPLAIN no devolvió un plan");
        const leidas = hojas(resultado.Plan);
        const valor: Medicion = {
          ms: resultado["Execution Time"],
          filasLeidas: leidas.reduce(
            (total, nodo) =>
              total + ((nodo["Actual Rows"] ?? 0) + (nodo["Rows Removed by Filter"] ?? 0)) * (nodo["Actual Loops"] ?? 1),
            0,
          ),
          plan: [...new Set(leidas.map((nodo) => nodo["Node Type"]))].join(" + "),
        };
        // Se deshace la transacción: el índice borrado vuelve.
        throw new Deshacer(valor);
      })
      .catch((error: unknown) => {
        if (error instanceof Deshacer) return error.medicion;
        throw error;
      });
    if (!mejor || medicion.ms < mejor.ms) mejor = medicion;
  }
  if (!mejor) throw new Error("Sin mediciones");
  return mejor;
}

class Deshacer extends Error {
  constructor(readonly medicion: Medicion) {
    super("deshacer");
  }
}

const formato = (m: Medicion) =>
  `${m.ms.toFixed(2).replace(".", ",")} ms · ${m.filasLeidas.toLocaleString("es-AR")} filas · ${m.plan}`;

async function main() {
  const total = await base.solicitudTraslado.count();
  console.log(`SolicitudTraslado: ${total.toLocaleString("es-AR")} filas\n`);
  console.log("| Búsqueda | Sin índice | Con índice | Mejora |");
  console.log("|---|---|---|---|");
  for (const busqueda of BUSQUEDAS) {
    const sin = await medir(busqueda.sql, busqueda.indices);
    const con = await medir(busqueda.sql, []);
    const mejora = Math.round(sin.ms / Math.max(con.ms, 0.001));
    console.log(`| ${busqueda.nombre} | ${formato(sin)} | ${formato(con)} | ${mejora}× |`);
  }
  await base.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await base.$disconnect();
  process.exit(1);
});
