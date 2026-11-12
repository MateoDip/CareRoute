# ADR 0009 — Sesiones de prueba sin Google: un Supabase Auth local que valida la firma

**Estado:** propuesta (a revisar en el PR de la clase 13)
**Fecha:** 2026-11-11
**Decide:** equipo CareRoute

---

## Contexto

Las pruebas e2e de la clase 13 (`e2e/flujo-principal.spec.ts`, `e2e/permisos.spec.ts`)
necesitan entrar como el derivante, la receptora, el admin y un médico sin centro. Tienen
que correr en el CI y contra un Postgres local, nunca contra producción, y la clase prohíbe
dos atajos: un usuario mágico y un `if (process.env.E2E)` en la app.

El proyecto de referencia usa Auth.js: la cookie la firma la app con `AUTH_SECRET`, así que
la prueba la fabrica con la misma función y un secreto de pruebas. Nosotros usamos Supabase
Auth (ADR 0005): la app **no** valida el token. `getUser()` (`lib/auth.ts`) le pregunta al
servidor de Supabase Auth de quién es, y la firma la conoce solo ese servidor. Sin Google y
sin un proyecto de Supabase en el CI, nadie puede contestar esa pregunta.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A. Login real con Google en la prueba | Es exactamente lo que hace una persona | Cuentas reales y contraseñas en el CI; Google bloquea logins automatizados; prohibido por la clase |
| B. `if (process.env.E2E)` en `lib/auth.ts` que devuelva un usuario fijo | Tres líneas | Es el "modo prueba" prohibido: si la variable se cuela en producción, cualquiera entra |
| C. Supabase completo en Docker (`supabase start`) | El servidor de Auth es el real | Diez contenedores, minutos de arranque en cada CI, y hay que crear usuarios con contraseña (login que la app no tiene) |
| D. Un servidor de Auth local (`e2e/auth-local.ts`) que hace lo mismo que Supabase con `GET /auth/v1/user`: verifica la firma HS256 y el vencimiento del token y devuelve el usuario. La prueba firma los tokens con `E2E_JWT_SECRET`, que solo existe en `.env.e2e` | La app no cambia ni sabe que la prueban; arranca en milisegundos; un token mal firmado o vencido da 401 (hay una prueba de eso) | No es el código de Supabase: si Supabase cambia el formato de la cookie, la prueba se entera tarde |

## Decisión

Elegimos **D**.

Porque prueba la app tal cual corre en producción —misma cookie, misma llamada a
`getUser()`, mismo `requerirUsuario`— sin agregarle ningún camino que solo exista en las
pruebas. El único cambio está fuera de la app: `NEXT_PUBLIC_SUPABASE_URL` de `.env.e2e`
apunta al servidor local.

## Consecuencias

- `e2e/sesiones.ts` arma la cookie `sb-<proyecto>-auth-token` con el formato de
  `@supabase/ssr` (`base64-` + JSON). El rol y el centro siguen saliendo de la tabla
  `Usuario` que llena el seed, igual que en producción (ADR 0006).
- `e2e/permisos.spec.ts` incluye un token firmado con otro secreto: tiene que dar 401. Es
  la prueba de que no hay usuario mágico.
- `E2E_JWT_SECRET` no es un secreto real (está commiteado en `.env.e2e`): solo lo conoce el
  servidor de pruebas. Producción nunca lo usa.
- Si se actualiza `@supabase/ssr` y cambia el formato de la cookie, las e2e fallan todas con
  `/ingresar`: es la señal para revisar `e2e/sesiones.ts`.
- `OPENAI_BASE_URL` de `.env.e2e` apunta a una ruta que no existe de este mismo servidor:
  el triaje siempre recorre el caso de error de HU02 y las pruebas nunca gastan cuota.
