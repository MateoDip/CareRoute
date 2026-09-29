# Contrato de la API — CareRoute

Todos los endpoints viven bajo `/api` y devuelven JSON.

**Roles** (enum `RolUsuario` de `prisma/schema.prisma`): `ADMIN`, `MEDICO_DERIVANTE`, `MEDICO_RECEPTOR`.

**Autenticación:** Supabase Auth con Google (ADR 0005 y 0006). La sesión viaja en la
cookie `sb-<proyecto>-auth-token`. El rol y el centro **no** vienen en el token ni en el
request: se leen de la tabla `Usuario` en cada request (`lib/auth.ts`). El único
endpoint público es `GET /auth/callback`, que es el que crea la sesión.

---

## Endpoints

| Método | Ruta | Descripción | HU | Rol | Errores |
|---|---|---|---|---|---|
| GET | `/api/solicitudes` | Solicitudes del centro del usuario. Filtros: `?rol=origen\|destino`, `?estado=` | HU06, HU07 | Médico (derivante o receptor) con centro | 400 filtro · 401 · 403 |
| POST | `/api/solicitudes` | Registra una solicitud. El centro de origen sale de la sesión | HU01 | MEDICO_DERIVANTE | 400 · 401 · 403 |
| GET | `/api/solicitudes/:id` | Ficha con triaje y tripulaciones asignadas | HU07 | Médico del centro de origen o destino | 401 · 403 · 404 |
| PATCH | `/api/solicitudes/:id` | Corrige el DNI, solo mientras esté `PENDIENTE` | HU01 | MEDICO_DERIVANTE del origen | 400 · 401 · 403 · 404 · 409 |
| POST | `/api/solicitudes/:id/evaluacion` | Registra el triaje. Sin `nivelUrgenciaSugerido` lo sugiere la IA (OpenAI); con él, es ingreso manual | HU02 | MEDICO_DERIVANTE del origen | 400 · 401 · 403 · 404 · 409 · 502 |
| GET | `/api/solicitudes/:id/candidatos` | Ranking de centros candidatos | HU03 | Médico del origen o destino | 401 · 403 · 404 · 409 sin triaje |
| POST | `/api/solicitudes/:id/destino` | El derivante elige del ranking el centro de destino | HU04 | MEDICO_DERIVANTE del origen | 400 · 401 · 403 · 404 · 409 estado, mismo centro o sin cama |
| **POST** | **`/api/solicitudes/:id/aprobacion`** | **El receptor confirma: reserva la cama, pasa a `APROBADA` y registra fecha y hora** | **HU04** | **MEDICO_RECEPTOR del destino** | **401 · 403 · 404 · 409 estado o sin cama** |
| POST | `/api/solicitudes/:id/rechazo` | Cancela la derivación. Si estaba `APROBADA`, devuelve la cama | spec §6 | Derivante (origen) o receptor (destino); una `APROBADA`, solo el receptor | 401 · 403 · 404 · 409 |
| GET | `/api/solicitudes/:id/bitacora` | Historial de eventos del traslado | HU07 | Médico del origen o destino | 401 · 403 · 404 |
| GET | `/api/centros` | Catálogo de centros con unidades y recursos | HU05 | Cualquier usuario logueado | 401 |
| POST | `/api/centros` | Alta de un centro | spec §2 | ADMIN | 400 · 401 · 403 |
| GET | `/api/centros/:id` | Ficha de un centro | spec §2 | Cualquier usuario logueado | 401 · 404 |
| PATCH | `/api/centros/:id` | Edita nombre, complejidad o ubicación | spec §2 | ADMIN | 400 · 401 · 403 · 404 |
| DELETE | `/api/centros/:id` | Baja de un centro (unidades y recursos en cascada) | spec §3 | ADMIN | 401 · 403 · 404 · 409 con usuarios o derivaciones |
| PATCH | `/api/unidades/:id` | Actualiza las camas disponibles | HU05 | MEDICO_RECEPTOR de ese centro, o ADMIN | 400 · 401 · 403 · 404 |
| GET | `/api/usuarios` | Usuarios con su rol y centro | spec §2 | ADMIN | 401 · 403 |
| PATCH | `/api/usuarios/:id` | Asigna rol y centro | spec §2 | ADMIN | 400 · 401 · 403 · 404 · 409 |
| GET | `/auth/callback` | Vuelta del login con Google. **Público a propósito** | — | Sin sesión | — |

