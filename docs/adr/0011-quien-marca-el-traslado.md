# ADR 0011 — Quién marca la salida y la llegada del paciente

**Estado:** propuesta (a revisar en el PR del seguimiento del traslado)
**Fecha:** 2026-11-16
**Decide:** equipo CareRoute

---

## Contexto

El flujo principal terminaba en la aprobación: los estados `EN_CURSO` y `FINALIZADA`
existían en la máquina de estados (`lib/reglas-solicitud.ts`) pero ningún endpoint ni
pantalla llevaba una derivación hasta ahí. El ADR 0002 lo había dejado pendiente como
"funcionalidad nueva (seguimiento), que no está en el contrato de `docs/api.md`".

Para cerrar el flujo (HU07) había que decidir **quién** mueve el traslado entre esos
estados. La spec no lo decía, y es una decisión de dominio: un médico que marca un estado
está dando fe de algo que pasó.

Restricciones:

- Ninguna derivación se cierra sin la acción explícita de un profesional (AGENTS.md §1).
- Todavía no hay usuarios para la tripulación de la ambulancia: solo médicos derivantes,
  receptores y admins.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A. El origen marca la salida y el destino la llegada | Cada centro da fe de lo que ve con sus ojos: el derivante ve salir al paciente, el receptor lo recibe | Dos endpoints en vez de uno |
| B. El receptor marca las dos | Un solo responsable del traslado | El receptor marcaría una salida que pasó en otro hospital, sin poder verla |
| C. Cualquiera de los dos médicos marca las dos | Lo más simple | Cualquiera podría cerrar un traslado que no presenció; no hay forma de saber quién dio fe de qué |
| D. La tripulación marca los dos eventos | Es quien acompaña al paciente | Hoy no existe un rol ni un usuario para la tripulación: habría que agregarlo al modelo y a la autorización |

## Decisión

Elegimos **A**: el derivante del centro de origen marca la salida (`POST /inicio`,
`APROBADA` → `EN_CURSO`) y el receptor del centro de destino marca la llegada
(`POST /finalizacion`, `EN_CURSO` → `FINALIZADA`).

Porque cada transición la confirma quien la presencia, que es la misma lógica de la
aprobación: el receptor aprueba porque es quien reserva la cama.

## Consecuencias

- Cada endpoint exige un solo rol (403 para el otro) y busca la solicitud desde un solo
  lado (404 si no sale o no llega a su centro), con el mismo patrón que `/aprobacion`.
- Cada transición deja su evento en la bitácora (`PACIENTE_A_BORDO`, `LLEGADA_DESTINO`)
  en la misma transacción: el estado y el historial no se pueden contradecir.
- `FINALIZADA` cierra la derivación: `pacienteDniActivo` vuelve a `null` y el paciente se
  puede volver a derivar desde su centro (regla 6, ADR 0010).
- La cama reservada no se devuelve al finalizar: el paciente la ocupa al llegar. Liberarla
  cuando recibe el alta es otra funcionalidad, fuera del alcance de HU07.
- Si más adelante la tripulación tiene usuarios propios (opción D), se revisa esta
  decisión: los eventos intermedios de la bitácora (salida de la base, llegada al origen)
  le corresponderían a ella.
