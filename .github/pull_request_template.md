## Qué hace este PR

<Una o dos oraciones. Qué historia de usuario (HU01–HU07) o regla de la spec resuelve.>

## Checklist

- [ ] Funciona en el preview deployment, no solo en local
- [ ] La validación está en el servidor
- [ ] La autorización se verifica en el servidor (no alcanza con esconder el botón)
- [ ] Estados de carga y error resueltos en la UI
- [ ] `npm run build` y `npm run typecheck` pasan
- [ ] Si se tocó el modelo de datos, hay migración y (si la decisión fue discutida) un ADR
- [ ] Después del merge, la migración se aplica en producción (`npx prisma migrate deploy`)

## Pruebas (clase 13)

- [ ] `npm test` y `npm run test:e2e` en verde, y el CI (`verificar` y `e2e`) también
- [ ] El valor esperado de cada prueba nueva sale de la spec o de `docs/api.md`, no del código
- [ ] Vi fallar cada prueba nueva al menos una vez (sacando el arreglo). Cómo:
      <qué se sacó y qué dijo la prueba en rojo>
- [ ] Si cambió un permiso o un endpoint, hay un caso en `e2e/permisos.spec.ts`
- [ ] Si cambió el recorrido (spec §5), cambió `e2e/flujo-principal.spec.ts`
- [ ] Si se usó un asistente de IA, se aclara acá
- [ ] Lo revisa alguien que no escribió las pruebas
