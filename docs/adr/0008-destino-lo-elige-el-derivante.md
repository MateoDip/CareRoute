# ADR 0008 — El destino lo elige el derivante; el receptor aprueba

**Estado:** aceptada
**Fecha:** 2026-09-29
**Decide:** Equipo (Mateo Duran, Nicolas Censi, Mateo Dip, Fernando Almansa)

---

## Contexto

La spec (flujo principal y criterio de HU04) dice que el médico derivante elige el
destino desde el ranking y el receptor de ese hospital lo aprueba. El código de la clase 4
hacía otra cosa: el receptor aprobaba mandando su propio centro en el body, y para que
pudiera hacerlo `obtenerSolicitudParaRecepcion` le dejaba ver **todas** las solicitudes
sin destino de todos los hospitales. Además, el listado del receptor filtraba por su centro
como destino, así que nunca veía esas solicitudes: solo podía aprobarlas si alguien le
pasaba el id.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A. Cambiar la spec para que diga lo que hacía el código | Sin cambios de código | Cualquier receptor ve DNI y signos vitales de pacientes de otros hospitales; el ranking (HU03) no sirve para nada en el flujo |
| B. Agregar `POST /api/solicitudes/:id/destino` (derivante) y que `/aprobacion` sea solo del receptor del destino elegido | Coincide con la spec; cada receptor ve solo lo que le propusieron; `/aprobacion` ya no tiene body | Un endpoint más |

## Decisión

Elegimos **B**.

Porque es lo que dice la spec y cierra una fuga de datos de pacientes.

## Consecuencias

- `POST /destino`: solo el derivante del origen, con la solicitud `EVALUANDO`; verifica
  que el destino no sea el origen y que tenga cama del tipo requerido (409 "Capacidad
  agotada" si no). Mientras nadie apruebe, puede cambiar de destino.
- `POST /aprobacion`: sin body; la solicitud se busca con `centroDestinoId` = centro del
  receptor. Reserva la cama y pasa a `APROBADA` en una transacción, con `fechaAprobacion`.
- HU06 para el receptor: `GET /api/solicitudes?rol=destino&estado=EVALUANDO`.
- Se borró `obtenerSolicitudParaRecepcion`.
