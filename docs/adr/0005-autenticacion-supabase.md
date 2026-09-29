# ADR 0005 — Autenticación con Supabase Auth (Google)

**Estado:** propuesta
**Fecha:** 2026-09-28
**Decide:** Equipo (Mateo Duran, Nicolas Censi, Mateo Dip, Fernando Almansa)

---

## Contexto

Hasta ahora la identidad del usuario llega en un header de prueba (`x-usuario-email`),
marcado como `TODO (clase 6)` en `lib/sesion.ts`. Cualquiera puede mandarlo, así que
hoy ningún endpoint sabe de verdad quién lo llama. Hay que reemplazarlo por un login
real, sin guardar contraseñas propias, y decidir de dónde sale el rol de cada usuario.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| Supabase Auth con Google (OAuth) | Ya usamos Supabase para la base; no guardamos contraseñas; cero pantallas de registro o recuperación | Depende de Supabase y de Google: si alguno se cae, nadie entra |
| Auth.js con Google | Es el ejemplo de la clase; sin dependencia de la plataforma | Sumaría una segunda herramienta de identidad al lado de Supabase, que ya está en el stack |
| Login propio (usuario y contraseña) | Sin terceros | Hay que hashear, recuperar contraseñas y verificar mails: mucho trabajo y mucho riesgo para lo que se evalúa |

## Decisión

1. **Proveedor de identidad:** Supabase Auth con Google. Supabase prueba quién es el
   usuario (autenticación); qué puede hacer adentro del sistema lo decide nuestra base
   (autorización).
2. **Verificación del token en el servidor:** cada request valida la sesión contra
   Supabase con `supabase.auth.getUser()` desde el servidor. No se confía en el estado
   del navegador ni en un usuario "logueado" solo en la pantalla.
3. **El rol y el centro se leen de la tabla `Usuario`, no del token.** El token de
   Supabase solo trae la identidad (el mail); `getSesion` busca a esa persona en
   `Usuario` por mail en cada request. Cambiar un rol o un centro tiene efecto
   inmediato, sin obligar a volver a entrar. A cambio, cada request hace una consulta.
4. **Rol al registrarse:** el primer login crea el `Usuario` con rol `MEDICO_DERIVANTE`
   y sin centro asignado. El rol `MEDICO_RECEPTOR`, el rol `ADMIN` y la asignación de
   centro los define alguien con más privilegio (un admin, o el seed para el primer
   admin). No existe ninguna forma de auto-asignarse un rol desde la API.

## Consecuencias

- Se instalan `@supabase/supabase-js` y `@supabase/ssr`. Se reutilizan las variables
  `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; el ID de cliente y el
  secreto de Google se cargan en el panel de Supabase, no en el repo.
- Un usuario logueado pero sin centro asignado no puede operar. Hoy `getSesion`
  devuelve `null` en ese caso, que se traduce en 401; hay que distinguirlo, porque la
  persona sí está autenticada (corresponde un 403 con un mensaje claro).
- `lib/sesion.ts` deja de leer el header de prueba, y los `TODO (clase 6)` de los
  handlers y de `docs/api.http` se reemplazan por la sesión real.
- Si Supabase o Google no responden, nadie puede iniciar sesión. Los usuarios que ya
  tienen una sesión vigente siguen operando hasta que venza.
- Cambiar de proveedor de identidad más adelante toca `lib/auth.ts` y `lib/sesion.ts`,
  no los handlers ni las consultas de `lib/db/`.