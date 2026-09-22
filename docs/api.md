# Contrato de la API — CareRoute

Todos los endpoints viven bajo `/api` y devuelven JSON.

**Roles** (enum `RolUsuario`): `ADMIN`, `MEDICO_DERIVANTE`, `MEDICO_RECEPTOR`.

> **Autenticación provisoria.** Supabase Auth se implementa en la clase 6. Hasta
> entonces la identidad se resuelve con el header `x-usuario-email`, que se valida
> contra la tabla `Usuario`. Está marcado con `TODO (clase 6)` en `lib/sesion.ts`.

---

## Endpoints

| Método | Ruta | Descripción | HU | Rol | Errores |
|---|---|---|---|---|---|
| GET | `/api/solicitudes` | Lista las solicitudes del centro del usuario. Filtros opcionales: `?rol=origen\|destino` y `?estado=` | HU06, HU07 | Autenticado | 400 filtro inválido · 401 sin sesión |
| POST | `/api/solicitudes` | Registra una solicitud de traslado. El centro de origen sale de la sesión | HU01 | MEDICO_DERIVANTE | 400 body inválido · 401 sin sesión · 403 rol incorrecto |
| GET | `/api/solicitudes/:id` | Ficha de una solicitud con su evaluación de triaje | HU07 | Autenticado del centro involucrado | 401 · 404 no existe o no es de su centro |
| PATCH | `/api/solicitudes/:id` | Corrige datos de la solicitud. Solo mientras esté `PENDIENTE` | — | MEDICO_DERIVANTE del centro de origen | 400 · 401 · 403 · 404 · 409 estado no editable |
| GET | `/api/solicitudes/:id/bitacora` | Historial de eventos del traslado | HU07 | Autenticado del centro involucrado | 401 · 404 |
| POST | `/api/solicitudes/:id/evaluacion` | Registra la evaluación de triaje con el nivel de urgencia sugerido | HU02 | MEDICO_DERIVANTE del centro de origen | 400 · 401 · 403 · 404 · 409 ya tiene evaluación |
| GET | `/api/solicitudes/:id/candidatos` | Ranking de centros candidatos para esta derivación | HU03 | Autenticado del centro involucrado | 401 · 404 · 409 sin evaluación de triaje |
| **POST** | **`/api/solicitudes/:id/aprobacion`** | **Confirma la derivación: asigna centro destino, reserva la cama y pasa a `APROBADA`** | **HU04** | **MEDICO_RECEPTOR del centro destino** | **400 · 401 · 403 · 404 · 409 estado incompatible, sin evaluación o sin cama** |
| POST | `/api/solicitudes/:id/rechazo` | Cancela la derivación. Si estaba `APROBADA`, devuelve la cama reservada | spec §6 | MEDICO_DERIVANTE del origen o MEDICO_RECEPTOR del destino (una `APROBADA`, solo el receptor) | 401 · 403 rol o centro que no corresponde · 404 · 409 estado terminal |
| GET | `/api/centros` | Catálogo de centros con sus unidades y recursos | HU05 | Autenticado | 401 |
| PATCH | `/api/unidades/:id` | Actualiza las camas disponibles de una unidad | HU05 | ADMIN o MEDICO_RECEPTOR del centro | 400 · 401 · 403 · 404 |

La fila en negrita es la operación del flujo principal: la que diferencia el
proyecto de un CRUD.

---

## Decisiones de diseño

### Por qué `404` y no `403` cuando el recurso es de otro centro

`403` significa "existe y no podés". Esa primera mitad filtra información: quien
prueba ids al azar sabría cuáles son reales y podría estimar el volumen de
derivaciones de un hospital sin ver un solo dato clínico. `404` no distingue entre
"no existe" y "no es tuyo".

`403` se usa solo cuando el usuario **ya sabe** que el recurso existe porque tiene
acceso legítimo, y lo que le falta es el permiso para esa acción concreta. Ejemplo:
un `MEDICO_DERIVANTE` ve su propia solicitud pero no puede aprobarla.

### Qué campos acepta `POST /api/solicitudes`

Solo `pacienteDni`. De los seis campos del modelo:

| Campo | De dónde sale |
|---|---|
| `id` | Lo genera Prisma (`cuid()`) |
| `centroOrigenId` | **De la sesión**, nunca del body |
| `centroDestinoId` | Se asigna en la aprobación |
| `pacienteDni` | Del body |
| `estado` | Default `PENDIENTE` |
| `fechaSolicitud` | Default `now()` |

Aceptar `estado` del cliente permitiría crear una solicitud ya `APROBADA`,
salteándose la verificación de cama y la acción del profesional. Aceptar
`centroOrigenId` permitiría crear solicitudes a nombre de un hospital ajeno.

### Por qué el ranking de candidatos va anidado

El scoring depende del nivel de urgencia, del equipamiento requerido y del centro
de origen — los tres salen de la solicitud. Un endpoint independiente obligaría al
cliente a mandar esos criterios, y un cliente puede mentir: mandar `urgencia=BAJO`
para un paciente crítico devolvería hospitales que no corresponden.

