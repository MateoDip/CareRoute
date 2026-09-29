# Especificación del sistema

> Este documento **es** el relevamiento de requerimientos del proyecto (eje metodológico, clase 2).
> Se completa en la clase 2 y se mantiene actualizado todo el cuatrimestre.
> Regla práctica: si una funcionalidad no está acá, no se implementa.

## 1. El problema

**Para quién:** Para los médicos de guardia y coordinadores de derivación de centros de salud.
**Qué hace hoy sin el sistema:** Buscan camas disponibles llamando por teléfono a distintos hospitales uno por uno o mandando mensajes por grupos de WhatsApp, perdiendo tiempo crítico.
**Qué mejora:** Centraliza la disponibilidad de camas en tiempo real y sugiere el mejor destino basado en cercanía y urgencia clínica.

## 2. Roles

La matriz completa de permisos por endpoint está en [`docs/api.md`](./api.md#matriz-de-permisos).

| Rol | Quién es | Qué puede hacer que el otro no |
|---|---|---|
| **Admin** | Encargado de configurar el sistema. | Da de alta, edita y da de baja `CentroSalud`, asigna rol y centro a cada `Usuario`, y puede corregir las camas de cualquier unidad. No participa del flujo clínico de derivaciones. |
| **Médico Derivante** | Profesional en el hospital de origen con un paciente crítico. | Crea la `SolicitudTraslado`, registra la `EvaluacionTriaje` y elige el centro de destino del ranking. |
| **Médico Receptor** | Profesional en el hospital de destino (ej. jefe de UTI). | Aprueba o rechaza las derivaciones que le propusieron y actualiza las camas de las `UnidadCuidados` de su `CentroSalud`. |

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De acá sale el modelo de datos
(`prisma/schema.prisma`). Siete entidades del dominio, sin contar `Usuario`.

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| **CentroSalud** | Establecimiento médico con su nivel de complejidad y ubicación. | Usuario, UnidadCuidados, RecursoEspecializado, SolicitudTraslado |
| **UnidadCuidados** | Área de internación (UTI, UCO, sala común, guardia) y sus camas libres. | CentroSalud |
| **RecursoEspecializado** | Equipamiento puntual (respirador, monitor…) y su estado operativo. | CentroSalud |
| **SolicitudTraslado** | La derivación: vincula al centro de origen con el de destino y lleva el estado. El paciente se identifica por DNI dentro de la solicitud (no hay entidad Paciente: los datos clínicos son del episodio, no de la persona). | CentroSalud (origen y destino), EvaluacionTriaje, AsignacionTripulacion, RegistroBitacora |
| **EvaluacionTriaje** | Signos vitales, nivel de urgencia y de dónde salió ese nivel (IA o manual). | SolicitudTraslado |
| **TripulacionMedica** | Ambulancia y paramédico responsable. Hace muchos traslados. | AsignacionTripulacion, RegistroBitacora |
| **AsignacionTripulacion** | Qué tripulación se asignó a qué traslado y cuándo. Es la tabla intermedia de la N-N. | SolicitudTraslado, TripulacionMedica |
| **RegistroBitacora** | Eventos cronológicos del trayecto (salida, llegada, complicaciones). | SolicitudTraslado, TripulacionMedica |

Además, **Usuario** (email, nombre, rol y centro) pertenece a un `CentroSalud`; el admin
puede no tener centro.

Todas las tablas tienen `creadaEn` y `actualizadaEn` (salvo `RegistroBitacora`, que es un
log inmutable y solo tiene `creadaEn`, y `SolicitudTraslado`, donde `fechaSolicitud`
cumple el papel de `creadaEn`).

### Cardinalidades y reglas de borrado

| Relación | Cardinalidad | `onDelete` | Por qué |
|---|---|---|---|
| CentroSalud → Usuario | 1 a N (el centro es opcional) | `Restrict` | No se da de baja un centro con médicos vinculados: primero se los reasigna. |
| CentroSalud → UnidadCuidados | 1 a N | `Cascade` | Si el centro se da de baja, su inventario de camas se va con él. |
| CentroSalud → RecursoEspecializado | 1 a N | `Cascade` | Ídem, el equipamiento. |
| CentroSalud → SolicitudTraslado (origen) | 1 a N | `Restrict` | El historial de derivaciones es inmutable. |
| CentroSalud → SolicitudTraslado (destino) | 1 a N (el destino es opcional hasta que se elige) | `Restrict` | Ídem. |
| SolicitudTraslado → EvaluacionTriaje | 1 a 1 (opcional) | `Cascade` | Sin la solicitud, sus signos vitales pierden sentido. |
| **SolicitudTraslado ↔ TripulacionMedica** | **N a N**, vía `AsignacionTripulacion` | `Restrict` en los dos lados | Una tripulación hace muchos traslados y un traslado largo puede necesitar más de una (relevo). La intermedia es entidad porque tiene dato propio: `asignadaEn`. Nunca se borra un viaje realizado. |
| SolicitudTraslado → RegistroBitacora | 1 a N | `Restrict` | Log de auditoría: no se borra nunca. |
| TripulacionMedica → RegistroBitacora | 1 a N (opcional) | `Restrict` | Ídem. |

Índices: toda FK por la que se filtra tiene `@@index` (`centroSaludId`, `centroOrigenId`,
`centroDestinoId`, `solicitudId`, `tripulacionMedicaId`). La clave compuesta de
`AsignacionTripulacion` ya indexa `solicitudId`.

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <acción>, **para** <beneficio>. Cada historia lleva
sus criterios de aceptación con el formato *Dado / Cuando / Entonces* y al menos un caso
de error. Los identificadores (HU01…HU07) son los que usan el código, `docs/api.md` y el
README.

### HU01 — Iniciar solicitud de derivación
**Como** médico derivante, **quiero** registrar al paciente y sus signos vitales, **para** iniciar la derivación con la información clínica completa.

- [x] **Dado** que el médico tiene centro asignado, **cuando** envía el DNI del paciente, **entonces** el sistema crea una `SolicitudTraslado` `PENDIENTE` vinculada a su `CentroSalud` de origen.
- [x] **Caso de error:** **dado** que falta un campo obligatorio (ej. presión arterial), **cuando** intenta avanzar, **entonces** el sistema bloquea la acción, señala el campo faltante y mantiene lo ya cargado.

### HU02 — Sugerencia de urgencia por IA
**Como** médico derivante, **quiero** que el sistema sugiera un nivel de urgencia a partir de los signos vitales, **para** decidir la derivación más rápido.

- [x] **Dado** que el médico cargó los signos vitales, **cuando** los envía sin elegir nivel, **entonces** el sistema muestra un nivel sugerido (Bajo, Medio, Alto, Crítico) en menos de 10 segundos y registra que lo sugirió la IA.
- [x] **Caso de error:** **dado** que el servicio de IA falla o demora más de 10 segundos, **cuando** el médico envía la evaluación, **entonces** el sistema le avisa que no hubo conexión y le permite elegir el nivel manualmente, sin perder los signos vitales.

### HU03 — Ver ranking de hospitales
**Como** médico derivante, **quiero** ver los hospitales que pueden recibir al paciente ordenados por conveniencia, **para** elegir el destino sin llamar uno por uno.

- [x] **Dado** que la solicitud tiene triaje, **cuando** el médico pide el ranking, **entonces** ve solo los centros (distintos del suyo) con al menos una cama libre del tipo que requiere la urgencia, ordenados por puntaje.
- [x] **Caso de error:** **dado** que la solicitud todavía no tiene triaje, **cuando** pide el ranking, **entonces** el sistema le indica que primero tiene que registrar la evaluación.

### HU04 — Confirmar la derivación
**Como** médico derivante, **quiero** elegir el destino desde el ranking y que el receptor de ese hospital lo confirme, **para** que la decisión final la tomen profesionales con la disponibilidad real.

- [x] **Dado** que el derivante eligió un centro del ranking, **cuando** el médico receptor de ese centro confirma, **entonces** la solicitud pasa a "Aprobada", se reserva la cama y se registra la fecha y hora de la decisión.
- [x] **Caso de error:** **dado** que la unidad requerida del destino se queda sin camas en el instante exacto de la elección o de la confirmación, **cuando** se intenta, **entonces** el sistema cancela la asignación, muestra "Capacidad agotada" con los tipos de cama que sí quedan y recarga el ranking.

### HU05 — Actualizar disponibilidad de camas
**Como** médico receptor, **quiero** actualizar las camas disponibles de mi unidad, **para** que los centros derivantes sepan si pueden enviarme pacientes.

- [x] **Dado** que un paciente ingresa o es dado de alta, **cuando** el receptor modifica el número de camas, **entonces** la capacidad de la `UnidadCuidados` se actualiza de inmediato en el ranking.
- [x] **Caso de error:** **dado** que el receptor ingresa un número negativo, **cuando** guarda, **entonces** el sistema rechaza el cambio e indica que el valor debe ser cero o mayor.

### HU06 — Recibir notificación de traslado
**Como** médico receptor, **quiero** ver las derivaciones que me propusieron y las que ya aprobé, **para** preparar cama y equipamiento a tiempo.

- [x] **Dado** que un derivante eligió mi centro, **cuando** abro mis derivaciones entrantes, **entonces** la veo como pendiente de respuesta; y una vez aprobada, como traslado a preparar.
- [x] **Caso de error:** **dado** que la derivación fue asignada a otro centro, **cuando** intento abrirla por su id, **entonces** el sistema responde que no existe (no revela derivaciones ajenas).

### HU07 — Seguir el estado del traslado
**Como** médico del centro de origen o de destino, **quiero** ver el estado de la derivación, la tripulación asignada y su bitácora, **para** saber en qué punto está el traslado.

- [x] **Dado** que mi centro es origen o destino, **cuando** abro la solicitud, **entonces** veo su estado, el triaje, la tripulación asignada y los eventos de bitácora en orden.
- [x] **Caso de error:** **dado** que la solicitud es de otro centro, **cuando** intento abrirla, **entonces** el sistema responde que no existe.

## 5. Flujo principal

El recorrido que da valor al sistema (no un ABM):

1. El **médico derivante** crea la `SolicitudTraslado` con el DNI del paciente (HU01).
2. Carga los signos vitales; la IA sugiere el nivel de urgencia o el médico lo elige a mano (HU02). La solicitud pasa a `EVALUANDO`.
3. El sistema muestra el ranking de centros con cama del tipo requerido (HU03).
4. El derivante **elige el destino** del ranking (HU04).
5. El **médico receptor** de ese centro la ve entre sus entrantes (HU06) y **la aprueba**: se reserva la cama, pasa a `APROBADA` y queda la fecha y hora (HU04).
6. Se asigna una `TripulacionMedica` y el traslado se sigue por su estado y la bitácora (HU07).

Antes de `EN_CURSO`, cualquiera de los dos médicos puede rechazar la derivación, con la restricción de la regla 3 de la sección 6.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que revisar a mano.

1. Una `SolicitudTraslado` no puede derivarse a un `CentroSalud` cuya `UnidadCuidados` requerida (según la urgencia: Crítico/Alto → UTI, Medio → UCO, Bajo → sala común) tenga 0 camas disponibles. Tampoco al mismo centro de origen.
2. La sugerencia del nivel de urgencia puede ser reemplazada por el médico, y el sistema debe dejar registro de ese cambio. Hoy se registra si el nivel lo puso la IA o el médico (`origenNivel`); la corrección posterior de un nivel ya sugerido queda pendiente (ADR 0002).
3. Una `SolicitudTraslado` "Aprobada" ya no puede cancelarla el centro emisor: solo el receptor, que es quien reservó la cama. Al rechazarla, la cama vuelve al centro.
4. Un usuario que se registra con Google entra como médico derivante **sin centro** y no puede operar hasta que un admin le asigne centro (y, si corresponde, rol). Nadie puede asignarse un rol a sí mismo, y un admin no puede quitarse su propio rol.
5. No se puede dar de baja un centro que tenga usuarios o derivaciones (el historial es inmutable).

## 7. Requisitos no funcionales

No son funcionalidades: son condiciones que todo el sistema tiene que cumplir. Se escriben ahora
porque al final del cuatrimestre ya no se pueden arreglar. En la **clase 10** se auditan contra lo
que hayan construido.

### Usabilidad

Los cinco criterios del material de la clase 2, convertidos en algo **medible**. Reemplacen los
ejemplos por los de su dominio: lo que importa es que se pueda verificar, no que suene bien.

- **Eficiencia:** Iniciar una solicitud de derivación tiene que poder hacerse en menos de 4 interacciones (clics).
- **Errores:** Si falta un campo obligatorio en el triaje, se señala visualmente el campo faltante y no se pierde lo ya cargado.
- **Aprendizaje:** Un médico que nunca usó el sistema puede completar el formulario de derivación sin que le expliquen.
- **Recuerdo:** El botón para ver las derivaciones entrantes está a un clic desde la home y siempre en la misma posición de la cabecera.
- **Satisfacción:** Se probará el flujo completo con un profesional de la salud ajeno al equipo antes del Demo Day.

### Accesibilidad

Esta lista es **igual para todos los proyectos**: no hay que adaptarla, hay que cumplirla.

- [ ] Todo se puede operar **con el teclado**, y se ve dónde está el foco.
- [ ] Los campos de formulario tienen `label` asociado, no solo *placeholder*.
- [ ] Las imágenes que informan tienen texto alternativo; las decorativas, alternativo vacío.
- [ ] El **contraste** entre texto y fondo llega a **4,5:1** (3:1 si la letra es grande).
- [ ] El error nunca se comunica **solo con color**: siempre hay texto.

## 8. Integración externa

### 8.1 OpenAI — sugerencia de urgencia (implementada, clase 7)

**Cuál:** OpenAI API, `POST /v1/chat/completions`, modelo `gpt-4o-mini` con Structured Outputs. Ver [ADR 0003](./adr/0003-api-externa-triaje.md).
**Para qué:** Sugerir el nivel de urgencia (BAJO, MEDIO, ALTO, CRÍTICO) a partir de los signos vitales de la `EvaluacionTriaje` (HU02). Solo viajan los tres signos vitales: nunca el DNI ni otro dato que identifique al paciente.
**Dónde vive:** `lib/servicios/openai.ts`, único archivo que conoce la URL y la credencial (`OPENAI_API_KEY`, solo servidor). Timeout de 8 s, para cumplir los 10 s de RNF01 con margen.

**Qué pasa si falla** (clave inválida, cuota agotada, OpenAI caído o más de 8 s sin responder):

| Operación afectada | Esencial o accesoria | Qué hace el sistema | Qué ve el usuario |
|---|---|---|---|
| `POST /api/solicitudes/:id/evaluacion` **sin** nivel manual | **Esencial**: sin nivel no hay evaluación que guardar | Llama a OpenAI **antes** de guardar. Si falla, responde `502` y no guarda nada: la solicitud sigue `PENDIENTE`, sin evaluación. Loguea el error del proveedor con el id de la solicitud | "No pudimos obtener la sugerencia de urgencia: el servicio de IA no respondió. Elegí el nivel manualmente y volvé a enviar la evaluación." + la lista de niveles para elegir |
| `POST /api/solicitudes/:id/evaluacion` **con** nivel manual | No usa el servicio | Guarda con el nivel que eligió el médico (caso de error de HU02) | La evaluación registrada, con `origenNivel: "MANUAL"` |
| Resto de la API (ranking, aprobación, rechazo, disponibilidad) | No usan el servicio | Funcionan igual | Nada distinto |

### 8.2 Evolution API (WhatsApp) — notificaciones (pendiente)

**Cuál:** Evolution API. Ver [ADR 0004](./adr/0004-notificaciones-whatsapp.md).
**Para qué:** Avisar al centro de destino cuando el derivante lo elige (HU06).
**Qué pasa si se cae:** Es **accesoria**: se llama **después** de asignar el destino, la asignación queda hecha igual y la respuesta es `200`. El receptor se entera por el listado (`GET /api/solicitudes?rol=destino&estado=EVALUANDO`).
**Estado:** no implementada. Necesita la migración que agrega `telefonoNotificacion` a `CentroSalud` (ADR 0004).

## 9. Fuera de alcance

Lo que decidimos **no** hacer, para no volver a discutirlo en la clase 12.

- Historias Clínicas Electrónicas (HCE) completas del paciente.
- Facturación y cobros a obras sociales.
- Desarrollo de aplicación móvil nativa (se hará diseño web responsive, pero no app para stores).