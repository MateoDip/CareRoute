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

Stack: Next.js 16 (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL en Supabase + Supabase Auth (Google) + Zod + Vitest. IA: OpenAI.

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

### 2.5 Autorización

- La identidad sale solo de `requerirUsuario` / `requerirUsuarioConCentro` (`lib/auth.ts`),
  primera línea del `try` de cada handler. Un endpoint sin esa llamada tiene que decir en
  un comentario "es público a propósito".
- Nunca `rol`, `usuarioId` ni `centroSaludId` del body, headers o query (la única excepción
  es `PATCH /api/usuarios/:id`, donde un ADMIN asigna rol y centro a otro usuario).
- El `catch` de cada handler es `return responderError("VERBO /ruta", error)`.
- Orden: sesión (401) → rol / centro (403) → pertenencia (404) → body (400) → regla (409)
  → servicio externo (502) → escribir.

### 2.6 Servicios externos

- Todo tercero se llama desde `lib/servicios/<nombre>.ts` y solo desde ahí.
- Siempre con `AbortSignal.timeout`. Ante una falla, devuelve `null` y loguea; no lanza.
- La credencial se lee con `process.env` en ese archivo, nunca con prefijo `NEXT_PUBLIC_`.

## 3. Convenciones de código

- Nombres de dominio en español y en camelCase (`solicitudTraslado`, `nivelUrgencia`); palabras
  clave y APIs del framework en inglés, como corresponde.
- Componentes de React en `PascalCase`, hooks en `useCamelCase`, archivos en `kebab-case`.
- Server Components por defecto; `"use client"` solo cuando hace falta estado o eventos.
- Sin `console.log` en el código que se mergea.
- Antes de instalar una dependencia nueva, preguntá. No agregues librerías por conveniencia.
- No reformatees archivos que no tocaste ni hagas refactors masivos no pedidos.

## 4. Estructura

```
app/
  api/<recurso>/route.ts           colección
  api/<recurso>/[id]/route.ts      individual
  api/<recurso>/[id]/<operación>/  operaciones del flujo (destino, aprobacion, rechazo…)
  auth/callback/route.ts           login con Google (público)
lib/
  auth.ts                          sesión, rol y centro
  errores.ts                       responderError
  http.ts                          respuestas 400 / 403 de regla / 404 / 409 / 502
  db/                              consultas Prisma
  schemas/                         schemas de Zod (fuente de verdad de los tipos)
  servicios/                       servicios externos
  supabase-server.ts, supabase-browser.ts   clientes de Supabase Auth
  reglas-*.ts, disponibilidad.ts, scoring-hospitales.ts   reglas puras (+ .test.ts)
prisma/
  schema.prisma, migrations/, seed.ts
docs/
  spec.md, api.md, api.http, adr/
```

## 5. Antes de abrir un Pull Request

Checklist que el asistente debe verificar y el revisor va a controlar:

- [ ] `npm run typecheck`, `npm run lint` y `npm test` en verde.
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
