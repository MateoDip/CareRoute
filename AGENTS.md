# AGENTS.md

Reglas obligatorias para cualquier asistente de IA (Claude Code, Cursor, Copilot, Codex u otro)
que genere o modifique código en este repositorio.

Estas reglas también aplican a las personas: si un humano escribe el código a mano, el estándar
es el mismo. El revisor del Pull Request las hace cumplir.

---

## 1. Contexto del proyecto

CareRoute coordina derivaciones de pacientes críticos entre hospitales. Un módulo de IA sugiere
un nivel de urgencia y un algoritmo de scoring ordena hospitales candidatos.

**Regla de dominio innegociable:** la IA nunca decide sola. Ninguna derivación puede crearse,
cambiar de hospital de destino o cerrarse sin una acción explícita de un profesional. Si una
tarea pide automatizar esa confirmación, no la implementes: dejá el paso manual y avisá en el PR.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL en Supabase + Supabase Auth (Google) + Zod + Vitest + Playwright. IA: OpenAI.

## 2. Reglas duras

### 2.1 Prohibido `any`

- No se permite `any` en ninguna forma: anotación explícita, `as any`, `@ts-ignore`,
  `@ts-expect-error` sin justificación, ni `eslint-disable` de la regla que lo detecta.
- `tsconfig.json` va con `"strict": true`. No se relaja.
- Si el tipo es realmente desconocido, usá `unknown` y estrechalo con Zod o con un type guard.
- Para datos externos (respuesta de la IA, body de un request, filas de Supabase) el tipo se
  deriva del schema: `type Paciente = z.infer<typeof PacienteSchema>`.

```ts
// ❌ NO
const data = (await res.json()) as any;

// ✅ SÍ
const data = TriajeResponseSchema.parse(await res.json());
```

### 2.2 Zod es la única librería de validación

- Toda entrada externa se valida con Zod antes de usarse: formularios, route handlers y server
  actions, respuestas del modelo de lenguaje, variables de entorno, query params.
- Prohibido Yup, Joi, class-validator, `io-ts`, validaciones a mano con `if (!x) throw`, o
  confiar en que el input "ya viene bien" desde el frontend. La validación del cliente no
  reemplaza a la del servidor: se valida en ambos lados.
- Los schemas viven en `lib/schemas/` y se exportan con el sufijo `Schema`
  (`crearSolicitudSchema`). El tipo se deriva: `type CrearSolicitud = z.infer<...>`.
- Los ids son `cuid()`: se validan con `idSchema` (`lib/schemas/comun.ts`), nunca con `.uuid()`.
- Los valores de los enums van en MAYÚSCULAS, igual que en `prisma/schema.prisma`.
- En rutas usá `safeParse` y devolvé 400 con `errorValidacion` (`lib/http.ts`).
- Zod no consulta la base ni tiene reglas que dependan del estado: eso es un 409 y va en
  una función pura de `lib/`.

```ts
// lib/schemas/evaluacion-triaje.ts
export const nivelUrgenciaSchema = z.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]);

export const signosVitalesSchema = z.object({
  frecuenciaCardiaca: z.number().int().min(20).max(250),
  presionSistolica: z.number().int().min(40).max(300),
  presionDiastolica: z.number().int().min(20).max(200),
});

export type SignosVitales = z.infer<typeof signosVitalesSchema>;
```

### 2.3 Datos sensibles

- No se loguean síntomas, signos vitales, nombre ni ningún dato identificable del paciente.
  Para depurar, logueá el `id` de la derivación y nada más.
- No se hardcodean claves, URLs de conexión, tokens ni mails personales. Todo va por variables
  de entorno (el seed lee los mails de prueba de `SEED_EMAIL_*`).
- `SUPABASE_SERVICE_ROLE_KEY` y cualquier clave de IA se usan **solo en código de servidor**.
  Nunca en un componente cliente ni en una variable con prefijo `NEXT_PUBLIC_`.
- No se suben datos reales de pacientes al repositorio. Los seeds usan datos ficticios.

### 2.4 Base de datos

