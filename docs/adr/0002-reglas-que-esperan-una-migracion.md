# ADR 0002 — Reglas que esperan una migración

**Estado:** aceptada
**Fecha:** 2026-09-22
**Decide:** equipo CareRoute

---

## Contexto

Al implementar las reglas de negocio en `lib/` y conectarlas a los handlers,
cuatro reglas no se pudieron resolver con código solamente: la regla existe en
la spec, pero el modelo de datos no tiene dónde guardar la información que la regla
necesita. Implementarlas "como se pueda" significaría inventar datos o dejar la
regla a medias, que es peor que no tenerla porque parece cumplida.

| Regla | Dónde aplica | Qué falta en el modelo |
|---|---|---|
| Verificar que el equipamiento que necesita el paciente esté `OPERATIVO` en el destino (HU04) | `app/api/solicitudes/[id]/aprobacion/route.ts` | No hay relación entre `SolicitudTraslado` y `TipoRecurso`: no se sabe qué equipamiento pide cada paciente |
| Incorporar la distancia al centro de origen en el puntaje (HU03) | `lib/scoring-hospitales.ts` | `CentroSalud.ubicacion` es texto libre, no coordenadas |
| Auditar la corrección manual de la urgencia sugerida por la IA (spec §6, regla 2) | `app/api/solicitudes/[id]/evaluacion/route.ts` | `EvaluacionTriaje` guarda un solo nivel: no distingue el sugerido del confirmado |
| Registrar eventos en la bitácora y las transiciones a `EN_CURSO` / `FINALIZADA` | `app/api/solicitudes/[id]/bitacora/route.ts` | No es una regla de validación sino una funcionalidad nueva (seguimiento), que no está en el contrato de `docs/api.md` |

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A. Implementar con lo que hay (p. ej. pedir el equipamiento en el body) | Se borran los TODO | El cliente podría mentir sobre lo que necesita el paciente, que es exactamente lo que el diseño de la API evita |
| B. Hacer las migraciones en el mismo PR que las reglas | Las reglas quedan completas | Mezcla un cambio de modelo con el trabajo de validación; un PR demasiado grande para revisar |
| C. Postergar con decisión escrita | El PR de las reglas queda acotado; la deuda queda visible y justificada | Las reglas siguen sin cumplirse hasta la migración |

## Decisión

Elegimos **C**.

Porque las cuatro dependen de un cambio de modelo, y un cambio de modelo merece su
propio PR y su propia migración versionada.

## Consecuencias

- Los comentarios del código apuntan a este ADR en lugar de a un TODO.
- La regla §6.2 figura en el catálogo de errores de `docs/api.md` con capa
  "postergada", para que no quede como un caso de error sin fila.
- Migraciones pendientes: (1) `SolicitudTraslado` ↔ `TipoRecurso` requerido,
  (2) latitud y longitud en `CentroSalud`, (3) `nivelUrgenciaConfirmado` en
  `EvaluacionTriaje` más un evento de bitácora para la corrección manual.
- Si alguna de estas reglas pasa a ser obligatoria para una entrega antes de que
  exista la migración, se revisa esta decisión.
