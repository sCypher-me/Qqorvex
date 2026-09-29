import { describe, expect, it } from "vitest";
import { selectBestLibraryMetadata, type MetadataSearchResult } from "./metadataProviders";

const result = (title: string): MetadataSearchResult => ({ title, coverUrl: `https://covers.example/${title}.jpg` });

describe("selectBestLibraryMetadata", () => {
  it("selects an exact match ignoring accents and punctuation", () => {
    expect(selectBestLibraryMetadata("O Senhor dos Anéis", [result("O Senhor dos Aneis"), result("Outro título")])?.title).toBe("O Senhor dos Aneis");
  });

  it("selects the only result when there is no exact title", () => {
    expect(selectBestLibraryMetadata("Duna 2021", [result("Dune")])?.title).toBe("Dune");
  });

  it("does not guess when multiple results are ambiguous", () => {
    expect(selectBestLibraryMetadata("Duna adaptação", [result("Duna"), result("Duna: Parte Dois")])).toBeNull();
  });
});
