# CLAUDE.md

Las reglas del repositorio están en [AGENTS.md](./AGENTS.md) y valen igual para Claude Code:

@AGENTS.md

Antes de dar una tarea por terminada:

- `npm run typecheck`, `npm run lint`, `npm test` y `npm run test:e2e` en verde.
- Las pruebas se escriben desde `docs/spec.md` y `docs/api.md`, no desde el código que
  acabás de escribir. Si una prueba falla, se arregla el código, no el valor esperado.
- Nunca un `if (process.env.E2E)`, un usuario mágico ni una prueba contra producción.
