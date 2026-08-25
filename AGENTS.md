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

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (PostgreSQL) + Zod.

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
- Los schemas viven en `src/lib/schemas/` y se exportan con el sufijo `Schema`.
- En rutas usá `safeParse` y devolvé 400 con los errores; usá `parse` solo cuando querés que
  falle fuerte (por ejemplo, al cargar las variables de entorno al arrancar).

```ts
// src/lib/schemas/derivacion.ts
export const SignosVitalesSchema = z.object({
  presion_sistolica: z.number().int().min(40).max(300),
  presion_diastolica: z.number().int().min(20).max(200),
  saturacion: z.number().int().min(0).max(100),
  frecuencia_cardiaca: z.number().int().min(20).max(250),
});

export const NivelUrgenciaSchema = z.enum(["bajo", "medio", "alto", "critico"]);

export const CrearDerivacionSchema = z.object({
  paciente_nombre: z.string().min(1).max(120),
  sintomas: z.string().min(10).max(2000),
  signos_vitales: SignosVitalesSchema,
  equipamiento_requerido: z.array(z.string()).default([]),
  id_hospital_origen: z.string().uuid(),
});

export type CrearDerivacion = z.infer<typeof CrearDerivacionSchema>;
```

### 2.3 Datos sensibles

- No se loguean síntomas, signos vitales, nombre ni ningún dato identificable del paciente.
  Para depurar, logueá el `id` de la derivación y nada más.
- No se hardcodean claves, URLs de conexión ni tokens. Todo va por variables de entorno.
- `SUPABASE_SERVICE_ROLE_KEY` y cualquier clave de IA se usan **solo en código de servidor**.
  Nunca en un componente cliente ni en una variable con prefijo `NEXT_PUBLIC_`.
- No se suben datos reales de pacientes al repositorio. Los seeds usan datos ficticios.

### 2.4 Base de datos

- Los cambios de esquema van como migraciones versionadas en `supabase/migrations/`.
  No se modifica el esquema desde el panel de Supabase sin reflejarlo en una migración.
- Row Level Security activada en todas las tablas. Un usuario solo ve las derivaciones de su
  hospital (como origen o destino).
- No se borran filas de `derivacion`: el historial es parte de la trazabilidad.

## 3. Convenciones de código

- Nombres de dominio en español (`paciente`, `derivacion`, `nivel_urgencia`); palabras clave y
  APIs del framework en inglés, como corresponde.
- Componentes de React en `PascalCase`, hooks en `useCamelCase`, archivos en `kebab-case`.
- Server Components por defecto; `"use client"` solo cuando hace falta estado o eventos.
- Sin `console.log` en el código que se mergea.
- Antes de instalar una dependencia nueva, preguntá. No agregues librerías por conveniencia.
- No reformatees archivos que no tocaste ni hagas refactors masivos no pedidos.

## 4. Estructura esperada

```
src/
  app/                 rutas (App Router) y route handlers
  components/          componentes de UI reutilizables
  lib/
    schemas/           schemas de Zod (fuente de verdad de los tipos)
    supabase/          clientes de Supabase (server / browser)
    triaje/            llamada al modelo de lenguaje + scoring de hospitales
  types/               tipos compartidos que no derivan de un schema
supabase/migrations/   migraciones SQL
```

## 5. Antes de abrir un Pull Request

Checklist que el asistente debe verificar y el revisor va a controlar:

- [ ] `npm run lint` y `npm run build` pasan sin errores ni warnings nuevos.
- [ ] `npx tsc --noEmit` sin errores.
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
