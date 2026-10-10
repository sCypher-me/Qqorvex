import { describe, expect, it } from "vitest";
import { claimReload, isChunkLoadError, parseVersionManifest } from "./webUpdate";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("isChunkLoadError", () => {
  it("reconhece as mensagens de pedaço ausente dos navegadores", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://app/assets/Tarefas-abc.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Unable to preload CSS for /assets/index-x.css"))).toBe(true);
    expect(isChunkLoadError("Expected a JavaScript module script but the server responded with a MIME type of \"text/html\". 'text/html' is not a valid JavaScript MIME type.")).toBe(true);
  });

  it("não confunde erros comuns da interface com troca de versão", () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(isChunkLoadError(new Error("Failed to fetch"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe("claimReload", () => {
  it("permite uma recarga e bloqueia repetições em seguida para não entrar em laço", () => {
    const storage = memoryStorage();
    expect(claimReload(storage, 1_000)).toBe(true);
    expect(claimReload(storage, 10_000)).toBe(false);
    expect(claimReload(storage, 40_000)).toBe(true);
  });

  it("segue permitindo quando o armazenamento não existe ou falha", () => {
    expect(claimReload(null)).toBe(true);
    expect(claimReload({ getItem: () => { throw new Error("bloqueado"); }, setItem: () => undefined })).toBe(true);
  });
});

describe("parseVersionManifest", () => {
  it("aceita somente manifestos com versão e build", () => {
    expect(parseVersionManifest({ version: "0.3.0", buildId: "abc123" })).toEqual({ version: "0.3.0", buildId: "abc123" });
    expect(parseVersionManifest({ version: "0.3.0" })).toBeNull();
    expect(parseVersionManifest({ version: "0.3.0", buildId: "" })).toBeNull();
    expect(parseVersionManifest("<!doctype html>")).toBeNull();
  });
});
