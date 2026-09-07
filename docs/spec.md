# Especificación del sistema

> Este documento **es** el relevamiento de requerimientos del proyecto (eje metodológico, clase 2).
> Se completa en la clase 2 y se mantiene actualizado todo el cuatrimestre.
> Regla práctica: si una funcionalidad no está acá, no se implementa.

## 1. El problema

**Para quién:** Para los médicos de guardia y coordinadores de derivación de centros de salud.
**Qué hace hoy sin el sistema:** Buscan camas disponibles llamando por teléfono a distintos hospitales uno por uno o mandando mensajes por grupos de WhatsApp, perdiendo tiempo crítico.
**Qué mejora:** Centraliza la disponibilidad de camas en tiempo real y sugiere el mejor destino basado en cercanía y urgencia clínica.

## 2. Roles

| Rol | Quién es | Qué puede hacer que el otro no |
|---|---|---|
| **Médico Derivante** | Profesional en el hospital de origen con un paciente crítico. | Puede crear solicitudes de traslado y registrar evaluaciones de triaje. |
| **Médico Receptor** | Profesional en el hospital de destino (ej. jefe de UTI). | Puede aprobar o rechazar solicitudes entrantes y actualizar la capacidad de su Unidad de Cuidados. |

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De acá sale el modelo de datos.

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| **CentroSalud** | Establecimiento médico con su nivel de complejidad y ubicación geográfica. | UnidadCuidados, Usuario, SolicitudTraslado |
| **UnidadCuidados** | Áreas de internación específicas (UTI, UCO) y su inventario de camas. | CentroSalud |
| **RecursoEspecializado** | Equipamiento médico puntual (ej. respiradores) y su estado operativo. | CentroSalud |
| **SolicitudTraslado** | La derivación central que vincula al centro emisor con el receptor y gestiona su estado. | CentroSalud, Paciente, EvaluacionTriaje |
| **EvaluacionTriaje** | Registro de signos vitales, scores clínicos (ej. GCS) y el nivel de prioridad asignado. | SolicitudTraslado, Paciente |
| **TripulacionMedica** | La unidad de transporte física y el personal paramédico asignado al viaje. | SolicitudTraslado |
| **RegistroBitacora** | Trazabilidad, notas y eventos clínicos cronológicos durante el trayecto físico. | SolicitudTraslado, TripulacionMedica |

### Relaciones y Reglas de Borrado (Actualización Clase 3)

*   **Usuario**
    *   **Relación:** Pertenece a 1 `CentroSalud` (N a 1).
    *   **Regla de borrado:** `Restrict`. No se puede dar de baja un centro de salud si todavía tiene usuarios médicos vinculados a él.
*   **CentroSalud**
    *   **Relaciones:** Tiene N `UnidadesCuidados`, N `RecursosEspecializados` y N `SolicitudesTraslado` (1 a N).
    *   **Reglas de borrado:**
        *   Hacia Unidades y Recursos: `Cascade`. Si un centro se da de baja del sistema, su inventario físico (camas y equipos) se destruye con él.
        *   Hacia Solicitudes (Origen/Destino): `Restrict`. El historial de derivaciones de un centro es inmutable y no se puede borrar en cascada.
*   **SolicitudTraslado**
    *   **Relaciones:** Tiene 1 `EvaluacionTriaje` (1 a 1), N `TripulacionesMedicas` y N `RegistrosBitacora` (1 a N).
    *   **Reglas de borrado:**
        *   Hacia Evaluación Triaje: `Cascade`. Si la solicitud se cancela y elimina antes de procesarse, sus signos vitales sugeridos pierden sentido.
        *   Hacia Tripulación y Bitácora: `Restrict`. Nunca se puede borrar en cascada el historial de eventos, complicaciones clínicas ni los viajes realizados.
*   **RegistroBitacora**
    *   **Relaciones:** Pertenece a 1 `SolicitudTraslado` y 1 `TripulacionMedica` (N a 1).
    *   **Regla de borrado:** `Restrict`. Actúa como un log de auditoría intocable. No se borra nunca.

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <acción>, **para** <beneficio>.
Cada historia lleva su criterio de aceptación: cómo se verifica que está terminada.

### H1 — Iniciar solicitud de derivación
**Como** médico del centro emisor, **quiero** registrar los datos de filiación y signos vitales del paciente, **para** iniciar el proceso de derivación con la información clínica completa.

