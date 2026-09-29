import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Lê `packages/database/src/types.ts` (gerado pelo Supabase) e devolve, para cada tabela, as
 * colunas da linha (`Row`) com um valor padrão coerente com o tipo. Serve para o mock completar
 * qualquer linha de fixture com os campos que a UI espera, sem precisar escrever todos à mão.
 */
const typesPath = fileURLToPath(new URL("../../packages/database/src/types.ts", import.meta.url));

function parseEnums(source) {
  const enums = {};
  const start = source.indexOf("    Enums: {");
  const end = source.indexOf("    CompositeTypes: {", start);
  const block = source.slice(start, end);
  const re = /^ {6}([a-z_]+):\s*([\s\S]*?)(?=^ {6}[a-z_]+:|^ {4}\})/gm;
  for (const match of block.matchAll(re)) {
    enums[match[1]] = [...match[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  }
  return enums;
}

function defaultFor(type, enums) {
  const t = type.trim();
  if (t.includes("| null")) return null;
  if (t.endsWith("[]")) return [];
  if (t === "string") return "";
  if (t === "number") return 0;
  if (t === "boolean") return false;
  if (t === "Json") return {};
  const enumMatch = /Enums"\]\["([a-z_]+)"\]/.exec(t);
  if (enumMatch) return enums[enumMatch[1]]?.[0] ?? "";
  return null;
}

export function loadSchema() {
  const source = readFileSync(typesPath, "utf8");
  const enums = parseEnums(source);
  const tablesStart = source.indexOf("    Tables: {");
  const tablesEnd = source.indexOf("    Views: {", tablesStart);
  const tablesBlock = source.slice(tablesStart, tablesEnd);
  const tables = {};
  const tableRe = /^ {6}([a-z_]+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/gm;
  for (const match of tablesBlock.matchAll(tableRe)) {
    const columns = {};
    for (const line of match[2].split("\n")) {
      const col = /^\s+([a-z_0-9]+)\??: (.+)$/.exec(line);
      if (col) columns[col[1]] = defaultFor(col[2], enums);
    }
    tables[match[1]] = columns;
  }
  return { tables, enums };
}