La fila en negrita es la operación del flujo principal: la que diferencia el proyecto de
un CRUD. **CRUD completo:** `CentroSalud` (GET/POST `/api/centros`, GET/PATCH/DELETE
`/api/centros/:id`).

---

## Matriz de permisos

Cada celda es código: `requerirUsuario(...)` / `requerirUsuarioConCentro(...)` en la
primera línea del handler (rol → 401/403) y el centro de la sesión en el `where` de
`lib/db/` (pertenencia → 404).

| Operación | Admin | Médico derivante | Médico receptor | Sin sesión |
|---|---|---|---|---|
| `GET /api/solicitudes` | ✗ 403 (sin centro) | ✓ las de su centro | ✓ las de su centro | 401 |
| `POST /api/solicitudes` | ✗ 403 | ✓ desde su centro | ✗ 403 | 401 |
| `GET /api/solicitudes/:id` (+ `/candidatos`, `/bitacora`) | ✗ 403 | ✓ si su centro es origen o destino, si no 404 | ✓ ídem | 401 |
| `PATCH /api/solicitudes/:id` | ✗ 403 | ✓ solo origen, si no 404 | ✗ 403 | 401 |
| `POST /api/solicitudes/:id/evaluacion` | ✗ 403 | ✓ solo origen, si no 404 | ✗ 403 | 401 |
| `POST /api/solicitudes/:id/destino` | ✗ 403 | ✓ solo origen, si no 404 | ✗ 403 | 401 |
| `POST /api/solicitudes/:id/aprobacion` | ✗ 403 | ✗ 403 | ✓ solo destino, si no 404 | 401 |
| `POST /api/solicitudes/:id/rechazo` | ✗ 403 | ✓ desde el origen, salvo `APROBADA` (403) | ✓ desde el destino | 401 |
| `GET /api/centros`, `GET /api/centros/:id` | ✓ | ✓ | ✓ | 401 |
| `POST/PATCH/DELETE /api/centros…` | ✓ | ✗ 403 | ✗ 403 | 401 |
| `PATCH /api/unidades/:id` | ✓ cualquier centro | ✗ 403 | ✓ solo su centro, si no 404 | 401 |
| `GET /api/usuarios`, `PATCH /api/usuarios/:id` | ✓ | ✗ 403 | ✗ 403 | 401 |
| `GET /auth/callback` | ✓ | ✓ | ✓ | ✓ público |

Un usuario que acaba de entrar con Google es `MEDICO_DERIVANTE` **sin centro**: todo el
flujo clínico le responde 403 "Tu usuario todavía no tiene un centro de salud asignado"
hasta que un admin se lo asigne con `PATCH /api/usuarios/:id`.

---

## Decisiones de diseño

### El orden de las preguntas en cada handler

1. ¿Hay sesión? → no: **401** (`requerirUsuario` lanza `NoAutenticado`)
2. ¿El rol alcanza? ¿Tiene centro? → no: **403** (`NoAutorizado`, `SinCentroAsignado`)
3. ¿El dato es suyo? → no: **404** (el `where` de `lib/db/` lleva el centro de la sesión)
4. ¿El body está bien? → no: **400** (Zod)
5. ¿La regla de negocio lo deja? → no: **409** (función pura de `lib/`)
6. ¿El servicio externo respondió? → no: **502** (solo `/evaluacion`, clase 7)
7. Recién ahí se escribe, con `lib/db/`.

Las excepciones de 1 y 2 las traduce `responderError` (`lib/errores.ts`) en el único
`catch` del handler; todo lo demás se devuelve como valor y se traduce con un `if`.

### Por qué `404` y no `403` cuando el recurso es de otro centro

`403` significa "existe y no podés". Esa primera mitad filtra información: quien prueba
ids al azar sabría cuáles son reales y podría estimar el volumen de derivaciones de un
hospital sin ver un solo dato clínico. `404` no distingue entre "no existe" y "no es tuyo".

`403` se usa cuando lo que falta es el **rol** (se sabe sin mirar el dato) o cuando una
regla de dominio le niega la acción a un rol sobre un dato que ya es suyo: el derivante
que intenta rechazar su propia solicitud `APROBADA` (spec §6).

### Quién elige el destino y quién aprueba (ADR 0008)

El derivante elige el destino desde el ranking (`POST /destino`); el receptor de ese
centro lo ve en `GET /api/solicitudes?rol=destino&estado=EVALUANDO` y aprueba
(`POST /aprobacion`). Así cada receptor solo ve las derivaciones que le propusieron: nadie
ve las solicitudes de pacientes de otros hospitales "por si acaso".

