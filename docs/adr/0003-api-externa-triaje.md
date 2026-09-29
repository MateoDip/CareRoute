# ADR 0003 — API externa para sugerencia de triaje

**Estado:** aceptada (implementada en la clase 7)
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

- Se agrega `OPENAI_API_KEY` a las variables de entorno (server-only, nunca `NEXT_PUBLIC_`),
  en `.env.local` y en el panel de Vercel. `OPENAI_BASE_URL` es opcional y solo sirve para
  probar la falla (apuntarla a una IP que no responde).
- El llamado vive en `lib/servicios/openai.ts` (`sugerirNivelUrgencia`), separado del resto
  de la lógica de negocio. Es el único archivo que conoce la URL y la credencial.
- Timeout de 8 s con `AbortSignal.timeout`: deja margen para cumplir los 10 s de RNF01.
- El módulo nunca lanza: ante cualquier falla devuelve `null` y loguea el error del
  proveedor (con el id de la solicitud, nunca los signos vitales).
- Para `POST /api/solicitudes/:id/evaluacion` el servicio es **esencial**: si falla, el
  endpoint responde `502` sin guardar nada y pide el nivel manual (HU02). Si el médico ya
  manda el nivel, no se llama a OpenAI. Detalle en `docs/spec.md` §8.
- Si más adelante se cambia de proveedor, solo se toca `lib/servicios/openai.ts`, no los
  route handlers.
