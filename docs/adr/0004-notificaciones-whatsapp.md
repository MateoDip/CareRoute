# ADR 0004 — Notificaciones por WhatsApp (Evolution API)

**Estado:** aceptada
**Fecha:** 2026-09-22
**Decide:** Equipo (Mateo Duran, Nicolas Censi, Mateo Dip, Fernando Almansa)

---

## Contexto

Según HU06, cuando hay una novedad sobre una `SolicitudTraslado`, el `CentroSalud` involucrado
tiene que enterarse sin tener que estar mirando la pantalla. Se decide usar WhatsApp como canal
de notificación, simulando en la demo que cada centro de salud tiene su propio número.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| Evolution API | Gratis, no requiere aprobación de Meta, rápida de levantar para la demo | No es "oficial", no serviría para producción real |
| WhatsApp Cloud API (Meta) | Oficial, escalable a producción | Requiere aprobación de Meta, más lenta de configurar para una entrega de cursada |

## Decisión

Se usa **Evolution API** para el envío de mensajes. Se agrega el campo `telefonoNotificacion`
a `CentroSalud`, para poder simular en la demo que cada integrante del equipo representa el
celular de un centro de salud distinto.

## Triggers

1. **Al sugerir** (se crea `EvaluacionTriaje`): se le avisa al `CentroSalud` recomendado por
   la IA que hay un paciente candidato, con el nivel de urgencia sugerido.
2. **Al confirmar** (cambia `estado` de `SolicitudTraslado` a `APROBADA`): se le avisa al
   `CentroSalud` de destino ya confirmado que el traslado está en camino.

## Consecuencias

- Se agrega `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` a las variables de entorno (server-only).
- El envío vive en `lib/notificaciones/`, separado de `lib/triaje/` (son dos integraciones
  externas distintas, cada una con su propio ADR).
- Si Evolution API falla, el traslado sigue su curso igual — la notificación no es bloqueante,
  solo queda registrado en `RegistroBitacora` que no se pudo avisar.
- Requiere una migración de Prisma para agregar `telefonoNotificacion` a `CentroSalud`.