### Qué campos acepta `POST /api/solicitudes`

Solo `pacienteDni`. El resto:

| Campo | De dónde sale |
|---|---|
| `id` | Lo genera Prisma (`cuid()`) |
| `centroOrigenId` | **De la sesión**, nunca del body |
| `centroDestinoId` | Lo elige el derivante en `POST /destino` |
| `estado` | Default `PENDIENTE` |
| `fechaSolicitud` | Default `now()` |
| `fechaAprobacion` | La pone la aprobación |

Aceptar `estado` del cliente permitiría crear una solicitud ya `APROBADA`. Aceptar
`centroOrigenId` permitiría crear solicitudes a nombre de un hospital ajeno. Zod descarta
los campos que no están en el schema.

### Por qué el ranking de candidatos va anidado

El scoring depende del nivel de urgencia y del centro de origen, y los dos salen de la
solicitud. Un endpoint independiente obligaría al cliente a mandarlos, y un cliente puede
mentir: `urgencia=BAJO` para un paciente crítico devolvería hospitales que no corresponden.

### Por qué HU06 no tiene endpoint propio

HTTP es pedido/respuesta: el servidor no puede iniciar la conversación. La notificación
**es** el listado de solicitudes donde el centro del usuario es destino:
`?rol=destino&estado=EVALUANDO` (me propusieron, tengo que responder) y
`?rol=destino&estado=APROBADA` (tengo que preparar la cama). El aviso por WhatsApp es el
servicio accesorio pendiente de la spec §8.2.

### `PATCH` y no `PUT` para actualizar

`PUT` significa "este es el recurso completo, reemplazalo": si dos personas editan a la
vez, la segunda pisa los cambios de la primera. `PATCH` cambia solo los campos enviados.
En Zod se expresa con `.partial()`.

---

## Máquina de estados de una solicitud

```
PENDIENTE ──POST /evaluacion──> EVALUANDO ──POST /aprobacion──> APROBADA
    │                            │  ▲   │                           │
    │                            │  └───┘ POST /destino             │
    │                            │   (elige o cambia destino)       ▼
    └── PATCH solo acá           └──────> RECHAZADA              EN_CURSO
                                                                    │
                                                                    ▼
                                                               FINALIZADA
```

`RECHAZADA` se alcanza con `POST /rechazo` desde `PENDIENTE`, `EVALUANDO` o `APROBADA`.
Las transiciones a `EN_CURSO` y `FINALIZADA` son parte del seguimiento del traslado, que
todavía no tiene endpoints: ver [ADR 0002](./adr/0002-reglas-que-esperan-una-migracion.md).

La tabla de transiciones vive una sola vez, en `lib/reglas-solicitud.ts`. Los handlers le
preguntan; no tienen listas de estados propias.

---

## Códigos de estado usados

| Código | Cuándo |
|---|---|
| `200` | Lectura o modificación exitosa |
| `201` | Recurso creado (o aprobación registrada) — devuelve el objeto |
| `204` | Borrado exitoso, sin body |
| `400` | Body o query params que Zod rechaza |
| `401` | Sin sesión |
| `403` | Con sesión, sin el rol, sin centro asignado, o una regla de dominio niega la acción a ese rol |
| `404` | No existe, o pertenece a otro centro |
| `409` | Existe, pero su estado no admite la operación |
| `502` | Un servicio externo del que depende la operación no respondió (clase 7). No es un bug nuestro (500) ni un problema del estado (409): reintentar o seguir por el camino manual lo resuelve |

No se usa `200` con `{ ok: false }`. El status es parte de la respuesta. Todo error tiene
la forma `{ "error": "<mensaje para la persona>", ...datos }`.

---

## Los errores, en detalle

Cada fila sale de un *caso de error* de un criterio de aceptación de
[`spec.md`](./spec.md) o de una regla de negocio de su sección 6. La columna **Capa**
indica quién agarra el error. Cada fila tiene su request en `docs/api.http`.

