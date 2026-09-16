import { defineConfig } from "vitest/config";

/**
 * Config única na raiz do monorepo (não uma por pacote) — os testes são de funções puras de
 * `service.ts`, sem necessidade do isolamento de `tsconfig`/build por pacote que `typecheck` tem.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["modules/**/*.test.ts", "packages/**/*.test.ts"],
  },
});
