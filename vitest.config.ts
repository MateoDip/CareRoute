import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * Pruebas unitarias (`npm test`): reglas puras de lib/, sin base, red ni
 * navegador. Corren en menos de un segundo.
 *
 * Las de e2e/ son de Playwright (`npm run test:e2e`) y necesitan la app y la
 * base levantadas: vitest no las toca.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "e2e/**", ".next/**", ".next-e2e/**"],
  },
});
