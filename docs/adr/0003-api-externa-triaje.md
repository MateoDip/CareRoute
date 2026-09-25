# ADR 0003 — API externa para sugerencia de triaje

**Estado:** aceptada
**Fecha:** 2026-09-22
**Decide:** Equipo (Mateo Duran, Nicolas Censi, Mateo Dip, Fernando Almansa)

---

## Contexto

`EvaluacionTriaje` necesita generar `nivelUrgenciaSugerido` a partir de los signos vitales
(`frecuenciaCardiaca`, `presionSistolica`, `presionDiastolica`). RNF01 exige respuesta en
menos de 10 segundos. La llamada se hace desde el servidor (route handler de Next.js), nunca
desde el cliente, y toda respuesta externa se valida con Zod (regla de `AGENTS.md`).

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| OpenAI API — `POST /v1/chat/completions` (modelo `gpt-4o-mini`) con Structured Outputs | JSON garantizado vía `json_schema` en modo strict; rápido y barato | Requiere cuenta/facturación propia del equipo |
| Anthropic API — `POST /v1/messages` | Buen razonamiento sobre texto clínico; `tool_use` para salida estructurada | Algo más caro; hay que forzar el formato con `tool_use` |
| Motor de reglas propio (sin IA) | Gratis, 100% determinístico, sin dependencia externa | No cumple la consigna de la materia de usar IA |

## Decisión

Elegimos **OpenAI API**, endpoint `POST https://api.openai.com/v1/chat/completions`,
modelo `gpt-4o-mini`, con `response_format: { type: "json_schema", strict: true }`.

Porque nos garantiza que la respuesta siempre cumple el schema que después validamos con Zod
(`NivelUrgenciaSchema`), y es la opción más económica para probar durante la cursada.

## Consecuencias

- Se agrega `OPENAI_API_KEY` a las variables de entorno (server-only, nunca `NEXT_PUBLIC_`).
- El llamado a la API vive en `lib/triaje/`, separado del resto de la lógica de negocio.
- Si OpenAI falla o tarda más de 10s, el endpoint responde con `nivelUrgenciaSugerido: null`
  y el frontend obliga al médico a elegir el nivel manualmente (ya contemplado en H2 del spec).
- Si más adelante se cambia de proveedor, solo se toca `lib/triaje/`, no los route handlers.