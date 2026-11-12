# ADR 0010 — Una derivación abierta por paciente: la regla la cumple la base

**Estado:** propuesta (a revisar en el PR de la clase 14)
**Fecha:** 2026-11-11
**Decide:** equipo CareRoute

---

## Contexto

En la clase 14 buscamos en la spec y en `lib/` las reglas de "uno solo". Las transiciones
de estado ya eran seguras (`updateMany` con el estado esperado en el `where`) y la reserva
de cama también (`camasDisponibles > 0` dentro del `updateMany`, en una transacción). Lo que
faltaba era una regla que la spec no tenía escrita y que el código esperaba ("el caso existe
para que la API y la pantalla escriban por el mismo camino cuando aparezca una", decía
`lib/casos/iniciar-solicitud.ts`): **un paciente no puede tener dos derivaciones abiertas
desde el mismo centro**. Dos derivaciones del mismo paciente pueden terminar con dos camas
reservadas en dos hospitales para una sola persona.

La regla quedó como la 6 de la spec §6. La primera versión fue un `if` en el caso de uso
(buscar una abierta y, si no hay, crear). Con diez pedidos simultáneos para el mismo DNI
(`npm run demo:carrera`), se aceptaron siete. El hueco entre preguntar y guardar existe y el
botón deshabilitado no lo cierra: dos pestañas, dos médicos o un reintento de red alcanzan.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A. El `if` en el caso de uso | Simple | Con pedidos simultáneos no funciona (7 de 10 guardados) |
| B. Índice único **parcial** en SQL: `UNIQUE (centroOrigenId, pacienteDni) WHERE estado NOT IN ('RECHAZADA','FINALIZADA')` | Es la herramienta de Postgres para esto; no agrega columnas | Prisma 6 no lo puede escribir en `schema.prisma`: no lo ve, y un `migrate dev` futuro puede generar el `DROP INDEX` sin que nadie lo note |
| C. Columna `pacienteDniActivo` (el DNI mientras está abierta, `null` al cerrarse) y `@@unique([centroOrigenId, pacienteDniActivo])` | Se ve en `schema.prisma` y Prisma lo mantiene; Postgres no compara los `null`, así que las cerradas no chocan | Hay que acordarse de ponerla en `null` al cerrar (hoy, un solo lugar: el rechazo) |
| D. Lock de la fila del centro (`SELECT … FOR UPDATE`) antes de crear | Sin cambio de modelo | Serializa todas las derivaciones del centro, no solo las del mismo paciente; la regla sigue sin estar escrita en la base |

## Decisión

Elegimos **C**.

Porque la regla queda en la base y a la vista en `schema.prisma`, y la herramienta es la
misma de la clase (`@@unique` + capturar P2002) sin depender de algo que Prisma no conoce.

## Consecuencias

- `lib/db/solicitudes.ts` es el único que escribe `pacienteDniActivo`: al crear, al
  corregir el DNI (PATCH) y al rechazar (`null`). La transición a `FINALIZADA`, cuando
  exista, también tiene que ponerlo en `null` (AGENTS.md §2.4).
- `crearSolicitud` no pregunta antes: intenta guardar. El P2002 se devuelve como resultado
  esperado y sale como **409** con el mismo mensaje que el caso normal, nunca 500. El 409
  trae `solicitudAbiertaId` y la pantalla ofrece "Ver la derivación abierta".
- La migración `20261111230000_una_derivacion_abierta_por_paciente` completa la columna de
  las filas existentes. Si un paciente ya tenía más de una abierta, solo la más reciente
  toma el DNI: el índice se crea sin borrar ni cerrar ninguna fila (el historial no se toca).
- El alcance es el centro de origen a propósito: una regla global respondería 409 por una
  derivación de otro hospital, y eso revelaría que ese paciente está siendo derivado allá
  (el mismo criterio del 404 de `docs/api.md`).
- Prueba: `e2e/concurrencia.spec.ts` (diez pedidos por HTTP, uno aceptado, nueve 409, una
  fila en la base; el rechazo libera al paciente; el PATCH también choca). Demostración sin
  HTTP: `npm run demo:carrera` (antes: 7 guardados; después: 1).
- Después del merge hay que aplicar la migración en producción (`npx prisma migrate deploy`
  con las variables de producción): Vercel no lo hace.
