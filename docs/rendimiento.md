# Rendimiento con muchos datos (clase 14)

Qué pasa con las consultas de las pantallas principales cuando `SolicitudTraslado` deja de
tener seis filas. Se mide antes de que lleguen las quejas, en la base local de pruebas.

```bash
npm run test:e2e        # deja la base local de pruebas migrada y con el seed
npm run db:carga        # + 200 centros y 50.000 solicitudes ficticias
npm run demo:indices    # EXPLAIN ANALYZE de cada consulta, sin y con sus índices
```

"Sin índice" es de verdad: `demo:indices` borra el índice dentro de una transacción, mide y
la deshace. Cada medición es la mejor de tres.

## Resultados (11/11/2026, Postgres 16 local, 50.005 solicitudes)

| Búsqueda | Sin índice | Con índice | Mejora |
|---|---|---|---|
| Listado de tu centro (`/`) | 3,74 ms · 50.005 filas · Seq Scan | 0,58 ms · 754 filas · Bitmap Index Scan | 6× |
| Entrantes (`/?rol=destino`) | 2,64 ms · 50.005 filas · Seq Scan | 0,24 ms · 250 filas · Bitmap Index Scan | 11× |
| ¿Ya tiene una derivación abierta? (regla 6) | 3,72 ms · 50.005 filas · Seq Scan | 0,01 ms · 1 fila · Index Scan | 248× |

- **Seq Scan:** leyó la tabla entera. Con 50.000 filas son 3 ms; crece con la tabla.
- **Index Scan / Bitmap Index Scan:** fue directo a las filas del centro.

## Qué decidimos

- **Los índices que ya hay alcanzan.** Las tres consultas quedan por debajo de 1 ms con
  `@@index([centroOrigenId])`, `@@index([centroDestinoId])` y el índice único de la regla 6.
  No agregamos ninguno.
- Un índice compuesto `(centroDestinoId, fechaSolicitud)` haría que las entrantes lean 50
  filas en vez de 250 (ya vendrían ordenadas), pero a 0,24 ms no justifica el costo: cada
  índice ocupa espacio y se actualiza en cada escritura. Se vuelve a medir si un centro pasa
  de unos miles de derivaciones.
- El listado usa `OR` (origen **o** destino): Postgres combina los dos índices (BitmapOr) y
  ordena las ~750 filas del centro. Si algún día fuera lento, la salida es partirlo en dos
  consultas, no un índice más.
- Las dos consultas del listado (solicitudes y nombre del centro) no dependen una de la
  otra: van juntas en `Promise.all` y la pantalla espera solo a la más lenta. En la ficha, la
  bitácora se pide después de comprobar que la solicitud es del centro: depende de la
  primera y va después a propósito.

## Medir una consulta propia

```bash
docker exec -it careroute-e2e psql -U postgres -d careroute_e2e
EXPLAIN ANALYZE SELECT * FROM "SolicitudTraslado" WHERE "centroDestinoId" = 'centro-origen-1';
```

Medir dos o tres veces: la primera suele ser más lenta. En producción, la señal es *Query
Performance* de Supabase y los logs de Vercel: el tiempo sube aunque el código no cambió.
