import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const security = config.app?.security;
const csp = security?.csp;
const devCsp = security?.devCsp;

assert.ok(csp && typeof csp === "object", "Tauri production CSP must be configured");
assert.ok(devCsp && typeof devCsp === "object", "Tauri development CSP must be configured");
for (const policy of [csp, devCsp]) {
  for (const directive of ["default-src", "connect-src", "script-src", "style-src", "img-src", "frame-src", "object-src"]) {
    assert.ok(Array.isArray(policy[directive]) && policy[directive].length > 0, `CSP directive missing: ${directive}`);
  }
  assert.ok(policy["object-src"].includes("'none'"), "object-src must remain disabled");
  assert.ok(policy["script-src"].includes("'self'"), "scripts must be local");
}

assert.match(config.build?.beforeDevCommand ?? "", /corepack pnpm/);
assert.match(config.build?.beforeBuildCommand ?? "", /ensure-android-microphone-permission/);
assert.equal(config.bundle?.android?.debugApplicationIdSuffix, ".debug");

console.log("native security configuration invariants passed");
