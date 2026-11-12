import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Artefactos de build: los genera Next, no son código fuente y no se lintean.
  {
    ignores: [
      ".next/**",
      ".next-e2e/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prohibido `any`: si no sabés el tipo, usá `unknown` y validá con Zod.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