### Por qué HU06 no tiene endpoint propio

HTTP es pedido/respuesta: el servidor no puede iniciar la conversación. "Recibir una
notificación" se implementa al revés — el cliente pregunta cada tanto (*polling*).
Y no hace falta un recurso nuevo, porque no existe ninguna tabla `Notificacion`: la
notificación **es** el listado de solicitudes donde el centro del usuario es destino.
Se resuelve con `GET /api/solicitudes?rol=destino&estado=APROBADA`.

### `PATCH` y no `PUT` para actualizar

`PUT` significa "este es el recurso completo, reemplazalo": obligaría al cliente a
mandar el objeto entero en cada cambio, y si dos personas editan a la vez la segunda
pisa los cambios de la primera con datos viejos. `PATCH` cambia solo los campos
enviados. En Zod se expresa con `.partial()`.

---

## Máquina de estados de una solicitud

```
PENDIENTE ──POST /evaluacion──> EVALUANDO ──POST /aprobacion──> APROBADA
    │                               │                               │
    │                               └──────> RECHAZADA              │
    │                                                               ▼
    └── PATCH permitido solo acá                                 EN_CURSO
                                                                    │
                                                                    ▼
                                                               FINALIZADA
```

`RECHAZADA` se alcanza con `POST /rechazo` desde `PENDIENTE`, `EVALUANDO` o
`APROBADA`. Las transiciones a `EN_CURSO` y `FINALIZADA` son parte del seguimiento
del traslado, que todavía no tiene endpoints: ver
[ADR 0002](./adr/0002-reglas-que-esperan-una-migracion.md).

La tabla de transiciones vive una sola vez, en `lib/reglas-solicitud.ts`. Los
handlers le preguntan; no tienen listas de estados propias.

---

## Códigos de estado usados

| Código | Cuándo |
|---|---|
| `200` | Lectura o modificación exitosa |
| `201` | Recurso creado — devuelve el objeto con su `id` |
| `400` | Body o query params que Zod rechaza |
| `401` | Sin sesión |
| `403` | Con sesión, sin permiso para esta acción |
| `404` | No existe, o pertenece a otro centro |
| `409` | Existe, pero su estado no admite la operación |

No se usa `200` con `{ ok: false }`. El status es parte de la respuesta.

---

## Los errores, en detalle

Cada fila sale de un *caso de error* de un criterio de aceptación de
[`spec.md`](./spec.md) o de una regla de negocio de su sección 6. La columna
**Capa** indica quién agarra el error, y responde una sola pregunta:
*¿alcanza con mirar el body para decidirlo?* Si sí, es Zod. Si hay que ir a
buscar el estado del sistema, es una regla.

| Operación | Situación | Status | Capa | Mensaje y dato |
|---|---|---|---|---|
| `POST /api/solicitudes` | Falta el DNI del paciente o tiene formato inválido | 400 | Zod | "Datos inválidos" + `detalles` |
| `POST /api/solicitudes/:id/evaluacion` | Falta un signo vital obligatorio (H1) | 400 | Zod | "Datos inválidos" + `detalles` |
| `POST /api/solicitudes/:id/evaluacion` | Presión, saturación o frecuencia fuera de rango fisiológico | 400 | Zod | "Datos inválidos" + `detalles` |
| `POST /api/solicitudes/:id/evaluacion` | La solicitud ya tiene evaluación (relación 1 a 1) | 409 | regla | "La solicitud ya fue evaluada" + `estadoActual` |
| `POST /api/solicitudes/:id/evaluacion` | La solicitud está `RECHAZADA` (no puede volver a `EVALUANDO`) | 409 | regla | "La solicitud no puede evaluarse en este estado" + `estadoActual` + `transicionesPosibles` |
| `POST /api/solicitudes/:id/evaluacion` | El médico corrige la urgencia sugerida por la IA sin dejar registro (spec §6) | — | postergada | Ver [ADR 0002](./adr/0002-reglas-que-esperan-una-migracion.md) |
| `PATCH /api/unidades/:id` | Camas negativas (H4) | 400 | Zod | "Datos inválidos" + `detalles` |
| `PATCH /api/solicitudes/:id` | La solicitud ya no está `PENDIENTE` | 409 | regla | "Solo se pueden corregir solicitudes pendientes" + `estadoActual` |
| `GET /api/solicitudes/:id/candidatos` | La solicitud todavía no tiene evaluación de triaje | 409 | regla | "Falta la evaluación de triaje" + `estadoActual` |
| `POST /api/solicitudes/:id/aprobacion` | La unidad requerida del destino está en 0 camas (H3) | 409 | regla | "Capacidad agotada: el centro de destino no tiene camas UTI disponibles" + `tipoRequerido` + `tiposConCamaLibre` |
| `POST /api/solicitudes/:id/aprobacion` | Otro médico tomó la última cama entre la verificación y la reserva (H3, "en el instante exacto") | 409 | regla + base | El mismo mensaje y datos que la fila anterior |
| `POST /api/solicitudes/:id/aprobacion` | El estado no admite la aprobación | 409 | regla | "La solicitud no puede aprobarse en este estado" + `estadoActual` + `transicionesPosibles` |
| `POST /api/solicitudes/:id/aprobacion` | Falta la evaluación de triaje (defensivo: `EVALUANDO` siempre la tiene) | 409 | regla | "Falta la evaluación de triaje" + `estadoActual` |
| `POST /api/solicitudes/:id/aprobacion` | El centro de destino es el mismo que el de origen | 409 | regla | "El centro de destino no puede ser el de origen" |
| `POST /api/solicitudes/:id/aprobacion` | El receptor intenta aprobar hacia un centro que no es el suyo | 403 | sesión | "Solo se puede aprobar una derivación hacia el propio centro" |
| `POST /api/solicitudes/:id/rechazo` | Lo intenta el `MEDICO_DERIVANTE` sobre una `APROBADA` (spec §6) | 403 | regla + sesión | "Una solicitud aprobada solo puede rechazarla el centro receptor" + `rolesHabilitados` |
| `POST /api/solicitudes/:id/rechazo` | La solicitud ya está `RECHAZADA`, `EN_CURSO` o `FINALIZADA` | 409 | regla | "La solicitud no puede rechazarse en este estado" + `estadoActual` + `transicionesPosibles` |
| `POST /api/solicitudes/:id/rechazo` | Otro usuario cambió el estado mientras se procesaba | 409 | regla + base | "La solicitud cambió de estado mientras se procesaba" |
| cualquier ruta con `:id` | El id no existe, o el recurso es de otro centro | 404 | consulta | "El recurso no existe" |
| todas | Sin sesión | 401 | sesión | "Falta autenticación" |
| todas | Con sesión pero rol incorrecto | 403 | sesión | detalle según la operación |
| todas | Error no previsto (base caída, bug) | 500 | `catch` del handler | "Error interno", sin detalles. El detalle va al log del servidor |