- Prisma es el único acceso a la base, y **solo** desde `lib/db/`. Cero `prisma.` en `app/`.
- Los cambios de esquema van como migraciones versionadas en `prisma/migrations/`. No se
  modifica el esquema desde el panel de Supabase. Una migración aplicada no se edita: se
  escribe una nueva. Las genera y aplica una sola persona.
- Row Level Security activado en **todas** las tablas, sin políticas (ADR 0007): la API
  REST de Supabase no ve nada. Tabla nueva ⇒ `ENABLE ROW LEVEL SECURITY` en la misma
  migración.
- Toda consulta que devuelve datos de un centro lleva el centro de la sesión en el `where`.
  Nada de "traer y después comparar en el handler".
- No se borran filas de `SolicitudTraslado` ni de `RegistroBitacora`: el historial es parte
  de la trazabilidad. Rechazar es un cambio de estado.
- Toda regla de "uno solo", "una sola vez" o "no más de N" la cumple **la base** (clase 14):
  un `@@unique` o una condición dentro del `updateMany`, nunca un `if` que pregunta y después
  guarda. El P2002 de Prisma se captura en `lib/db/` y sale como 409 con el mismo mensaje
  que el caso de la regla: nunca como 500. Un `setTimeout` o un `if` más no arreglan una
  carrera.
- Regla 6 (una derivación abierta por paciente y centro): `pacienteDniActivo` lleva el DNI
  mientras la solicitud está abierta y `null` cuando se cierra. Lo escribe solo
  `lib/db/solicitudes.ts`. Una transición nueva a `RECHAZADA` o `FINALIZADA` lo pone en `null`
  en el mismo `updateMany`.

### 2.5 Autorización

- La identidad sale solo de `requerirUsuario` / `requerirUsuarioConCentro` (`lib/auth.ts`),
  primera línea del `try` de cada handler. Un endpoint sin esa llamada tiene que decir en
  un comentario "es público a propósito".
- Nunca `rol`, `usuarioId` ni `centroSaludId` del body, headers o query (la única excepción
  es `PATCH /api/usuarios/:id`, donde un ADMIN asigna rol y centro a otro usuario).
- El `catch` de cada handler es `return responderError("VERBO /ruta", error)`.
- Orden: sesión (401) → rol / centro (403) → body (400) → caso de uso de `lib/casos/`:
  pertenencia (404) → regla (409, o 403 de regla) → servicio externo (502) → escribir.
- En las páginas y Server Actions, la primera línea es `requerirMedicoEnPagina(rol?)`: la misma
  autorización que los handlers, traducida a navegación (sin sesión → `/ingresar`; sin centro o
  sin rol clínico → `/sin-acceso`; otro rol que el pedido → 404). La pertenencia va en la consulta
  de `lib/db/` y, si devuelve null, `notFound()`: "no existe" y "no es de tu centro" se ven igual.

### 2.5.1 Casos de uso (clase 12)

- Toda operación que escribe tiene su caso en `lib/casos/<verbo>-<cosa>.ts`. Sin HTTP ni
  formularios: recibe el usuario de la sesión y datos ya validados, y devuelve un `Resultado`.
- Las reglas se escriben **una sola vez**, en el caso. El Route Handler y la Server Action lo
  llaman; ninguno de los dos repite un `if` de regla.
- Un caso no lanza por una regla: devuelve `rechazo(motivo, mensaje, datos)` con un motivo de
  `MotivoDeRechazo`. Un motivo nuevo obliga a sumarlo en `STATUS_POR_MOTIVO` (`lib/http.ts`).

### 2.5.2 Server Actions y formularios (clase 12)

- La acción vive en `acciones.ts` ("use server") junto a su `page.tsx`; el formulario en
  `formulario.tsx` ("use client").
- Primera línea: `requerirMedicoEnPagina("ROL")`. Después, el schema de Zod existente con
  `mensajesEnCastellano` y el caso de uso.
- El id de la URL llega con `.bind(null, id)`: nunca en un `<input type="hidden">`. Los ids de
  la sesión (usuario, centro) nunca viajan en el formulario.
- Al terminar bien: `revalidatePath` de la ficha y de `/`, y `redirect` a la ficha como última
  línea. Al fallar: `estadoDeValidacion` (debajo de cada campo) o `estadoDeRechazo` (arriba).