| Operación | Situación | Status | Capa | Mensaje y dato |
|---|---|---|---|---|
| `POST /api/solicitudes` | Falta el DNI o tiene formato inválido (HU01) | 400 | Zod | "Datos inválidos" + `detalles` |
| `PATCH /api/solicitudes/:id` | La solicitud ya no está `PENDIENTE` | 409 | regla | "Solo se pueden corregir solicitudes pendientes" + `estadoActual` |
| `POST /api/solicitudes/:id/evaluacion` | Falta un signo vital obligatorio (HU01) | 400 | Zod | "Datos inválidos" + `detalles` |
| `POST /api/solicitudes/:id/evaluacion` | Presión o frecuencia fuera de rango fisiológico | 400 | Zod | "Datos inválidos" + `detalles` |
| `POST /api/solicitudes/:id/evaluacion` | La solicitud ya tiene evaluación (relación 1 a 1) | 409 | regla | "La solicitud ya fue evaluada" + `estadoActual` |
| `POST /api/solicitudes/:id/evaluacion` | La solicitud está `RECHAZADA` | 409 | regla | "La solicitud no puede evaluarse en este estado" + `estadoActual` + `transicionesPosibles` |
| `POST /api/solicitudes/:id/evaluacion` | Sin nivel manual, y OpenAI falla, tarda más de 8 s o la credencial es inválida (HU02, spec §8) | 502 | servicio externo | "No pudimos obtener la sugerencia de urgencia: el servicio de IA no respondió. Elegí el nivel manualmente y volvé a enviar la evaluación." + `ingresoManualRequerido` + `nivelesPosibles` |
| `POST /api/solicitudes/:id/evaluacion` | El médico corrige después la urgencia que sugirió la IA (spec §6, regla 2) | — | postergada | Se guarda `origenNivel` (IA o MANUAL); la corrección posterior espera endpoint: ver ADR 0002 |
| `GET /api/solicitudes/:id/candidatos` | La solicitud todavía no tiene triaje | 409 | regla | "Falta la evaluación de triaje" + `estadoActual` |
| `POST /api/solicitudes/:id/destino` | El destino no tiene camas del tipo requerido (HU04) | 409 | regla | "Capacidad agotada: el centro de destino no tiene camas UTI disponibles" + `tipoRequerido` + `tiposConCamaLibre` |
| `POST /api/solicitudes/:id/destino` | El destino es el mismo centro de origen | 409 | regla | "El centro de destino no puede ser el de origen" |
| `POST /api/solicitudes/:id/destino` | La solicitud no está `EVALUANDO` (sin triaje, o ya aprobada) | 409 | regla | "Solo se puede elegir destino con el triaje hecho y antes de la aprobación" + `estadoActual` + `transicionesPosibles` |
| `POST /api/solicitudes/:id/destino` | El centro de destino no existe | 404 | consulta | "El centro de destino no existe" |
| `POST /api/solicitudes/:id/aprobacion` | El destino se quedó sin camas del tipo requerido (HU04) | 409 | regla | "Capacidad agotada…" + `tipoRequerido` + `tiposConCamaLibre` |
| `POST /api/solicitudes/:id/aprobacion` | Otro médico tomó la última cama entre la verificación y la reserva (HU04, "en el instante exacto") | 409 | regla + base | El mismo mensaje y datos que la fila anterior |
| `POST /api/solicitudes/:id/aprobacion` | El estado no admite la aprobación (ya aprobada, rechazada) | 409 | regla | "La solicitud no puede aprobarse en este estado" + `estadoActual` + `transicionesPosibles` |
| `POST /api/solicitudes/:id/rechazo` | Lo intenta el derivante sobre una `APROBADA` (spec §6) | 403 | regla | "Una solicitud aprobada solo puede rechazarla el centro receptor" + `rolesHabilitados` |
| `POST /api/solicitudes/:id/rechazo` | La solicitud ya está `RECHAZADA`, `EN_CURSO` o `FINALIZADA` | 409 | regla | "La solicitud no puede rechazarse en este estado" + `estadoActual` + `transicionesPosibles` |
| cualquier escritura condicional | Otro usuario cambió el estado mientras se procesaba | 409 | base | "La solicitud cambió de estado mientras se procesaba" |
| `PATCH /api/unidades/:id` | Camas negativas (HU05) | 400 | Zod | "Datos inválidos" + `detalles` |
| `DELETE /api/centros/:id` | El centro tiene usuarios o derivaciones (spec §3, `Restrict`) | 409 | regla | "No se puede dar de baja un centro con usuarios o derivaciones…" + `dependencias` |
| `PATCH /api/usuarios/:id` | Un admin intenta quitarse el rol de admin a sí mismo | 409 | regla | "No podés quitarte el rol de administrador a vos mismo…" |
| `PATCH /api/usuarios/:id` | El centro a asignar no existe | 404 | consulta | "El centro de salud no existe" |
| cualquier ruta con `:id` | El id no existe, o el recurso es de otro centro | 404 | consulta | "La solicitud no existe" / "La unidad no existe"… |
| todas (salvo `/auth/callback`) | Sin sesión | 401 | sesión | "Falta autenticación. Iniciá sesión y volvé a intentar." |
| todas las del flujo clínico | Usuario sin centro asignado | 403 | sesión | "Tu usuario todavía no tiene un centro de salud asignado. Pedíselo a un administrador." |
| todas | Con sesión pero rol incorrecto | 403 | sesión | "No podés realizar esta operación con tu rol" + `rolesHabilitados` |
| todas | Error no previsto (base caída, bug) | 500 | `responderError` | "Error interno", sin detalles. El detalle va al log del servidor |

