import { describe, expect, it } from "vitest";
import { INITIAL_SECRET_TAPS, registerSecretTap, type SecretTapState } from "./secretTaps";

function tapAt(times: number[]): { unlockedAt: number[]; state: SecretTapState } {
  let state = INITIAL_SECRET_TAPS;
  const unlockedAt: number[] = [];
  times.forEach((time, index) => {
    const result = registerSecretTap(state, time);
    state = result.state;
    if (result.unlocked) unlockedAt.push(index + 1);
  });
  return { unlockedAt, state };
}

describe("registerSecretTap", () => {
  it("destrava no 7º toque rápido seguido", () => {
    expect(tapAt([1000, 1300, 1600, 1900, 2200, 2500, 2800]).unlockedAt).toEqual([7]);
  });

  it("6 toques não bastam", () => {
    expect(tapAt([1000, 1300, 1600, 1900, 2200, 2500]).unlockedAt).toEqual([]);
  });

  it("uma pausa longa recomeça a contagem", () => {
    // 4 rápidos, pausa de 2s, 6 rápidos: ainda não; o 7º depois da pausa destrava.
    const fast = (start: number, n: number) => Array.from({ length: n }, (_, i) => start + i * 300);
    expect(tapAt([...fast(0, 4), ...fast(3000, 6)]).unlockedAt).toEqual([]);
    expect(tapAt([...fast(0, 4), ...fast(3000, 7)]).unlockedAt).toEqual([11]);
  });

  it("depois de destravar, zera (outros 7 toques destravam de novo)", () => {
    const times = Array.from({ length: 14 }, (_, i) => i * 200);
    expect(tapAt(times).unlockedAt).toEqual([7, 14]);
  });
});