- El formulario usa `useActionState(accion, SIN_ENVIAR)`, sin `useState` por campo ni `fetch`;
  cada campo va en `<Campo>` y muestra `defaultValue={estado.valores?.campo}` para no vaciarse.
- El botón se deshabilita mientras `pendiente` y cambia el texto ("Guardando…").
- Mobile-first: botones apilados y a lo ancho; `sm:` en fila. `<select>` nativo; `inputMode` para
  números, no `type="number"` para valores que no son cantidades (DNI).

### 2.6 Servicios externos

- Todo tercero se llama desde `lib/servicios/<nombre>.ts` y solo desde ahí.
- Siempre con `AbortSignal.timeout`. Ante una falla, devuelve `null` y loguea; no lanza.
- La credencial se lee con `process.env` en ese archivo, nunca con prefijo `NEXT_PUBLIC_`.

## 3. Convenciones de código

- Nombres de dominio en español y en camelCase (`solicitudTraslado`, `nivelUrgencia`); palabras
  clave y APIs del framework en inglés, como corresponde.
- Componentes de React en `PascalCase`, hooks en `useCamelCase`, archivos en `kebab-case`.
- Server Components por defecto; `"use client"` solo cuando hace falta estado o eventos, y en el
  componente más chico posible, nunca en una página entera.
- Las páginas leen con `await` a `lib/db/`; nunca `fetch` a la propia API ni `useEffect` + `fetch`.
- Las props de un componente de cliente son serializables: las fechas viajan formateadas como
  texto con `formatearFechaHora` (`lib/formato.ts`), que fija la hora argentina.
- Sin `console.log` en el código que se mergea.

### 3.1 Sistema visual (clase 10)

- Prohibido el CSS suelto: ni `.module.css` ni `style={...}` inline. Los colores, radios y
  tipografía son tokens de `app/globals.css`; se usan como clases (`bg-primary`,
  `text-muted-foreground`), nunca colores sueltos (`bg-blue-700`, `#fff`).
- Los cuatro colores del triaje (`triaje-rojo`, `-naranja`, `-amarillo`, `-verde`) se usan
  **solo** para el nivel de urgencia. Los estados de una solicitud usan la tinta petróleo
  (`primary`) y el rojo de error (`destructive`). Qué color lleva cada nivel y cada estado
  se decide en `components/estado-solicitud.tsx`, no en cada pantalla.
- La tipografía es Atkinson Hyperlegible Next, en `app/fuentes/` (next/font/local): no se
  agrega otra ni se pide a Google Fonts.
- En `app/` no se escriben bordes ni radios a mano: se usan `Card`, `Button`, `Badge`, etc.
- `components/ui/` son los componentes base de shadcn/ui, copiados al repo y propios. **No importan
  nada del dominio.** La traducción del dominio (qué badge lleva cada estado) vive en
  `components/estado-solicitud.tsx`.
- Para un link con forma de botón: `<Link className={buttonVariants({ variant: "outline" })}>`.
- Todo componente o variante nueva se agrega también a la galería `/sistema`.
- Cada pantalla resuelve sus cinco estados: cargando (`loading.tsx`), con datos (`page.tsx`), vacío
  (`SinDatos`, desde el servidor), sin resultados (el filtro, en el cliente) y error (`error.tsx`).
  Vacío y sin resultados tienen textos distintos. No hay try/catch por página.
- `error.tsx` no muestra el mensaje de la excepción: lo registra con `console.error`.
- Si se cambia un color, `npm run contraste` recalcula la tabla de `docs/spec.md` §7 (y falla
  si algún par no llega al mínimo): se pega la tabla nueva en la spec.
- Antes de instalar una dependencia nueva, preguntá. No agregues librerías por conveniencia.
- No reformatees archivos que no tocaste ni hagas refactors masivos no pedidos.

## 4. Estructura

