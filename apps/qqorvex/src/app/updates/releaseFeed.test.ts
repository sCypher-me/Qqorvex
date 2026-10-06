import { describe, expect, it } from "vitest";
import { compareVersions, findAvailableUpdate, type GithubRelease } from "./releaseFeed";

const release = (tag_name: string, digest = `sha256:${"a".repeat(64)}`): GithubRelease => ({
  tag_name,
  name: "Beta",
  body: "Correções e melhorias.",
  draft: false,
  assets: [{ name: "qqorvex-android-arm64.apk", browser_download_url: "https://github.com/sCypher-me/Qqorvex/releases/download/test/qqorvex-android-arm64.apk", digest }],
});

describe("feed de atualizações Android", () => {
  it("compara versões sem confundir 0.10 com 0.2", () => {
    expect(compareVersions("0.10.0", "0.2.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0-beta.2", "1.0.0")).toBeLessThan(0);
  });

  it("seleciona o APK do canal e arquitetura do aparelho quando há hash do GitHub", () => {
    const update = findAvailableUpdate([
      release("android-stable-20261006-v9.0.0"),
      release("android-beta-20261006-v0.3.0"),
    ], "0.2.1", "arm64-v8a", "beta");

    expect(update).toMatchObject({ version: "0.3.0", sha256: "a".repeat(64) });
  });

  it("reconhece o nome do APK ARM32 usado pelo processo de release atual", () => {
    const arm32Release: GithubRelease = {
      ...release("android-beta-v0.3.0"),
      assets: [{
        name: "qqorvex-android-arm32.apk",
        browser_download_url: "https://github.com/sCypher-me/Qqorvex/releases/download/test/qqorvex-android-arm32.apk",
        digest: `sha256:${"b".repeat(64)}`,
      }],
    };
    expect(findAvailableUpdate([arm32Release], "0.2.1", "armeabi-v7a", "beta")?.version).toBe("0.3.0");
  });

  it("ignora releases sem hash verificável, canal diferente ou versão antiga", () => {
    expect(findAvailableUpdate([release("android-beta-v0.3.0", "")], "0.2.1", "arm64-v8a", "beta")).toBeNull();
    expect(findAvailableUpdate([release("android-beta-v0.2.1")], "0.2.1", "arm64-v8a", "beta")).toBeNull();
    expect(findAvailableUpdate([release("android-stable-v1.0.0")], "0.2.1", "arm64-v8a", "beta")).toBeNull();
  });
});
