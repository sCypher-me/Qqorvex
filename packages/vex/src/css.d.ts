/** Vex importa ferramentas de `@qqorvex/module-segundo-cerebro`, cujo `BlockRow.tsx` faz `import("katex/dist/katex.min.css")` dinâmico — este pacote é typecheckado por `tsc` puro (fora do Vite), que não conhece imports de CSS por padrão. */
declare module "*.css";

/** Importação de arquivo como texto (Vite/Vitest), usada nos testes. */
declare module "*?raw" {
  const content: string;
  export default content;
}
