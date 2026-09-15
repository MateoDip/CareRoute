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

Las transiciones `EN_CURSO` y `FINALIZADA` son de la clase 5 (seguimiento del
traslado). Están marcadas con `TODO (clase 5)`.

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