Criterios de aceptación:
- [x] Dado que el médico ingresa los datos requeridos en el formulario de triaje, cuando lo envía, entonces el sistema genera una `SolicitudTraslado` vinculada a su `CentroSalud` de origen.
- [x] Caso de error: cuando el médico intenta avanzar sin completar un campo obligatorio (ej. presión arterial), el sistema bloquea la acción, señala visualmente el campo faltante y mantiene la información ya cargada.

### H2 — Sugerencia de urgencia por IA
**Como** médico del centro derivante, **quiero** que el sistema sugiera un nivel de urgencia basado en los parámetros clínicos, **para** tomar una decisión de derivación más rápida y fundamentada.

Criterios de aceptación:
- [x] Dado que el médico completó la `EvaluacionTriaje`, cuando el sistema procesa los signos vitales, entonces se despliega en pantalla un nivel de urgencia sugerido (Bajo, Medio, Alto, Crítico) en menos de 10 segundos.
- [x] Caso de error: cuando el servicio de IA falla o demora más de 10 segundos, el sistema permite al médico seleccionar el nivel de urgencia manualmente advirtiendo sobre la falta de conexión.

### H3 — Confirmar derivación al hospital receptor
**Como** médico del centro derivante, **quiero** confirmar manualmente el hospital de destino desde el ranking de recomendaciones, **para** asegurar que la decisión final la tome un profesional basándose en la disponibilidad real.

Criterios de aceptación:
- [x] Dado que el médico visualiza el ranking de hospitales aptos, cuando selecciona un `CentroSalud` de destino y confirma, entonces la `SolicitudTraslado` cambia a estado "Aprobada" y se registra la fecha y hora de la decisión.
- [x] Caso de error: cuando la `UnidadCuidados` del destino se queda sin camas disponibles en el instante exacto de la confirmación, el sistema cancela la asignación, muestra una alerta de "Capacidad agotada" y recarga el ranking actualizado.

### H4 — Actualizar disponibilidad de camas
**Como** médico receptor de una unidad de cuidados, **quiero** actualizar la cantidad de camas disponibles en tiempo real, **para** que los centros derivantes sepan si pueden enviarme pacientes.

Criterios de aceptación:
- [x] Dado que un paciente es dado de alta o ingresa, cuando el médico receptor modifica el número de camas en el sistema, entonces la capacidad de la `UnidadCuidados` se actualiza inmediatamente en el ranking de derivaciones.
- [x] Caso de error: cuando el médico intenta ingresar un número negativo de camas, el sistema rechaza el guardado y muestra un mensaje indicando que el valor debe ser cero o mayor.

## 5. Flujo principal

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1. El Médico Derivante ingresa los datos del paciente y sus signos vitales (`EvaluacionTriaje`).
2. El sistema sugiere un nivel de urgencia y muestra un ranking de `CentroSalud` con capacidad en sus `UnidadCuidados`.
3. El Médico Derivante selecciona el centro destino y confirma la `SolicitudTraslado`.
4. El Médico Receptor recibe la alerta y aprueba la solicitud.
5. Se asigna una `TripulacionMedica` y comienza el traslado registrando eventos en el `RegistroBitacora`.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que revisar a mano.

- Una `SolicitudTraslado` no puede ser enviada a un `CentroSalud` cuya `UnidadCuidados` requerida reporte 0 camas disponibles.
- La sugerencia del nivel de urgencia en el triaje puede ser modificada manualmente por el médico, pero el sistema debe dejar un registro de auditoría de este cambio.
- Una `SolicitudTraslado` en estado "Aprobada" por el receptor ya no puede ser cancelada unilateralmente por el centro emisor.

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

**Cuál:** Servicio de IA (ej. OpenAI / Claude) o motor de reglas clínico.
**Para qué:** Sugerir el nivel de urgencia de la derivación basándose en los signos vitales ingresados.
**Qué pasa si se cae:** El sistema oculta la sugerencia y obliga al médico derivante a ingresar el nivel de urgencia manualmente.

## 9. Fuera de alcance

Lo que decidimos **no** hacer, para no volver a discutirlo en la clase 12.

- Historias Clínicas Electrónicas (HCE) completas del paciente.
- Facturación y cobros a obras sociales.
- Desarrollo de aplicación móvil nativa (se hará diseño web responsive, pero no app para stores).