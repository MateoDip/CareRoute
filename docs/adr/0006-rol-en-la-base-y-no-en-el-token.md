# ADR 0006 — El rol se lee de la base en cada request, no del token

**Estado:** aceptada
**Fecha:** 2026-09-29
**Decide:** Equipo (Mateo Duran, Nicolas Censi, Mateo Dip, Fernando Almansa)

---

## Contexto

Con Supabase Auth (ADR 0005) el navegador guarda un JWT en la cookie
`sb-<proyecto>-auth-token`. Hay que decidir de dónde sale el **rol** y el **centro** de
quien hace el request: del token (sin consultar la base) o de la tabla `Usuario`.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A. Rol dentro del token (custom claims) | Cero consultas extra por request | Un cambio de rol no rige hasta que el token vence o la persona vuelve a entrar: un receptor dado de baja sigue aprobando derivaciones hasta una hora |
| B. Token solo con la identidad; rol y centro desde `Usuario` en cada request | Un cambio de rol o de centro rige en el request siguiente; revocar es inmediato | Una consulta más por request (por índice único de `email`) |

## Decisión

Elegimos **B**.

Porque en un sistema clínico dejar a alguien con permisos que ya no tiene es peor que
una consulta por índice. El token prueba **quién** es la persona (`supabase.auth.getUser()`
lo valida contra Supabase desde el servidor, no alcanza con que el navegador lo diga); la
base dice **qué puede hacer**.

## Consecuencias

- `obtenerUsuario()` (lib/auth.ts) hace `getUser()` + un `upsert` por email en cada
  request. El `upsert` con `update: {}` no pisa el rol que asignó un admin.
- Cuando un admin cambia un rol con `PATCH /api/usuarios/:id`, la persona lo tiene en el
  próximo request, sin volver a iniciar sesión (probado en el escenario de punta a punta).
- Si la base no responde, no se puede autorizar a nadie: el handler responde 500.
- La sesión sigue siendo un JWT en cookie (stateless para Supabase): cerrar sesión en un
  dispositivo no invalida los tokens de otros hasta que vencen. Si eso importara, habría
  que pasar a sesiones revocables en base.
