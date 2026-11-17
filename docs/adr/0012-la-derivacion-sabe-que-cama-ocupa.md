# ADR 0012 — La derivación sabe qué cama ocupa el paciente

**Estado:** aceptada
**Fecha:** 2026-11-16
**Decide:** Equipo (Mateo Duran, Nicolas Censi, Mateo Dip, Fernando Almansa)

---

## Contexto

Hasta ahora la cama se reservaba al aprobar (HU04) y se devolvía solo si el receptor
rechazaba una derivación aprobada. Qué cama devolver se deducía del triaje (crítico → UTI).
Faltaban tres cosas que el equipo pidió para que el contador de camas siga a la realidad
del hospital (regla 7):

1. El admin carga las camas libres de cada tipo al dar de alta un centro.
2. El receptor da el alta al paciente internado y su cama vuelve a quedar libre.
3. El receptor pasa al paciente a otra unidad (de UTI a sala común): libera una cama y
   ocupa otra de otro tipo.

Con el pase de unidad, deducir la cama del triaje deja de servir: después de un pase, el
paciente crítico está en sala común.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A. Deducir la cama del triaje y guardar solo el alta | Sin columna nueva | No sobrevive a un pase de unidad: el alta devolvería una cama de UTI cuando el paciente está en sala común |
| B. Tabla de internaciones (una fila por estadía en cada unidad) | Historial completo de cada estadía | Una tabla, RLS y consultas más para algo que la bitácora ya cuenta ("De UTI a Sala común") |
| C. `unidadOcupadaId` y `fechaAlta` en `SolicitudTraslado` | Una columna dice dónde está hoy; la bitácora cuenta el recorrido | La solicitud sigue viva después de `FINALIZADA` (pero sin cambiar de estado) |

## Decisión

Elegimos **C**.

- `unidadOcupadaId` se escribe en la misma transacción que el contador de camas de esa
  unidad: al aprobar (reserva), al rechazar una aprobada (vuelve a null), al pasar de
  unidad y al dar el alta (vuelve a null y se guarda `fechaAlta`). Lo escribe solo
  `lib/db/solicitudes.ts`.
- El alta y el pase son reglas de "una sola vez": la condición (`unidadOcupadaId` actual,
  `fechaAlta` null) va dentro del `updateMany`. Dos altas simultáneas liberan una sola
  cama (`e2e/concurrencia.spec.ts`). El pase descuenta la cama nueva solo si queda
  (`camasDisponibles > 0`); si no, se deshace todo y responde "Capacidad agotada".
- Alta y pase, solo con la derivación `FINALIZADA`: antes, la cama está reservada, no
  ocupada. No hay estado nuevo: la internación es "`FINALIZADA`, con cama y sin alta".
- `@@unique([centroSaludId, tipo])` en `UnidadCuidados`: una unidad por tipo en cada
  centro, así "las camas de UTI del HECA" es un solo número y la corrección a mano puede
  hacer `upsert`.
- El receptor (su centro) y el admin (cualquiera) pueden seguir corrigiendo el número a
  mano: el hospital interna pacientes que no llegan por CareRoute.

## Consecuencias

- Migración `20261116200000_cama_ocupada_alta_y_pase_de_unidad`: las derivaciones que ya
  estaban `APROBADA`, `EN_CURSO` o `FINALIZADA` toman la unidad de su triaje en el destino.
  Las `FINALIZADA` quedan internadas y se les puede dar el alta.
- Dos eventos nuevos en la bitácora: `CAMBIO_DE_UNIDAD` y `ALTA_DEL_PACIENTE`.
- La corrección a mano fija un número absoluto: si coincide con una aprobación en el mismo
  instante, gana la última escritura. Es una corrección del receptor, no una regla de
  "uno solo", y así lo aceptamos.
