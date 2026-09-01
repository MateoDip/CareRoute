# Especificación del sistema

> Este documento **es** el relevamiento de requerimientos del proyecto (eje metodológico, clase 2).
> Se completa en la clase 2 y se mantiene actualizado todo el cuatrimestre.
> Regla práctica: si una funcionalidad no está acá, no se implementa.

## 1. El problema

**Para quién:** <a quién le sirve este sistema>
**Qué hace hoy sin el sistema:** <cómo resuelve hoy ese problema — planilla, papel, WhatsApp>
**Qué mejora:** <en una oración>

## 2. Roles

| Rol | Quién es | Qué puede hacer que el otro no |
|---|---|---|
| <rol A> | | |
| <rol B> | | |

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

### H1 — <título>
**Como** …, **quiero** …, **para** …

Criterios de aceptación:
- [ ] Dado <contexto>, cuando <acción>, entonces <resultado esperado>
- [ ] Caso de error: cuando <situación inválida>, el sistema <qué hace>

### H2 — <título>
…

## 5. Flujo principal

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1.
2.
3.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que revisar a mano.

- <ej: un turno no puede superponerse con otro del mismo profesional>
- <ej: solo el creador o un administrador puede cancelar>

## 7. Requisitos no funcionales

No son funcionalidades: son condiciones que todo el sistema tiene que cumplir. Se escriben ahora
porque al final del cuatrimestre ya no se pueden arreglar. En la **clase 10** se auditan contra lo
que hayan construido.

### Usabilidad

Los cinco criterios del material de la clase 2, convertidos en algo **medible**. Reemplacen los
ejemplos por los de su dominio: lo que importa es que se pueda verificar, no que suene bien.

- **Eficiencia:** <la tarea principal> se hace en <N> interacciones o menos.
- **Errores:** si falta un campo obligatorio, se señala el campo y no se pierde lo ya cargado.
- **Aprendizaje:** alguien que nunca vio el sistema puede <la tarea principal> sin que le expliquen.
- **Recuerdo:** el flujo principal está a un clic desde la home y siempre en el mismo lugar.
- **Satisfacción:** se prueba con una persona de afuera del equipo antes del Demo Day.

### Accesibilidad

Esta lista es **igual para todos los proyectos**: no hay que adaptarla, hay que cumplirla.

- [ ] Todo se puede operar **con el teclado**, y se ve dónde está el foco.
- [ ] Los campos de formulario tienen `label` asociado, no solo *placeholder*.
- [ ] Las imágenes que informan tienen texto alternativo; las decorativas, alternativo vacío.
- [ ] El **contraste** entre texto y fondo llega a **4,5:1** (3:1 si la letra es grande).
- [ ] El error nunca se comunica **solo con color**: siempre hay texto.

## 8. Integración externa

**Cuál:** <storage / email / pagos / mapas / IA>
**Para qué:** <qué resuelve en el producto>
**Qué pasa si se cae:** <plan de contingencia>

## 9. Fuera de alcance

Lo que decidimos **no** hacer, para no volver a discutirlo en la clase 12.

-