```
app/
  globals.css                      tokens del sistema visual
  acciones-sesion.ts               Server Actions entrar / salir (las usan los dos grupos)
  not-found.tsx                    404 de direcciones inexistentes
  (app)/                           con sesión de médico con centro (el paréntesis no va en la URL)
    layout.tsx                     barra de navegación; sin sesión → /ingresar
    page.tsx, loading.tsx          listado de solicitudes (/, /?rol=destino)
    error.tsx, not-found.tsx       error y 404 de las pantallas con sesión
    solicitudes/nueva/             iniciar una solicitud: page + acciones + formulario (HU01)
    solicitudes/[id]/              ficha (page + loading) + acciones aprobar / rechazar
    solicitudes/[id]/triaje/       triaje con la IA o nivel a mano (HU02)
    solicitudes/[id]/destino/      ranking y elección del destino (HU03, HU04)
    sistema/page.tsx               galería del sistema visual
  (public)/                        sin sesión requerida; layout solo con encabezado
    ingresar/page.tsx              login con Google
    sin-acceso/page.tsx            cuenta sin centro o sin rol clínico
  api/<recurso>/route.ts           colección
  api/<recurso>/[id]/route.ts      individual
  api/<recurso>/[id]/<operación>/  operaciones del flujo (destino, aprobacion, rechazo…)
  auth/callback/route.ts           login con Google (público)
components/
  ui/                              base de shadcn/ui: Button, Card, Badge, Input, NativeSelect,
                                   Skeleton, Alert (no importan el dominio)
  navegacion.tsx, sin-datos.tsx, estado-solicitud.tsx   componentes de dominio
  campo.tsx                        etiqueta + control + ayuda + error conectados (useId)
  formulario.tsx                   error arriba del formulario y botones Guardar / Cancelar
  boton-accion.tsx                 operación sin campos (aprobar, rechazar), con confirmación
  filtro-solicitudes.tsx           filtro del listado (de cliente)
lib/
  utils.ts                         cn(): une clases de Tailwind
  auth.ts                          sesión, rol y centro (handlers, páginas y acciones)
  casos/                           casos de uso: reglas una sola vez, para API y pantallas
  formularios.ts                   EstadoFormulario, SIN_ENVIAR y ayudas para FormData
  proximo-paso.ts                  qué botones ve cada médico en la ficha (+ .test.ts)
  errores.ts                       responderError
  http.ts                          respuestas 400 / 403 de regla / 404 / 409 / 502
  db/                              consultas Prisma
  schemas/                         schemas de Zod (fuente de verdad de los tipos)
  servicios/                       servicios externos
  formato.ts                       fechas en hora argentina y etiquetas para pantalla
  supabase-server.ts               cliente de Supabase Auth (solo servidor)
  reglas-*.ts, disponibilidad.ts, scoring-hospitales.ts   reglas puras (+ .test.ts)
prisma/
  schema.prisma, migrations/, seed.ts
e2e/                               pruebas de punta a punta (Playwright, §7)
  flujo-principal.spec.ts          el flujo de la spec §5, de una persona a otra
  permisos.spec.ts                 una prueba por fila de la columna "Rol" de docs/api.md
  concurrencia.spec.ts             reglas de "uno solo" con pedidos simultáneos (clase 14)
  entorno.ts, preparar.ts          .env.e2e, control de base local, migrate reset + seed
  sesiones.ts, jwt.ts, auth-local.ts   sesiones de prueba sin Google (ADR 0009)
  base.ts                          contar filas en la base local (solo lectura)
scripts/                           contraste de colores, demos y carga de la clase 14
docs/
  spec.md, api.md, api.http, adr/, rendimiento.md
```

## 5. Antes de abrir un Pull Request

Checklist que el asistente debe verificar y el revisor va a controlar:

- [ ] `npm run typecheck`, `npm run lint`, `npm test` y `npm run test:e2e` en verde.
- [ ] Si cambió la spec o el contrato, cambió la prueba que lo cubre (§7).
- [ ] Cada endpoint nuevo tiene su fila en `docs/api.md` (tabla, matriz y errores) y sus requests en `docs/api.http`.
- [ ] Cero apariciones de `any`, `as any`, `@ts-ignore` en el diff.
- [ ] Toda entrada externa nueva tiene su schema de Zod.
- [ ] Ningún secreto ni dato de paciente en el código, en los tests ni en los logs.
- [ ] El PR describe qué historia de usuario (HU01–HU07) resuelve.
- [ ] Si se usó un asistente de IA, se aclara en la descripción del PR.

## 6. Reglas de colaboración

