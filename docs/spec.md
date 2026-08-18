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
| | | |

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <acción>, **para** <beneficio>.
Cada historia lleva su criterio de aceptación: cómo se verifica que está terminada.

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
