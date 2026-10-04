import { describe, expect, it } from "vitest";
import { buildLibraryShelves, nextProgressStep, remainingText } from "./service";
import type { LibraryItem } from "./types";

let seq = 0;
function item(partial: Partial<LibraryItem>): LibraryItem {
  seq += 1;
  return {
    id: `i${seq}`,
    title: `Item ${seq}`,
    item_type: "book",
    status: "quero_consumir",
    is_favorite: false,
    progress_mode: null,
    progress_current: null,
    progress_total: null,
    progress_unit: null,
    updated_at: `2026-09-${String(seq).padStart(2, "0")}T12:00:00Z`,
    ...partial,
  } as LibraryItem;
}

describe("buildLibraryShelves", () => {
  it("destaca o último em andamento e não o repete na fileira Continuar", () => {
    const antigo = item({ status: "em_andamento", updated_at: "2026-09-01T00:00:00Z" });
    const recente = item({ status: "em_andamento", updated_at: "2026-09-20T00:00:00Z" });
    const { featured, shelves } = buildLibraryShelves([antigo, recente]);
    expect(featured).toEqual({ item: recente, kind: "continuar" });
    expect(shelves.find((shelf) => shelf.key === "continuar")?.items).toEqual([antigo]);
  });

  it("sem nada em andamento, destaca o primeiro da fila como 'comece agora'", () => {
    const fila = item({ status: "quero_consumir" });
    const { featured, shelves } = buildLibraryShelves([fila]);
    expect(featured).toEqual({ item: fila, kind: "comecar" });
    expect(shelves.find((shelf) => shelf.key === "fila")).toBeUndefined();
  });

  it("monta as fileiras na ordem certa e esconde as vazias", () => {
    const items = [
      item({ status: "em_andamento" }),
      item({ status: "em_andamento" }),
      item({ status: "pausado" }),
      item({ status: "quero_consumir" }),
      item({ status: "concluido", rating: 5 }),
      item({ status: "abandonado" }),
    ];
    const keys = buildLibraryShelves(items).shelves.map((shelf) => shelf.key);
    expect(keys).toEqual(["continuar", "retomar", "fila", "concluidos", "tipo-leitura"]);
  });

  it("Concluídos mostra no máximo 10, os mais recentes primeiro", () => {
    const concluidos = Array.from({ length: 12 }, () => item({ status: "concluido" }));
    const shelf = buildLibraryShelves(concluidos).shelves.find((s) => s.key === "concluidos")!;
    expect(shelf.items).toHaveLength(10);
    expect(shelf.items[0]).toBe(concluidos[11]);
  });

  it("favoritos ganham fileira própria", () => {
    const favorito = item({ status: "concluido", is_favorite: true });
    expect(buildLibraryShelves([favorito]).shelves.find((s) => s.key === "favoritos")?.items).toEqual([favorito]);
  });

  it("fileira por tipo só com 2 itens ou mais do grupo, sem os abandonados", () => {
    const items = [
      item({ item_type: "movie", status: "concluido" }),
      item({ item_type: "series", status: "quero_consumir" }),
      item({ item_type: "game", status: "quero_consumir" }),
      item({ item_type: "anime", status: "abandonado" }),
    ];
    const shelves = buildLibraryShelves(items).shelves;
    expect(shelves.find((s) => s.key === "tipo-tela")?.items.map((i) => i.item_type).sort()).toEqual(["movie", "series"]);
    expect(shelves.find((s) => s.key === "tipo-jogos")).toBeUndefined();
  });

  it("Continuar usa o cartão largo; as demais, o pôster", () => {
    const items = [item({ status: "em_andamento" }), item({ status: "em_andamento" }), item({ status: "quero_consumir" })];
    const variants = Object.fromEntries(buildLibraryShelves(items).shelves.map((s) => [s.key, s.variant]));
    expect(variants).toMatchObject({ continuar: "continue", fila: "poster" });
  });
});

describe("remainingText", () => {
  it("livro: quanto falta, no singular e no plural", () => {
    expect(remainingText(item({ progress_mode: "numerico", progress_current: 252, progress_total: 680, progress_unit: "páginas" }))).toBe("Faltam 428 páginas");
    expect(remainingText(item({ progress_mode: "numerico", progress_current: 679, progress_total: 680, progress_unit: "páginas" }))).toBe("Falta 1 página");
  });

  it("série, mangá e curso: qual é o próximo", () => {
    expect(remainingText(item({ progress_mode: "numerico", progress_current: 6, progress_total: 10, progress_unit: "episódios" }))).toBe("Próximo: episódio 7");
    expect(remainingText(item({ progress_mode: "numerico", progress_current: 0, progress_total: 120, progress_unit: "capítulos" }))).toBe("Próximo: capítulo 1");
    expect(remainingText(item({ progress_mode: "numerico", progress_current: 7, progress_total: 32, progress_unit: "aulas" }))).toBe("Próximo: aula 8");
  });

  it("percentual, terminado e sem progresso", () => {
    expect(remainingText(item({ progress_mode: "percentual", progress_current: 62 }))).toBe("62% concluído");
    expect(remainingText(item({ progress_mode: "numerico", progress_current: 10, progress_total: 10, progress_unit: "episódios" }))).toBe("Terminado");
    expect(remainingText(item({}))).toBeNull();
  });

  it("sem total conhecido, mostra só onde parou", () => {
    expect(remainingText(item({ progress_mode: "numerico", progress_current: 40, progress_unit: "páginas" }))).toBe("Parou em 40 páginas");
  });
});

describe("nextProgressStep", () => {
  it("+1 página, sem passar do total, e avisa quando termina", () => {
    const livro = item({ progress_mode: "numerico", progress_current: 679, progress_total: 680, progress_unit: "páginas" });
    expect(nextProgressStep(livro)).toEqual({
      label: "+1 pág.",
      finished: true,
      progress: { mode: "numerico", current: 680, total: 680, unit: "páginas" },
    });
  });

  it("minutos andam de 10 em 10; percentual de 5 em 5", () => {
    expect(nextProgressStep(item({ progress_mode: "numerico", progress_current: 30, progress_total: 95, progress_unit: "minutos" }))).toMatchObject({ label: "+10 min", finished: false, progress: { current: 40 } });
    expect(nextProgressStep(item({ progress_mode: "percentual", progress_current: 97 }))).toEqual({ label: "+5%", finished: true, progress: { mode: "percentual", current: 100 } });
  });

  it("rótulo curto por unidade", () => {
    const label = (unit: string) => nextProgressStep(item({ progress_mode: "numerico", progress_current: 1, progress_total: 50, progress_unit: unit }))?.label;
    expect([label("episódios"), label("capítulos"), label("aulas"), label("unidades")]).toEqual(["+1 ep.", "+1 cap.", "+1 aula", "+1"]);
  });

  it("sem progresso registrado ou já no fim, não há passo rápido", () => {
    expect(nextProgressStep(item({}))).toBeNull();
    expect(nextProgressStep(item({ progress_mode: "numerico", progress_current: 10, progress_total: 10 }))).toBeNull();
    expect(nextProgressStep(item({ progress_mode: "percentual", progress_current: 100 }))).toBeNull();
  });
});
