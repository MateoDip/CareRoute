# ADR 0007 — Row Level Security activado sin políticas

**Estado:** aceptada
**Fecha:** 2026-09-29
**Decide:** Equipo (Mateo Duran, Nicolas Censi, Mateo Dip, Fernando Almansa)

---

## Contexto

Supabase publica el schema `public` a través de su API REST (PostgREST), y la
`NEXT_PUBLIC_SUPABASE_ANON_KEY` viaja al navegador porque la usa el login. La migración
inicial creó las tablas sin RLS: cualquiera que copiara la anon key de la página podía
leer `SolicitudTraslado` (con DNI de pacientes) directo desde la API de Supabase, sin
pasar por nuestros endpoints. El README y el AGENTS.md decían que había RLS; no era cierto.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A. RLS activado **sin políticas** | Cierra la API REST de Supabase por completo. La app no cambia: Prisma se conecta con el rol dueño de las tablas, que no está sujeto a RLS | La autorización fina sigue viviendo solo en la app (`lib/db/`) |
| B. RLS con políticas por centro | Doble barrera | Prisma no usa el JWT del usuario: las políticas no aplicarían a nuestras consultas, habría que duplicar reglas en SQL para nada |
| C. Sacar las tablas del schema `public` | Tampoco quedan expuestas | Migración más grande y fuera de lo que usa la cátedra |

## Decisión

Elegimos **A**.

Porque nadie usa la API REST de Supabase para datos: toda lectura y escritura pasa por
nuestros endpoints, que ya verifican sesión, rol y pertenencia (clase 6).

## Consecuencias

- La migración `20260929230000_timestamps_nn_tripulacion_rls` hace
  `ENABLE ROW LEVEL SECURITY` en todas las tablas, incluida `_prisma_migrations`.
- Con la anon key, `GET https://<proyecto>.supabase.co/rest/v1/SolicitudTraslado`
  devuelve `[]`. Es la prueba de que quedó cerrado.
- Si algún día el frontend lee directo de Supabase (sin pasar por la API), hay que
  escribir políticas: sin ellas no va a ver nada.
- Tabla nueva = `ENABLE ROW LEVEL SECURITY` en su misma migración (regla en AGENTS.md).