### Por qué 400 y no 422

En este proyecto **400 es todo lo que rechaza Zod y 409 todo lo que rechaza una
regla de negocio**. `422 Unprocessable Content` también sería válido para el
segundo grupo, pero mezclar los dos sin criterio escrito es lo que produce que
cada endpoint responda distinto. Si el equipo quiere cambiar a 422, va en un ADR.

### Por qué el 409 de capacidad enumera

El criterio de aceptación de H3 dice que ante "Capacidad agotada" se muestra una
alerta y se recarga el ranking. Para eso la pantalla necesita saber **qué
alternativas quedan**, no solo que falló. Por eso la respuesta lleva
`tiposConCamaLibre` como array y no dentro del texto del mensaje:

```json
{
  "error": "Capacidad agotada: el centro de destino no tiene camas UTI disponibles",
  "tipoRequerido": "UTI",
  "tiposConCamaLibre": ["UCO"]
}
```

El mismo razonamiento vale para `transicionesPosibles`: decir "no se puede" sin
decir qué sí se puede obliga al cliente a adivinar.

### Dónde vive cada regla

| Archivo | Qué decide |
|---|---|
| `lib/disponibilidad.ts` | Si hay cama del tipo requerido y qué alternativas quedan |
| `lib/reglas-solicitud.ts` | Qué transiciones de estado son válidas, qué impide aprobar, quién puede rechazar y si el rechazo devuelve cama |
| `lib/scoring-hospitales.ts` | Qué unidad requiere cada nivel de urgencia, el puntaje y el ranking (que filtra con `centrosElegibles`, la misma regla que usa la aprobación) |

Los tres son **funciones puras**: no importan Prisma ni Next, no leen la base y
no llaman a `new Date()`. Por eso se prueban con `npm test` en milisegundos, sin
levantar servidor ni base.

### Errores esperados e inesperados

Cada handler tiene **un solo `try/catch`, al final**, que llama a `errorInterno`:
loguea el detalle con `console.error` y responde `500` con "Error interno". Los
errores esperados (no existe, estado incompatible, sin cama) **se devuelven** como
valor —`null` o un objeto con el motivo— y el handler los traduce con un `if`.
Ningún `throw` propio vive adentro del `try`: si lo hubiera, un 409 saldría como
500.

La carrera por la última cama (H3) también es un error esperado:
`aprobarSolicitud` descuenta la cama solo si `camasDisponibles > 0` y devuelve
`null` si no pudo. No es una excepción.

### Qué solicitudes ve el médico receptor al aprobar

`obtenerSolicitudDelCentro` solo devuelve solicitudes donde el centro del usuario
ya es origen o destino. Pero una solicitud nueva no tiene destino hasta que alguien
la aprueba, así que con esa consulta **ningún receptor podía aprobar nada**: todas
daban 404.

La aprobación usa `obtenerSolicitudParaRecepcion`, que además deja ver las
solicitudes **sin destino asignado**: son las que un receptor puede aceptar. Una
solicitud ya asignada a otro centro sigue dando 404. El resto de los endpoints
mantiene el criterio estricto.