### Por qué 400 y no 422

En este proyecto **400 es todo lo que rechaza Zod y 409 todo lo que rechaza una regla de
negocio**. `422` también sería válido para el segundo grupo, pero mezclar los dos sin
criterio escrito es lo que produce que cada endpoint responda distinto.

### Por qué el 409 de capacidad enumera

El criterio de aceptación de HU04 dice que ante "Capacidad agotada" se muestra una alerta y
se recarga el ranking. Para eso la pantalla necesita saber **qué alternativas quedan**:

```json
{
  "error": "Capacidad agotada: el centro de destino no tiene camas UTI disponibles",
  "tipoRequerido": "UTI",
  "tiposConCamaLibre": ["UCO"]
}
```

Lo mismo con `transicionesPosibles`: decir "no se puede" sin decir qué sí se puede obliga
al cliente a adivinar.

### Dónde vive cada cosa

| Archivo | Qué decide |
|---|---|
| `lib/auth.ts` | Quién hace el request (`obtenerUsuario`, `requerirUsuario`, `requerirUsuarioConCentro`) y las excepciones `NoAutenticado`, `NoAutorizado`, `SinCentroAsignado` |
| `lib/errores.ts` | `responderError`: traduce esas excepciones a 401/403 y todo lo demás a 500 |
| `lib/http.ts` | Las respuestas 400, 403 de regla, 404, 409 y 502 con forma uniforme |
| `lib/db/*.ts` | Las consultas. La pertenencia va en el `where`; ninguna otra carpeta importa Prisma |
| `lib/disponibilidad.ts` | Si hay cama del tipo requerido y qué alternativas quedan |
| `lib/reglas-solicitud.ts` | Transiciones de estado, qué impide elegir destino o aprobar, quién rechaza y desde qué lado, si el rechazo devuelve cama |
| `lib/reglas-admin.ts` | Si se puede borrar un centro y si un admin puede cambiar a un usuario |
| `lib/scoring-hospitales.ts` | Qué unidad requiere cada urgencia, el puntaje y el ranking |
| `lib/servicios/openai.ts` | El único contacto con OpenAI (clase 7) |

Las reglas son **funciones puras**: no importan Prisma ni Next, no leen la base y no
llaman a `new Date()`. Se prueban con `npm test` en milisegundos.

### Servicios externos (clase 7)

`lib/servicios/` es el único lugar del proyecto que habla con terceros. Cada módulo tiene
timeout (`AbortSignal.timeout`), nunca lanza —devuelve `null`— y loguea la falla. El
handler decide qué significa ese `null`:

| Módulo | Operación | Esencial o accesoria | Si devuelve `null` |
|---|---|---|---|
| `lib/servicios/openai.ts` | `POST /api/solicitudes/:id/evaluacion` sin nivel manual | Esencial: se llama **antes** de guardar | `502` con `ingresoManualRequerido`; no se guarda nada |

Supabase Auth también es un tercero: su cliente de servidor (`lib/supabase-server.ts`)
tiene timeout de 5 s. Qué pasa en cada falla y qué ve el usuario está en `docs/spec.md` §8.

### Errores esperados e inesperados

Cada handler tiene **un solo `try/catch`**. La primera línea del `try` es
`requerirUsuario(...)`, que lanza si no hay sesión o no alcanza el rol; el `catch` llama a
`responderError`, que traduce esas dos a 401/403 y cualquier otra cosa a 500 con el
detalle en el log. Los errores esperados del dominio (no existe, estado incompatible, sin
cama) **se devuelven** como valor —`null` o un objeto con el motivo— y el handler los
traduce con un `if`.

Las carreras también son errores esperados. Las escrituras que dependen del estado usan
`updateMany` con el estado esperado en el `where`: si otro usuario cambió la solicitud en
el medio, no se toca nada y se responde 409. La aprobación hace el cambio de estado y el
descuento de cama en una transacción: si la cama se ocupó en el medio, se deshace todo.
