import { describe, expect, it } from "vitest";
import { AUTO_INSTALL_RETRY_MS, shouldAutoDownload, shouldAutoInstall, updateWasApplied } from "./androidUpdatePolicy";

describe("shouldAutoDownload", () => {
  it("baixa sozinho no Wi-Fi e espera em dados móveis", () => {
    expect(shouldAutoDownload({ metered: false, downloaded: false, busy: false })).toBe(true);
    expect(shouldAutoDownload({ metered: true, downloaded: false, busy: false })).toBe(false);
  });

  it("não repete um download já feito ou em andamento", () => {
    expect(shouldAutoDownload({ metered: false, downloaded: true, busy: false })).toBe(false);
    expect(shouldAutoDownload({ metered: false, downloaded: false, busy: true })).toBe(false);
  });
});

describe("shouldAutoInstall", () => {
  const base = { version: "0.3.1", downloaded: true, canInstall: true, lastAttempt: null, now: 1_000_000 };

  it("instala quando o APK está pronto e o Android já autorizou o app", () => {
    expect(shouldAutoInstall(base)).toBe(true);
  });

  it("não tenta sem download ou sem a autorização de instalar apps", () => {
    expect(shouldAutoInstall({ ...base, downloaded: false })).toBe(false);
    expect(shouldAutoInstall({ ...base, canInstall: false })).toBe(false);
  });

  it("não insiste na mesma versão antes de 6 h, mas tenta uma versão nova logo", () => {
    const lastAttempt = { version: "0.3.1", at: base.now - 60_000 };
    expect(shouldAutoInstall({ ...base, lastAttempt })).toBe(false);
    expect(shouldAutoInstall({ ...base, lastAttempt: { ...lastAttempt, at: base.now - AUTO_INSTALL_RETRY_MS } })).toBe(true);
    expect(shouldAutoInstall({ ...base, version: "0.3.2", lastAttempt })).toBe(true);
  });
});

describe("updateWasApplied", () => {
  it("só confirma quando a versão em execução é a que foi instalada", () => {
    expect(updateWasApplied("0.3.1", "0.3.1")).toBe(true);
    expect(updateWasApplied("0.3.1", "0.3.0")).toBe(false);
    expect(updateWasApplied(null, "0.3.1")).toBe(false);
  });
});