- Nunca hagas push directo a `main`: está protegida. Trabajá en una rama y abrí un PR.
- No aprobás tu propio PR. Siempre revisa otra persona del equipo.
- Un PR = un cambio con sentido propio. Si crece demasiado, partilo.
- Si una instrucción de este archivo choca con lo que te pidieron en el prompt, **gana este
  archivo**. Avisá el conflicto en lugar de resolverlo por tu cuenta.

## 7. Pruebas

Una prueba no sirve el día que se escribe: sirve en los cambios siguientes, cuando avisa que
se rompió algo que no se tocó. Las pruebas y el CI son **sensores**: miden el resultado. Este
archivo es una guía.

### Qué se prueba y dónde

| Capa | Pregunta | Archivo | Herramienta |
|---|---|---|---|
| Dominio | ¿La regla calcula bien? | `lib/*.test.ts` | Vitest, sin base, red ni navegador |
| Permisos | ¿El servidor rechaza cuando corresponde, aunque no se pase por la pantalla? | `e2e/permisos.spec.ts` | Playwright contra la API |
| Flujo | ¿Se recorre el sistema completo, de una persona a otra? | `e2e/flujo-principal.spec.ts` | Playwright con navegador |
| Concurrencia | ¿Una regla de "uno solo" aguanta pedidos simultáneos? | `e2e/concurrencia.spec.ts` | Playwright + conteo en la base |

| Si cambia… | Se actualiza… |
|---|---|
| Una regla de negocio (spec §6) | Su prueba en `lib/*.test.ts` (y en `concurrencia.spec.ts` si es de "uno solo") |
| Un permiso o un endpoint (`docs/api.md`) | Su caso en `e2e/permisos.spec.ts` |
| El recorrido (spec §5) | `e2e/flujo-principal.spec.ts` |

Las pruebas cambian cuando cambia la spec o el contrato, no cuando cambia el código: un
refactor no rompe pruebas.

**No se prueba:** clases de Tailwind, validaciones de Zod ni redirecciones de Next (ya las
prueban sus librerías), casos de uso con una base simulada, ni cada pantalla por separado (el
flujo ya las abre).

### Cómo se escriben

- El valor esperado sale de la spec o de `docs/api.md`, **nunca del código recién escrito**.
  "El código dice lo que hace; el contrato dice lo que debería hacer."
- Una prueba roja se arregla arreglando el código, no cambiando el valor esperado.
- Toda prueba nueva se ve fallar al menos una vez (sacando el arreglo) antes de confiar en
  ella. Se anota en el PR.
- Se busca como una persona: `getByRole`, `getByLabel`, `getByText`. Nada de ids ni clases.
- Sin `sleep` ni `waitForTimeout`: `expect(...).toBeVisible()` ya reintenta.
- El flujo es una sola prueba larga con un `test.step` por paso de la spec §5 y al menos un
  caso de error en el medio.
- Los pedidos simultáneos van con `Promise.all`; con un `for` y un `await` adentro salen de a
  uno y la carrera no aparece.

### Lo que está prohibido

- Correr las e2e contra producción. Van contra el Postgres local de `.env.e2e`;
  `playwright.config.ts` y `e2e/preparar.ts` cortan si la base no es local.
- Modo prueba, usuario mágico o `if (process.env.E2E)` en la app. La sesión de prueba es un
  token firmado con `E2E_JWT_SECRET` (solo en `.env.e2e`) que valida `e2e/auth-local.ts`,
  igual que Supabase Auth en producción (ADR 0009). La app no sabe que la están probando.
- Reemplazar la base por una simulada en las e2e.
- Escribir en la base desde una prueba: las pruebas escriben a través de la app y solo
  **leen** la base (`e2e/base.ts`) para contar lo que la app no muestra.

### Cómo se corren

```bash
npm test                              # unitarias
npm run test:e2e                      # e2e (Docker con Postgres encendido; ver README)
npm run test:e2e -- permisos          # un archivo
npx playwright test --ui              # en vivo
npx playwright show-trace <trace.zip> # pasos, red y consola de una falla
```

El CI corre las dos capas en cada PR (`verificar` y `e2e` en `.github/workflows/ci.yml`) y
`main` no acepta un merge si alguna está en rojo.
